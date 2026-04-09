"use client";

import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import TokenInput from "../TokenInput";
import ConnectWalletButton from "@/components/shared/ConnectWalletButton";

const GUSDIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400" />
);

const GETHIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />
);

const repayMethods = ["Full Repay", "Partial"];

const UnstakeTab = () => {
  const [repayAmount, setRepayAmount] = useState("");
  const [collateralReturn, setCollateralReturn] = useState("");
  const [repayMethod, setRepayMethod] = useState("Full Repay");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium text-foreground">Repay Loan</h1>
        <p className="text-sm text-muted-foreground">
          Repay your loan to release collateral. Each lender is credited at their individual rate.
        </p>
      </div>

      {/* Repay Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <TokenInput
            label="You're repaying"
            token="gUSD"
            tokenIcon={<GUSDIcon />}
            value={repayAmount}
            usdValue="0"
            onChange={setRepayAmount}
            hasDropdown
          />

          <TokenInput
            label="Collateral returned"
            token="gETH"
            tokenIcon={<GETHIcon />}
            value={collateralReturn}
            usdValue="0"
            readOnly
          />
        </div>

        {/* Repay Method */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Repay Method
              </span>
              <span className="text-sm text-muted-foreground">
                (How to choose?)
              </span>
            </div>

            <div className="flex items-center bg-muted/50 rounded-full p-0.5 border border-border">
              {repayMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => setRepayMethod(method)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    repayMethod === method
                      ? "bg-muted text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Method info */}
          <div className="flex items-center justify-between bg-muted/30 border border-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Zap className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {repayMethod === "Full Repay"
                    ? "Full repayment"
                    : "Partial repayment"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {repayMethod === "Full Repay"
                    ? "Repay principal + interest, release all collateral"
                    : "Reduce outstanding balance, partial collateral release"}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-medium text-foreground">
                {repayMethod === "Full Repay"
                  ? "Full collateral release"
                  : "Proportional release"}
              </span>
            </div>
          </div>
        </div>

        <ConnectWalletButton />
      </div>
    </div>
  );
};

export default UnstakeTab;
