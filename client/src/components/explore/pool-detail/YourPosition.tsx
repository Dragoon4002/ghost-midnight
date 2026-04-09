"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatTokenAmount } from "@/lib/pool-utils";

interface YourPositionProps {
  lendIntents: any[];
  borrowIntents: any[];
  loans: any[];
  ticker: string;
}

const YourPosition = ({ lendIntents, borrowIntents, loans, ticker }: YourPositionProps) => {
  const hasAny = lendIntents.length > 0 || borrowIntents.length > 0 || loans.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Position</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            You have no active positions in this pool.
          </p>
        ) : (
          <>
            {lendIntents.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Lend Intents
                </p>
                {lendIntents.map((intent: any, i: number) => (
                  <div
                    key={intent.slotId ?? i}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {formatTokenAmount(intent.amount ?? "0")} {ticker}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {intent.slotId?.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                      {intent.status ?? "pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {borrowIntents.length > 0 && (
              <>
                {lendIntents.length > 0 && <Separator />}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Borrow Intents
                  </p>
                  {borrowIntents.map((intent: any, i: number) => (
                    <div
                      key={intent.intentId ?? i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {formatTokenAmount(intent.amount ?? "0")} {ticker}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {intent.intentId?.slice(0, 8)}...
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                        {intent.status ?? "pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {loans.length > 0 && (
              <>
                {(lendIntents.length > 0 || borrowIntents.length > 0) && <Separator />}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Active Loans
                  </p>
                  {loans.map((loan: any, i: number) => (
                    <div
                      key={loan.loanId ?? i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {formatTokenAmount(loan.amount ?? "0")} {ticker}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rate: {loan.rate ? `${(Number(loan.rate) / 100).toFixed(2)}%` : "N/A"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[#e2a9f1] border-[#e2a9f1]/30">
                        {loan.status ?? "active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default YourPosition;
