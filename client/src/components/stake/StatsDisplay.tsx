"use client";

import { CircleHelp, ArrowUpDown } from "lucide-react";
import { RollingNumber } from "@/components/ui/rolling-text";

interface StatsDisplayProps {
  liquidity: string;
  intents: number;
}

const StatsDisplay = ({ liquidity, intents }: StatsDisplayProps) => {
  return (
    <div className="flex items-start">
      {/* Pool Rate Range */}
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm text-muted-foreground">Pool Rate Range</span>
          <CircleHelp className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-medium text-foreground tabular-nums">
            4.5–8%
          </span>
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-18 bg-border mx-8 self-center" />

      {/* Total Pool Liquidity */}
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm text-muted-foreground">Pool Liquidity</span>
          <CircleHelp className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-medium text-foreground tabular-nums">
            <RollingNumber value={liquidity} suffix=" gUSD" />
          </span>
          <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
        </div>
        {intents > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            <RollingNumber value={intents} suffix=" active intents" />
          </p>
        )}
      </div>
    </div>
  );
};

export default StatsDisplay;
