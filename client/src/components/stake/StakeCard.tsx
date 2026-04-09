"use client";

import { useState } from "react";
import TokenInput from "./TokenInput";
import StakeMethodSelector from "./StakeMethodSelector";
import ConnectWalletButton from "@/components/shared/ConnectWalletButton";

const GUSDIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400" />
);

const GETHIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />
);

const StakeCard = () => {
  const [depositAmount, setDepositAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("Private Transfer");

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="space-y-2">
        <TokenInput
          label="You're lending"
          token="gUSD"
          tokenIcon={<GUSDIcon />}
          value={depositAmount}
          usdValue="0"
          onChange={setDepositAmount}
        />

        <TokenInput
          label="Collateral required"
          token="gETH"
          tokenIcon={<GETHIcon />}
          value={collateralAmount}
          usdValue="0"
          onChange={setCollateralAmount}
          hasDropdown
          readOnly
        />
      </div>

      <StakeMethodSelector
        activeMethod={depositMethod}
        onMethodChange={setDepositMethod}
      />

      <ConnectWalletButton />
    </div>
  );
};

export default StakeCard;
