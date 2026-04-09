"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { get } from "@/lib/ghost";

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  createdAt: number;
}

interface Snapshot {
  lendIntentIds: Set<string>;
  borrowIntentIds: Set<string>;
  activeLoanIds: Set<string>;
  completedLoanIds: Set<string>;
  pendingPayoutIds: Set<string>;
  completedPayoutIds: Set<string>;
  proposalIds: Set<string>;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const POLL_INTERVAL = 10_000;
const STORAGE_KEY = "ghost_notifications";
const NOTIF_EVENT = "ghost:notification";

export interface NotifPayload {
  title: string;
  message: string;
}

export function pushNotification(payload: NotifPayload) {
  window.dispatchEvent(new CustomEvent(NOTIF_EVENT, { detail: payload }));
}

function loadStored(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(notifs: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
  } catch {}
}

export function useNotifications(address: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadStored());
  const prevSnap = useRef<Snapshot | null>(null);
  const initialized = useRef(false);

  const addNotifs = useCallback((newItems: Omit<Notification, "id" | "read" | "createdAt">[]) => {
    if (newItems.length === 0) return;
    const now = Date.now();
    setNotifications((prev) => {
      const added = newItems.map((n) => ({
        ...n,
        id: makeId(),
        read: false,
        createdAt: now,
        time: "just now",
      }));
      const next = [...added, ...prev].slice(0, 50);
      persist(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    persist([]);
  }, []);

  // Listen for client-side notification events (swaps, bridges, etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, message } = (e as CustomEvent<NotifPayload>).detail;
      addNotifs([{ title, message, time: "just now" }]);
    };
    window.addEventListener(NOTIF_EVENT, handler);
    return () => window.removeEventListener(NOTIF_EVENT, handler);
  }, [addNotifs]);

  // Update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, time: timeAgo(n.createdAt) }))
      );
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Poll server
  useEffect(() => {
    if (!address) return;

    const poll = async () => {
      try {
        const [lender, borrower] = await Promise.all([
          get(`/api/v1/lender-status/${address}`).catch(() => ({})),
          get(`/api/v1/borrower-status/${address}`).catch(() => ({})),
        ]);

        const snap: Snapshot = {
          lendIntentIds: new Set((lender.activeLends ?? []).map((l: any) => l.intentId)),
          borrowIntentIds: new Set((borrower.pendingIntents ?? []).map((i: any) => i.intentId)),
          activeLoanIds: new Set([
            ...(lender.activeLoans ?? []).map((l: any) => l.loanId),
            ...(borrower.activeLoans ?? []).map((l: any) => l.loanId),
          ]),
          completedLoanIds: new Set([
            ...(lender.completedLoans ?? []).map((l: any) => l.loanId),
            ...(borrower.completedLoans ?? []).map((l: any) => l.loanId),
          ]),
          pendingPayoutIds: new Set((lender.pendingPayouts ?? []).map((p: any) => p.id)),
          completedPayoutIds: new Set((lender.completedPayouts ?? []).map((p: any) => p.id)),
          proposalIds: new Set((borrower.pendingProposals ?? []).map((p: any) => p.proposalId)),
        };

        if (!initialized.current) {
          prevSnap.current = snap;
          initialized.current = true;
          return;
        }

        const prev = prevSnap.current!;
        const events: Omit<Notification, "id" | "read" | "createdAt">[] = [];

        // New loans (appeared in active that weren't there before)
        for (const id of snap.activeLoanIds) {
          if (!prev.activeLoanIds.has(id)) {
            const loan = [...(borrower.activeLoans ?? []), ...(lender.activeLoans ?? [])]
              .find((l: any) => l.loanId === id);
            const amt = loan?.principal ? (Number(BigInt(loan.principal)) / 1e18).toFixed(2) : "?";
            events.push({
              title: "Loan Matched",
              message: `New loan for ${amt} tokens has been settled`,
              time: "just now",
            });
          }
        }

        // Loans completed (moved from active to completed)
        for (const id of snap.completedLoanIds) {
          if (!prev.completedLoanIds.has(id) && prev.activeLoanIds.has(id)) {
            const loan = [...(borrower.completedLoans ?? []), ...(lender.completedLoans ?? [])]
              .find((l: any) => l.loanId === id);
            const status = loan?.status ?? "completed";
            events.push({
              title: status === "repaid" ? "Loan Repaid" : status === "liquidated" ? "Loan Liquidated" : "Loan Completed",
              message: `Loan ${id.slice(0, 8)}... has been ${status}`,
              time: "just now",
            });
          }
        }

        // Lend intents removed (matched or cancelled)
        for (const id of prev.lendIntentIds) {
          if (!snap.lendIntentIds.has(id)) {
            events.push({
              title: "Lend Intent Consumed",
              message: `Your lend intent ${id.slice(0, 8)}... was matched or cancelled`,
              time: "just now",
            });
          }
        }

        // New lend intents
        for (const id of snap.lendIntentIds) {
          if (!prev.lendIntentIds.has(id)) {
            events.push({
              title: "Lend Intent Active",
              message: `Your lend intent ${id.slice(0, 8)}... is now in the buffer`,
              time: "just now",
            });
          }
        }

        // Borrow intents removed
        for (const id of prev.borrowIntentIds) {
          if (!snap.borrowIntentIds.has(id)) {
            events.push({
              title: "Borrow Intent Consumed",
              message: `Your borrow intent ${id.slice(0, 8)}... was matched or cancelled`,
              time: "just now",
            });
          }
        }

        // New borrow intents
        for (const id of snap.borrowIntentIds) {
          if (!prev.borrowIntentIds.has(id)) {
            events.push({
              title: "Borrow Intent Submitted",
              message: `Your borrow intent ${id.slice(0, 8)}... is pending`,
              time: "just now",
            });
          }
        }

        // New proposals
        for (const id of snap.proposalIds) {
          if (!prev.proposalIds.has(id)) {
            events.push({
              title: "Match Proposal",
              message: `New match proposal ${id.slice(0, 8)}... awaiting your acceptance`,
              time: "just now",
            });
          }
        }

        // New payouts
        for (const id of snap.pendingPayoutIds) {
          if (!prev.pendingPayoutIds.has(id)) {
            events.push({
              title: "Payout Pending",
              message: `A payout is being processed for you`,
              time: "just now",
            });
          }
        }

        for (const id of snap.completedPayoutIds) {
          if (!prev.completedPayoutIds.has(id) && prev.pendingPayoutIds.has(id)) {
            events.push({
              title: "Payout Received",
              message: `Your payout has been completed`,
              time: "just now",
            });
          }
        }

        addNotifs(events);
        prevSnap.current = snap;
      } catch {
        // silent
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [address, addNotifs]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll };
}
