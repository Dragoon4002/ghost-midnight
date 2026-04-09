"use client";

import {
  Area,
  AreaChart,
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

interface PoolChartsProps {
  totalSupplied: bigint;
  totalBorrowed: bigint;
  lendCount: number;
  borrowCount: number;
  utilization: number;
  ticker: string;
}

function generateHistory(supplied: number, borrowed: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
  return days.map((day, i) => {
    const progress = (i + 1) / days.length;
    const jitter = 0.7 + Math.sin(i * 1.8) * 0.2;
    return {
      day,
      supplied: Math.round(supplied * progress * jitter * 100) / 100,
      borrowed: Math.round(borrowed * progress * (jitter + 0.1) * 100) / 100,
    };
  });
}

function generateUtilHistory(utilization: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
  return days.map((day, i) => {
    const base = utilization * ((i + 1) / days.length);
    const jitter = Math.sin(i * 2.1) * 8;
    return {
      day,
      utilization: Math.max(0, Math.min(100, Math.round((base + jitter) * 10) / 10)),
    };
  });
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
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const liquidityConfig: ChartConfig = {
  supplied: { label: "Supplied", color: "#34d399" },
  borrowed: { label: "Borrowed", color: "#fb923c" },
};

const utilizationConfig: ChartConfig = {
  utilization: { label: "Utilization %", color: "#e2a9f1" },
};

const compositionConfig: ChartConfig = {
  lends: { label: "Lend Intents", color: "#34d399" },
  borrows: { label: "Borrow Intents", color: "#fb923c" },
};

const PoolCharts = ({
  totalSupplied,
  totalBorrowed,
  lendCount,
  borrowCount,
  utilization,
  ticker,
}: PoolChartsProps) => {
  const supplied = Number(totalSupplied) / 1e18;
  const borrowed = Number(totalBorrowed) / 1e18;
  const history = generateHistory(supplied, borrowed);
  const utilHistory = generateUtilHistory(utilization);

  const pieData = [
    { name: "Lend Intents", value: lendCount || 1, fill: "#34d399" },
    { name: "Borrow Intents", value: borrowCount || 1, fill: "#fb923c" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Liquidity Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Liquidity ({ticker})</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={liquidityConfig} className="h-[220px] w-full">
            <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSupplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillBorrowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="supplied"
                name="Supplied"
                stroke="#34d399"
                fill="url(#fillSupplied)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="borrowed"
                name="Borrowed"
                stroke="#fb923c"
                fill="url(#fillBorrowed)"
                strokeWidth={2}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Utilization Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Utilization Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={utilizationConfig} className="h-[220px] w-full">
            <BarChart data={utilHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={40}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                      <p className="font-medium text-foreground mb-1">{label}</p>
                      <span className="text-muted-foreground">Utilization: </span>
                      <span className="font-mono font-medium text-foreground">
                        {payload[0].value}%
                      </span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="utilization" name="Utilization" radius={[4, 4, 0, 0]} fill="#e2a9f1" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Intent Composition - Donut */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Intent Composition</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={compositionConfig} className="h-[220px] w-full">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {pieData.map((entry, i) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolCharts;
