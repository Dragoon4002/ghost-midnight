"use client";

import { Card, CardContent } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";

interface ProfileStatsProps {
  loansRepaid: number;
  loansDefaulted: number;
  borrowCount: number;
  lendCount: number;
  intentCount: number;
}

const ProfileStats = ({
  loansRepaid,
  loansDefaulted,
  borrowCount,
  lendCount,
  intentCount,
}: ProfileStatsProps) => {
  const stats = [
    { label: "Loans Repaid", value: loansRepaid },
    { label: "Defaulted", value: loansDefaulted },
    { label: "Active Borrows", value: borrowCount },
    { label: "Active Lends", value: lendCount },
    { label: "Pending Intents", value: intentCount },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {s.label}
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              <NumberTicker value={s.value} decimalPlaces={0} />
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProfileStats;
