"use client";

import { useState, useEffect, useCallback } from "react";
import { useMidnightWallet } from "@/components/providers/wallet-wrapper";
import { Loader2, AlertCircle } from "lucide-react";
import { get } from "@/lib/api";

interface BorrowIntent {
  intentId: string;
  token: string;
  amount: string;
  collateralToken: string;
  collateralAmount: string;
  status: string;
  createdAt: number;
}

interface LendIntent {
  intentId: string;
  slotId: string;
  token: string;
  amount: string;
  createdAt: number;
}

interface ActiveLoan {
  loanId: string;
  token: string;
  principal: string;
  effectiveRate?: number;
  rate?: number;
  totalDue?: string;
  repaidAmount?: string;
  collateralToken?: string;
  collateralAmount?: string;
  requiredCollateral?: string;
  excessCollateral?: string;
  maturityDate?: string;
  expectedPayout?: string;
  maturity?: number;
  borrower?: string;
}

const formatAmount = (raw: string) => {
  const num = Number(raw) / 1e18;
  return num.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

const tokenSymbol = (_addr?: string) => "gUSD";
const tokenLogo = (_addr?: string) => "/gusd.png";

const StatusTab = () => {
  const { isConnected, connect, address } = useMidnightWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [borrowIntents, setBorrowIntents] = useState<BorrowIntent[]>([]);
  const [lendIntents, setLendIntents] = useState<LendIntent[]>([]);
  const [borrowLoans, setBorrowLoans] = useState<ActiveLoan[]>([]);
  const [lendLoans, setLendLoans] = useState<ActiveLoan[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [repaying, setRepaying] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [borrowData, lendData] = await Promise.all([
        get(`/api/v1/borrower-status/${address}`),
        get(`/api/v1/lender-status/${address}`),
      ]);
      setBorrowIntents(borrowData.pendingIntents ?? []);
      setBorrowLoans(borrowData.activeLoans ?? []);
      setLendIntents(lendData.activeLends ?? []);
      setLendLoans(lendData.activeLoans ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleCancelBorrow = async (intentId: string) => {
    setCancelling(intentId);
    setError("");
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setCancelling(null);
    }
  };

  const handleCancelLend = async (slotId: string) => {
    setCancelling(slotId);
    setError("");
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setCancelling(null);
    }
  };

  const handleClaimExcess = async (loanId: string) => {
    setCancelling(`claim-${loanId}`);
    setError("");
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setCancelling(null);
    }
  };

  const handleRepay = async (loan: ActiveLoan) => {
    setRepaying(loan.loanId);
    setError("");
    try {
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setRepaying(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => connect().catch(console.error)}
          className="w-full text-gray-900 font-medium py-4 rounded-2xl transition-colors cursor-pointer text-lg"
          style={{ backgroundColor: "#e2a9f1" }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const isEmpty =
    borrowIntents.length === 0 &&
    lendIntents.length === 0 &&
    borrowLoans.length === 0 &&
    lendLoans.length === 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl bg-red-500/10 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {isEmpty && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          No active intents or loans found.
        </div>
      )}

      {borrowIntents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Borrow Intents</h2>
          <div className="space-y-2">
            {borrowIntents.map((intent) => (
              <div
                key={intent.intentId}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img src={tokenLogo(intent.token)} alt={tokenSymbol(intent.token)} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatAmount(intent.amount)} {tokenSymbol(intent.token)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Collateral: {formatAmount(intent.collateralAmount)} {tokenSymbol(intent.collateralToken)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      intent.status === "proposed"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {intent.status}
                  </span>
                  {intent.status === "pending" && (
                    <button
                      onClick={() => handleCancelBorrow(intent.intentId)}
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

      {lendIntents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Lend Intents</h2>
          <div className="space-y-2">
            {lendIntents.map((intent) => (
              <div
                key={intent.intentId}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img src={tokenLogo(intent.token)} alt={tokenSymbol(intent.token)} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatAmount(intent.amount)} {tokenSymbol(intent.token)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {intent.intentId.slice(0, 10)}...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/20 text-green-400">
                    active
                  </span>
                  <button
                    onClick={() => handleCancelLend(intent.slotId)}
                    disabled={cancelling === intent.slotId}
                    className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {cancelling === intent.slotId ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {borrowLoans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Active Loans (Borrowing)</h2>
          <div className="space-y-2">
            {borrowLoans.map((loan) => (
              <div key={loan.loanId} className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={tokenLogo(loan.token)} alt={tokenSymbol(loan.token)} className="w-8 h-8 rounded-full" />
                    <div className="text-sm font-medium text-foreground">
                      {formatAmount(loan.principal)} {tokenSymbol(loan.token)}
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-400">
                    active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    Rate:{" "}
                    <span className="text-foreground">
                      {((loan.effectiveRate ?? 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    Due:{" "}
                    <span className="text-foreground">
                      {loan.totalDue ? formatAmount(loan.totalDue) : "—"} {tokenSymbol(loan.token)}
                    </span>
                  </div>
                  <div>
                    Repaid:{" "}
                    <span className="text-foreground">
                      {loan.repaidAmount ? formatAmount(loan.repaidAmount) : "0"}
                    </span>
                  </div>
                  <div>
                    Maturity:{" "}
                    <span className="text-foreground">
                      {loan.maturityDate ? new Date(loan.maturityDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
                {loan.excessCollateral && Number(loan.excessCollateral) > 0 && (
                  <button
                    onClick={() => handleClaimExcess(loan.loanId)}
                    disabled={cancelling === `claim-${loan.loanId}`}
                    className="w-full mt-1 bg-new-pink disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {cancelling === `claim-${loan.loanId}`
                      ? "Withdrawing..."
                      : `Withdraw (${formatAmount(loan.excessCollateral)})`}
                  </button>
                )}
                <button
                  onClick={() => handleRepay(loan)}
                  disabled={repaying === loan.loanId}
                  className="w-full mt-1 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: "#e2a9f1" }}
                >
                  {repaying === loan.loanId
                    ? "Repaying..."
                    : `Repay (${loan.totalDue ? formatAmount(loan.totalDue) : "—"} ${tokenSymbol(loan.token)})`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lendLoans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Active Loans (Lending)</h2>
          <div className="space-y-2">
            {lendLoans.map((loan) => (
              <div key={loan.loanId} className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={tokenLogo(loan.token)} alt={tokenSymbol(loan.token)} className="w-8 h-8 rounded-full" />
                    <div className="text-sm font-medium text-foreground">
                      {formatAmount(loan.principal)} {tokenSymbol(loan.token)}
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-400">
                    active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    Rate:{" "}
                    <span className="text-foreground">
                      {((loan.effectiveRate ?? (loan as any).rate ?? 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    Payout:{" "}
                    <span className="text-foreground">
                      {loan.expectedPayout ? formatAmount(loan.expectedPayout) : "—"} {tokenSymbol(loan.token)}
                    </span>
                  </div>
                  <div>
                    Maturity:{" "}
                    <span className="text-foreground">
                      {loan.maturityDate ? new Date(loan.maturityDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusTab;
