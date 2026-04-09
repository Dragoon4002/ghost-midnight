"use client";

import { useState, useCallback } from "react";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Step = "idle" | "signing" | "confirming" | "success" | "error";

const TOKENS = [
  { symbol: "gUSD", logo: "/gusd.png" },
  { symbol: "gETH", logo: "/geth.png" },
];

const PRESETS = [25, 50, 75, 100] as const;

const formatBal = (raw: string | number) => {
  const n = Number(raw) / 1e18;
  if (n === 0) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

export default function WithdrawCard({ addr: _addr }: { addr: string }) {
  const [balances, setBalances] = useState<Record<string, string> | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(0);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [txHash] = useState("");
  const [error, setError] = useState("");

  const hasFetched = balances !== null;

  const loadBalances = useCallback(async () => {
    setLoadingBal(true);
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch {
      setBalances({});
    } finally {
      setLoadingBal(false);
    }
  }, []);

  const token = TOKENS[selectedToken];
  const bal = hasFetched ? (balances[token.symbol] ?? "0") : "0";
  const balEth = Number(bal) / 1e18;
  const amountNum = Number(amount) || 0;
  const exceedsBal = hasFetched && amountNum > balEth;
  const hasNoBal = hasFetched && balEth <= 0;
  const canWithdraw = hasFetched && amountNum > 0 && !exceedsBal && !hasNoBal;

  const setPreset = (pct: number) => {
    if (balEth <= 0) return;
    const val = (balEth * pct) / 100;
    setAmount(val.toString());
  };

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    setStep("signing");
    setError("");
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Withdraw failed");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setError("");
  };

  return (
    <Card className="[&]:pb-2 [&]:gap-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Private Wallet</CardTitle>
        {hasFetched && (
          <button
            onClick={loadBalances}
            disabled={loadingBal}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingBal ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </CardHeader>
      <CardContent>
        {!hasFetched ? (
          <div className="flex items-center justify-center h-[220px]">
            <button
              onClick={loadBalances}
              disabled={loadingBal}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-900 transition-colors cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "#e2a9f1" }}
            >
              {loadingBal ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching...
                </span>
              ) : (
                "Fetch Balances"
              )}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-2">
              {TOKENS.map((t, i) => {
                const tBal = balances[t.symbol] ?? "0";
                const active = selectedToken === i;
                return (
                  <motion.button
                    key={t.symbol}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => {
                      setSelectedToken(i);
                      setAmount("");
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer border ${
                      active
                        ? "border-[#e2a9f1]/50 bg-[#e2a9f1]/5"
                        : "border-border bg-muted/40 hover:bg-muted/70"
                    }`}
                  >
                    <Image
                      src={t.logo}
                      alt={t.symbol}
                      width={24}
                      height={24}
                      className="rounded-full shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {t.symbol}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {loadingBal ? "..." : formatBal(tBal)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="relative mt-6">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[0-9]*\.?[0-9]*$/.test(v)) setAmount(v);
                }}
                placeholder="0.0"
                disabled={step !== "idle" && step !== "error"}
                className={`w-full bg-muted/50 border rounded-lg pl-3 pr-14 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors disabled:opacity-40 ${
                  exceedsBal
                    ? "border-red-500/60"
                    : "border-border focus:border-[#e2a9f1]/60"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {token.symbol}
              </span>
            </div>

            <div className="flex mt-4 gap-1.5">
              {PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPreset(pct)}
                  disabled={hasNoBal}
                  className="flex-1 py-1 rounded-md text-[11px] font-medium bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-[#e2a9f1]/40 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              ))}
            </div>

            {exceedsBal && (
              <p className="text-[11px] text-red-400">Insufficient balance</p>
            )}

            <AnimatePresence mode="wait">
              {step === "idle" && (
                <motion.button
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleWithdraw}
                  disabled={!canWithdraw}
                  className={`w-full py-2 mt-6 rounded-lg text-xs font-semibold text-gray-900 transition-all cursor-pointer disabled:cursor-not-allowed ${canWithdraw ? "bg-[#e2a9f1]" : "bg-[#e2a9f1]/30"}`}
                >
                  Withdraw to Wallet
                </motion.button>
              )}

              {step === "signing" && (
                <motion.div
                  key="signing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Requesting ticket...
                </motion.div>
              )}

              {step === "confirming" && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Confirming...
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1.5 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs text-green-400">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </motion.div>
                    Withdrawn
                  </div>
                  {txHash && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {txHash}
                    </p>
                  )}
                  <button
                    onClick={reset}
                    className="text-[11px] cursor-pointer transition-colors text-[#e2a9f1]"
                  >
                    Withdraw more
                  </button>
                </motion.div>
              )}

              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1.5 text-center"
                >
                  <p className="text-xs text-red-400">{error}</p>
                  <button
                    onClick={reset}
                    className="text-[11px] cursor-pointer transition-colors text-[#e2a9f1]"
                  >
                    Try again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
