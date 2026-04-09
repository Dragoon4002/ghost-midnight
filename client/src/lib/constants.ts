export const SERVER =
  process.env.NEXT_PUBLIC_GHOST_API_URL || "http://localhost:8080";
export const EXTERNAL_API = "https://convergence2026-token-api.cldev.cloud";

// Pool address fetched from server at runtime
export let POOL_ADDRESS = "";

export async function fetchPoolAddress() {
  if (POOL_ADDRESS) return POOL_ADDRESS;
  const res = await fetch(`${SERVER}/health`);
  const data = await res.json();
  POOL_ADDRESS = data.poolAddress;
  return POOL_ADDRESS;
}

export type Coin = { symbol: string; name: string };

export const COINS: Coin[] = [
  { symbol: "gUSD", name: "Ghost USD" },
  { symbol: "gETH", name: "Ghost ETH" },
];
