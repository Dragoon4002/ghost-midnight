"use client";

import { useState } from "react";
import { CircleHelp, Plus } from "lucide-react";
import TokenInput from "../TokenInput";
import ConnectWalletButton from "@/components/shared/ConnectWalletButton";

const GUSDIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
);

const GETHIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />
);

const SwapTab = () => {
  const [borrowAmount, setBorrowAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium text-foreground">
        Borrow with sealed rates
      </h1>

      {/* Borrow Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <TokenInput
            label="You're borrowing"
            token="gUSD"
            tokenIcon={<GUSDIcon />}
            value={borrowAmount}
            usdValue="0"
            onChange={setBorrowAmount}
            hasDropdown
          />

          <TokenInput
            label="Collateral"
            token="gETH"
            tokenIcon={<GETHIcon />}
            value={collateralAmount}
            usdValue="0"
            onChange={setCollateralAmount}
            hasDropdown
            readOnly
          />
        </div>

        {/* Rate Stats */}
        <div className="flex items-start gap-0">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm text-muted-foreground">Max Rate</span>
              <CircleHelp className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-2xl font-semibold text-foreground">
              0.00%
            </span>
          </div>

          <div className="w-px h-14 bg-border mx-6" />

          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm text-muted-foreground">Blended Rate</span>
              <CircleHelp className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-foreground">
                --
              </span>
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
            </div>
          </div>
        </div>

        <ConnectWalletButton />
      </div>
    </div>
  );
};

export default SwapTab;
