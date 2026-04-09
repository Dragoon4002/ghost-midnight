"use client";

import { useState, useEffect, useCallback } from "react";
import { useMidnightWallet } from "@/components/providers/wallet-wrapper";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import CoinSelector from "./CoinSelector";
import { COINS, type Coin } from "@/lib/constants";
import { get } from "@/lib/api";

type Status = "idle" | "submitting" | "done" | "error";

const STATUS_LABELS: Record<Status, string> = {
  idle: "",
  submitting: "Submitting borrow intent...",
  done: "Borrow intent submitted!",
  error: "Something went wrong",
};

interface BorrowIntent {
  intentId: string;
  token: string;
  amount: string;
  collateralToken: string;
  collateralAmount: string;
  status: string;
  createdAt: number;
}

const formatAmount = (raw: string) => {
  const num = Number(raw) / 1e18;
  return num.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

const BorrowCard = () => {
  const { isConnected, connect, address } = useMidnightWallet();

  const [borrowAmount, setBorrowAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [duration, setDuration] = useState("30");
  const [borrowCoin, setBorrowCoin] = useState<Coin>(COINS[0]); // gUSD
  const [collateralCoin, setCollateralCoin] = useState<Coin>(COINS[1]); // gETH

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) setter(val);
  };

  const handleIntChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d+$/.test(val)) setter(val);
  };

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [intentId, setIntentId] = useState("");
  const [intents, setIntents] = useState<BorrowIntent[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadIntents = useCallback(async () => {
    if (!address) return;
    try {
      const data: any = await get(`/api/v1/borrower-status/${address}`);
      setIntents(data.pendingIntents ?? []);
    } catch {
      // silent
    }
  }, [address]);

  useEffect(() => {
    loadIntents();
  }, [loadIntents]);

  const handleBorrowCoinChange = (coin: Coin) => {
    setBorrowCoin(coin);
    setCollateralCoin(coin.symbol === "gUSD" ? COINS[1] : COINS[0]);
  };

  const handleBorrow = async () => {
    if (!isConnected) {
      await connect().catch(console.error);
      return;
    }
    try {
      setError("");
      setStatus("submitting");
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setStatus("error");
    }
  };

  const handleCancel = async (intentIdToCancel: string) => {
    setCancelling(intentIdToCancel);
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setStatus("error");
    } finally {
      setCancelling(null);
    }
  };

  const isProcessing = status === "submitting";
  const rateEmpty = !maxRate || maxRate.trim() === "";

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {/* Borrow Token & Amount */}
        <div className="space-y-2">
          <div className="bg-muted/50 rounded-xl px-5 py-4">
            <div className="text-sm text-muted-foreground mb-3">
              You&apos;re borrowing
            </div>
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                inputMode="decimal"
                value={borrowAmount}
                onChange={handleNumericChange(setBorrowAmount)}
                onKeyDown={blockInvalidChars}
                placeholder="0"
                className="bg-transparent text-3xl font-medium text-foreground outline-none w-full placeholder:text-muted-foreground/60"
              />
              <div className="shrink-0 w-36">
                <CoinSelector
                  coins={[...COINS]}
                  selected={borrowCoin}
                  onSelect={handleBorrowCoinChange}
                  label=""
                />
              </div>
            </div>
          </div>

          {/* Collateral Amount */}
          <div className="bg-muted/50 rounded-xl px-5 py-4">
            <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              Collateral ({collateralCoin.symbol})
            </div>
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                inputMode="decimal"
                value={collateralAmount}
                onChange={handleNumericChange(setCollateralAmount)}
                onKeyDown={blockInvalidChars}
                placeholder="0"
                className="bg-transparent text-3xl font-medium text-foreground outline-none w-full placeholder:text-muted-foreground/60"
              />
              <div className="shrink-0">
                <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 border border-border">
                  <img
                    src={collateralCoin.symbol === "gUSD" ? "/gusd.png" : "/geth.png"}
                    alt={collateralCoin.symbol}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {collateralCoin.symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rate & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-xl px-4 py-3.5">
            <div className="text-xs text-muted-foreground mb-2">
              Max Rate (%)
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={maxRate}
                onChange={handleNumericChange(setMaxRate)}
                onKeyDown={blockInvalidChars}
                placeholder="10"
                className="bg-transparent text-xl font-medium text-foreground outline-none w-full placeholder:text-muted-foreground/60"
              />
              <span className="text-lg text-muted-foreground font-medium">%</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl px-4 py-3.5">
            <div className="text-xs text-muted-foreground mb-2">
              Duration (days)
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={duration}
                onChange={handleIntChange(setDuration)}
                onKeyDown={blockInvalidChars}
                placeholder="30"
                className="bg-transparent text-xl font-medium text-foreground outline-none w-full placeholder:text-muted-foreground/60"
              />
              <span className="text-lg text-muted-foreground font-medium">d</span>
            </div>
          </div>
        </div>

        {/* Info Summary */}
        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            <span>Your max rate is encrypted and hidden from the server</span>
          </div>
        </div>

        {/* Status */}
        {status !== "idle" && status !== "done" && (
          <div
            className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
              status === "error"
                ? "bg-red-500/10 text-red-400"
                : "bg-indigo-500/10 text-indigo-400"
            }`}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === "error" && <AlertCircle className="w-4 h-4" />}
            <span>{STATUS_LABELS[status]}</span>
            {status === "error" && error && (
              <span className="truncate ml-1">— {error}</span>
            )}
          </div>
        )}

        {/* Submit Button */}
        {isConnected ? (
          <button
            onClick={handleBorrow}
            disabled={isProcessing || rateEmpty}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium py-4 rounded-2xl transition-colors cursor-pointer text-lg"
            style={{ backgroundColor: "#e2a9f1" }}
          >
            {isProcessing ? "Processing..." : "Submit Borrow Intent"}
          </button>
        ) : (
          <button
            onClick={() => connect().catch(console.error)}
            className="w-full text-gray-900 font-medium py-4 rounded-2xl transition-colors cursor-pointer text-lg"
            style={{ backgroundColor: "#e2a9f1" }}
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Intent Result */}
      {status === "done" && intentId && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 space-y-2 mt-4">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Borrow intent submitted!</span>
          </div>
          <div className="text-xs text-muted-foreground">Intent ID</div>
          <div className="font-mono text-sm text-foreground break-all">
            {intentId}
          </div>
        </div>
      )}

      {/* Active Borrow Intents */}
      {isConnected && intents.length > 0 && (
        <div className="space-y-3 mt-4">
          <h2 className="text-lg font-medium text-foreground">Your Borrow Intents</h2>
          <div className="space-y-2">
            {intents.map((intent) => (
              <div
                key={intent.intentId}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Image src="/gusd.png" alt="" width={32} height={32} className="rounded-full" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatAmount(intent.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Collateral: {formatAmount(intent.collateralAmount)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    intent.status === "proposed"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    {intent.status}
                  </span>
                  {intent.status === "pending" && (
                    <button
                      onClick={() => handleCancel(intent.intentId)}
                      disabled={cancelling === intent.intentId}
                      className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer disabled:opacity-50"
                    >
                      {cancelling === intent.intentId ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default BorrowCard;
