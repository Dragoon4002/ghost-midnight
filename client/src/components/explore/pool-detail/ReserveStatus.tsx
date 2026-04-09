"use client";

import { Card, CardContent } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatTokenAmount } from "@/lib/pool-utils";

interface ReserveStatusProps {
  totalSupplied: bigint;
  totalBorrowed: bigint;
  activeIntents: number;
  utilization: number;
  ticker: string;
}

const ReserveStatus = ({
  totalSupplied,
  totalBorrowed,
  activeIntents,
  utilization,
  ticker,
}: ReserveStatusProps) => {
  const stats = [
    {
      label: "Total Supplied",
      value: formatTokenAmount(totalSupplied.toString()),
      suffix: ` ${ticker}`,
    },
    {
      label: "Borrow Demand",
      value: formatTokenAmount(totalBorrowed.toString()),
      suffix: ` ${ticker}`,
    },
    { label: "Active Intents", numeric: activeIntents },
    { label: "Utilization", numeric: utilization, suffix: "%" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {s.label}
            </p>
            <p className="text-xl font-bold text-foreground">
              {s.numeric !== undefined ? (
                <>
                  <NumberTicker value={s.numeric} decimalPlaces={s.suffix === "%" ? 1 : 0} />
                  {s.suffix}
                </>
              ) : (
                <>
                  {s.value}
                  {s.suffix}
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReserveStatus;
