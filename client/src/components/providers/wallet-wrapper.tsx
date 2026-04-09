"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import "@midnight-ntwrk/dapp-connector-api";

function getAllWallets(midnight: Record<string, any>): any[] {
  const wallets: any[] = [];
  for (const key of Object.keys(midnight)) {
    const entry = midnight[key];
    if (entry?.name && entry?.apiVersion) {
      wallets.push(entry);
    }
  }
  // Fallback for older versions
  if (wallets.length === 0 && midnight.mnLace) {
    wallets.push(midnight.mnLace);
  }
  return wallets;
}

function waitForMidnight(networkId: string, timeout = 10000, interval = 200): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let resolved = false;
    const check = async () => {
      if (resolved) return;
      const m = (window as any).midnight;
      if (m) {
        const wallets = getAllWallets(m);
        if (wallets.length > 0) {
          console.log("[wallet] found wallets:", wallets.map(w => `${w.name} (${w.apiVersion})`));
          // Try each wallet — use the one that connects to the target network
          for (const wallet of wallets) {
            try {
              console.log(`[wallet] trying ${wallet.name} for network "${networkId}"...`);
              const api = await wallet.connect(networkId);
              resolved = true;
              return resolve({ wallet, api });
            } catch {
              console.log(`[wallet] ${wallet.name} rejected "${networkId}"`);
            }
          }
        }
      }
      if (Date.now() - start >= timeout)
        return reject(new Error("No wallet supports the target network. Is the extension installed and on the right network?"));
      setTimeout(check, interval);
    };
    check();
  });
}

interface MidnightWalletState {
  connectedApi: any | null;
  isConnected: boolean;
  address: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const MidnightWalletContext = createContext<MidnightWalletState>({
  connectedApi: null,
  isConnected: false,
  address: "",
  connect: async () => {},
  disconnect: () => {},
});

export const useMidnightWallet = () => useContext(MidnightWalletContext);

const MidnightWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [connectedApi, setConnectedApi] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState("");

  const connect = useCallback(async () => {
    try {
      const networkId = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID || "preprod";
      console.log("[wallet] searching for wallet supporting", networkId, "...");
      const { wallet, api } = await waitForMidnight(networkId);
      console.log("[wallet] connected via", wallet.name, "api methods:", Object.keys(api));

      console.log("[wallet] fetching unshielded address...");
      const result = await api.getUnshieldedAddress();
      console.log("[wallet] getUnshieldedAddress result:", result);

      const { unshieldedAddress } = result;

      // Log wallet's configured endpoints
      const config = await api.getConfiguration();
      console.log("[wallet] configuration:", config);

      setConnectedApi(api);
      setAddress(unshieldedAddress);
      setIsConnected(true);
      console.log("[wallet] fully connected, address:", unshieldedAddress);
    } catch (error) {
      console.error("[wallet] connection failed:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectedApi(null);
    setAddress("");
    setIsConnected(false);
  }, []);

  return (
    <MidnightWalletContext.Provider value={{ connectedApi, isConnected, address, connect, disconnect }}>
      {children}
    </MidnightWalletContext.Provider>
  );
};

export default MidnightWalletProvider;
