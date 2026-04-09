"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTokenAmount } from "@/lib/pool-utils";
import Image from "next/image";

interface ProfilePositionsProps {
  lendSlots: any[];
  borrowIntents: any[];
  activeLoans: any[];
  onRefresh?: () => void;
}

function tokenSymbol(_address: string): string {
  return "gUSD";
}

function tokenImage(_address: string): string {
  return "/gusd.png";
}

function displayRate(loan: any): string {
  // borrower loans have effectiveRate, lender loans have rate
  const r = loan.effectiveRate ?? loan.rate;
  if (r == null) return "N/A";
  return `${(Number(r) * 100).toFixed(2)}%`;
}

const ProfilePositions = ({
  lendSlots,
  borrowIntents,
  activeLoans,
  onRefresh: _onRefresh,
}: ProfilePositionsProps) => {
  const [repaying, setRepaying] = useState<string | null>(null);

  const hasAny =
    lendSlots.length > 0 || borrowIntents.length > 0 || activeLoans.length > 0;

  const handleRepay = async (loan: any) => {
    try {
      setRepaying(loan.loanId);
      throw new Error("EVM removed — rewrite for Midnight");
    } catch (err: any) {
      console.error("Repay failed:", err);
    } finally {
      setRepaying(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            No active positions. Start lending or borrowing to see them here.
          </p>
        ) : (
          <>
            {lendSlots.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Lend Intents ({lendSlots.length})
                </p>
                {lendSlots.map((slot: any, i: number) => (
                  <div
                    key={slot.slotId ?? i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={tokenImage(slot.token)}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {formatTokenAmount(slot.amount ?? "0")}{" "}
                          {tokenSymbol(slot.token)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {slot.slotId?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-emerald-500 border-emerald-500/30"
                    >
                      {slot.status ?? "pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {borrowIntents.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Borrow Intents ({borrowIntents.length})
                </p>
                {borrowIntents.map((intent: any, i: number) => (
                  <div
                    key={intent.intentId ?? i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={tokenImage(intent.token)}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {formatTokenAmount(intent.amount ?? "0")}{" "}
                          {tokenSymbol(intent.token)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {intent.intentId?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-orange-400 border-orange-400/30"
                    >
                      {intent.status ?? "pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {activeLoans.filter((l: any) => !!l.totalDue).length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Borrowed Loans (
                  {activeLoans.filter((l: any) => !!l.totalDue).length})
                </p>
                {activeLoans
                  .filter((l: any) => !!l.totalDue)
                  .map((loan: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center border justify-between rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={tokenImage(loan.token)}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            {formatTokenAmount(loan.principal ?? "0")}{" "}
                            {tokenSymbol(loan.token)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rate: {displayRate(loan)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {formatTokenAmount(loan.totalDue)}{" "}
                            {tokenSymbol(loan.token)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRepay(loan)}
                          disabled={repaying === loan.loanId}
                          className="px-3 py-1 rounded-full text-xs font-semibold text-gray-900 transition-colors cursor-pointer disabled:opacity-50"
                          style={{ backgroundColor: "#e2a9f1" }}
                        >
                          {repaying === loan.loanId ? "Repaying..." : "Repay"}
                        </button>
                        <Badge
                          variant="outline"
                          className="text-[#e2a9f1] border-[#e2a9f1]/30"
                        >
                          {loan.status ?? "active"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {activeLoans.filter((l: any) => !l.totalDue).length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Lent Loans (
                  {activeLoans.filter((l: any) => !l.totalDue).length})
                </p>
                {activeLoans
                  .filter((l: any) => !l.totalDue)
                  .map((loan: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center border justify-between rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={tokenImage(loan.token)}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            {formatTokenAmount(loan.principal ?? "0")}{" "}
                            {tokenSymbol(loan.token)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rate: {displayRate(loan)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[#e2a9f1] border-[#e2a9f1]/30"
                      >
                        {loan.status ?? "active"}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfilePositions;
