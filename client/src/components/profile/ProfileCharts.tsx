"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import WithdrawCard from "./WithdrawCard";

interface ProfileChartsProps {
  loansRepaid: number;
  loansDefaulted: number;
  borrowCount: number;
  lendCount: number;
  intentCount: number;
  addr: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium text-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const creditConfig: ChartConfig = {
  repaid: { label: "Repaid", color: "#34d399" },
  defaulted: { label: "Defaulted", color: "#ef4444" },
};

const activityConfig: ChartConfig = {
  lending: { label: "Lending", color: "#34d399" },
  borrowing: { label: "Borrowing", color: "#fb923c" },
  intents: { label: "Intents", color: "#e2a9f1" },
};

const ProfileCharts = ({
  loansRepaid,
  loansDefaulted,
  borrowCount,
  lendCount,
  intentCount,
  addr,
}: ProfileChartsProps) => {
  const creditData = [
    { name: "Repaid", value: loansRepaid || 0, fill: "#34d399" },
    { name: "Defaulted", value: loansDefaulted || 0, fill: "#ef4444" },
  ];

  const activityBarData = [
    { label: "Lending", value: lendCount, fill: "#34d399" },
    { label: "Borrowing", value: borrowCount, fill: "#fb923c" },
    { label: "Intents", value: intentCount, fill: "#e2a9f1" },
  ];

  const hasCredit = loansRepaid > 0 || loansDefaulted > 0;
  const successRate = loansRepaid + loansDefaulted > 0
    ? Math.round((loansRepaid / (loansRepaid + loansDefaulted)) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={activityConfig} className="h-[220px] w-full">
            <BarChart data={activityBarData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {activityBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Credit History Donut */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Credit History</CardTitle>
          {hasCredit && (
            <span className="text-xs text-muted-foreground">
              {successRate}% success rate
            </span>
          )}
        </CardHeader>
        <CardContent>
          {hasCredit ? (
            <ChartContainer config={creditConfig} className="h-[220px] w-full">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={creditData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {creditData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No loan history yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Private Wallet Withdraw */}
      <WithdrawCard addr={addr} />
    </div>
  );
};

export default ProfileCharts;
