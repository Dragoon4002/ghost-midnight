"use client";

import { Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatTokenAmount } from "@/lib/pool-utils";

interface SupplyBorrowInfoProps {
  totalSupplied: bigint;
  totalBorrowed: bigint;
  lendCount: number;
  borrowCount: number;
  ticker: string;
  collateralTicker: string;
}

const SupplyBorrowInfo = ({
  totalSupplied,
  totalBorrowed,
  lendCount,
  borrowCount,
  ticker,
  collateralTicker,
}: SupplyBorrowInfoProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Supply Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Supply Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Liquidity</span>
            <span className="text-sm font-medium">
              {formatTokenAmount(totalSupplied.toString())} {ticker}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Lend Intents</span>
            <span className="text-sm font-medium">{lendCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Supply Rate</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Sealed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Borrow Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Borrow Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Demand</span>
            <span className="text-sm font-medium">
              {formatTokenAmount(totalBorrowed.toString())} {ticker}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Borrow Intents</span>
            <span className="text-sm font-medium">{borrowCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Collateral</span>
            <span className="text-sm font-medium">{collateralTicker}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Borrow Rate</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Sealed
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplyBorrowInfo;
