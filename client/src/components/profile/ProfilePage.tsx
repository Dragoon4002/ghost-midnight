"use client";

import { useState, useEffect, useCallback } from "react";
import { useMidnightWallet } from "@/components/providers/wallet-wrapper";
import { Loader2 } from "lucide-react";
import { get } from "@/lib/api";
import ProfileHeader from "./ProfileHeader";
import ProfileStats from "./ProfileStats";
import ProfileCharts from "./ProfileCharts";
import ProfilePositions from "./ProfilePositions";


interface CreditInfo {
  tier: string;
  loansRepaid: number;
  loansDefaulted: number;
  collateralMultiplier: number;
}

const ProfilePage = () => {
  const { isConnected, connect, address } = useMidnightWallet();
  const addr = address;

  const [credit, setCredit] = useState<CreditInfo | null>(null);
  const [borrowCount, setBorrowCount] = useState(0);
  const [lendCount, setLendCount] = useState(0);
  const [intentCount, setIntentCount] = useState(0);
  const [lendSlots, setLendSlots] = useState<any[]>([]);
  const [borrowIntents, setBorrowIntents] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!addr) return;
    setLoading(true);
    try {
      const [c, b, l] = await Promise.all([
        get(`/api/v1/credit-score/${addr}`).catch(() => null),
        get(`/api/v1/borrower-status/${addr}`).catch(() => ({})),
        get(`/api/v1/lender-status/${addr}`).catch(() => ({})),
      ]);
      setCredit(c);

      const bLoans = b.activeLoans ?? [];
      const lLoans = l.activeLoans ?? [];
      setBorrowCount(bLoans.length);
      setLendCount(lLoans.length);
      setIntentCount(
        (b.pendingIntents ?? []).length + (l.activeLends ?? []).length
      );

      setLendSlots(l.lendSlots ?? l.activeLends ?? []);
      setBorrowIntents(b.borrowIntents ?? b.pendingIntents ?? []);
      setActiveLoans([...bLoans, ...lLoans]);
    } finally {
      setLoading(false);
    }
  }, [addr]);

  useEffect(() => { load(); }, [load]);

  if (!isConnected) {
    return (
      <div className="w-full max-w-lg mx-auto py-32 px-4 text-center space-y-4">
        <h2 className="text-lg font-medium text-foreground">Connect to view your profile</h2>
        <p className="text-sm text-muted-foreground">
          Your credit tier, positions, and protocol stats live here.
        </p>
        <button
          onClick={() => connect().catch(console.error)}
          className="text-gray-900 px-8 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
          style={{ backgroundColor: "#e2a9f1" }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tier = credit?.tier ?? "bronze";
  const multiplier = credit?.collateralMultiplier ?? 2;

  return (
    <div className="w-full max-w-6xl mx-auto py-10 space-y-8 px-4">
      <ProfileHeader
        address={addr ?? ""}
        tier={tier}
        multiplier={multiplier}
        loansRepaid={credit?.loansRepaid ?? 0}
        loansDefaulted={credit?.loansDefaulted ?? 0}
      />

      <ProfileStats
        loansRepaid={credit?.loansRepaid ?? 0}
        loansDefaulted={credit?.loansDefaulted ?? 0}
        borrowCount={borrowCount}
        lendCount={lendCount}
        intentCount={intentCount}
      />

      <ProfileCharts
        loansRepaid={credit?.loansRepaid ?? 0}
        loansDefaulted={credit?.loansDefaulted ?? 0}
        borrowCount={borrowCount}
        lendCount={lendCount}
        intentCount={intentCount}
        addr={addr ?? ""}
      />

      <ProfilePositions
        lendSlots={lendSlots}
        borrowIntents={borrowIntents}
        activeLoans={activeLoans}
        onRefresh={load}
      />
    </div>
  );
};

export default ProfilePage;
