"use client";

import { Info } from "lucide-react";

const StakeCard = () => {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <h3 className="text-base font-semibold text-foreground">Quick Overview</h3>

      {/* Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Supported Assets</span>
          <span className="font-medium text-foreground">gUSD, gETH</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Network</span>
          <span className="font-medium text-foreground">Sepolia Testnet</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rate Model</span>
          <span className="font-medium text-foreground">Sealed Auction</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Matching Engine</span>
          <span className="font-medium text-foreground">Chainlink CRE</span>
        </div>
      </div>

      {/* CTA */}
      <a href="/" className="block w-full rounded-xl py-3.5 text-sm font-semibold text-gray-900 transition-colors cursor-pointer text-center" style={{ backgroundColor: "#e2a9f1" }}>
        Start Borrowing / Lending
      </a>

      {/* Info */}
      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          <span>Credit tiers: Bronze &rarr; Silver &rarr; Gold &rarr; Platinum</span>
        </div>
      </div>
    </div>
  );
};

export default StakeCard;
