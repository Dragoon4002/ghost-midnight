"use client";

import { useState } from "react";
import { useMidnightWallet } from "@/components/providers/wallet-wrapper";

const ConnectWalletButton = () => {
  const { isConnected, address, connect, disconnect } = useMidnightWallet();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (isConnected) {
      disconnect();
      return;
    }
    setConnecting(true);
    setError("");
    try {
      await connect();
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  const shortAddress = address
    ? `${address.slice(0, 10)}...${address.slice(-4)}`
    : "";

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={connecting}
        className="w-full text-gray-900 font-medium py-4 rounded-2xl transition-colors cursor-pointer text-lg disabled:opacity-60"
        style={{ backgroundColor: "#e2a9f1" }}
      >
        {connecting
          ? "Connecting..."
          : isConnected
          ? shortAddress || "Disconnect"
          : "Connect Wallet"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
};

export default ConnectWalletButton;
