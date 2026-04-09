import { type Coin, COINS } from "./constants";

export function getTokenMeta(ticker: string): Coin & { iconSrc: string } {
  const coin = COINS.find((c) => c.symbol === ticker);
  if (!coin) throw new Error(`Unknown ticker: ${ticker}`);
  return { ...coin, iconSrc: `/${ticker.toLowerCase()}.png` };
}

export function formatTokenAmount(wei: string | bigint): string {
  const n = Number(BigInt(wei)) / 1e18;
  if (n === 0) return "0";
  if (n < 0.01) return "<0.01";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function computePoolStats(
  lendIntents: any[],
  borrowIntents: any[],
  _tokenSymbol: string
) {
  const lends = lendIntents;
  const borrows = borrowIntents;

  const totalSupplied = lends.reduce(
    (sum: bigint, i: any) => sum + BigInt(i.amount ?? "0"),
    BigInt(0)
  );
  const totalBorrowed = borrows.reduce(
    (sum: bigint, i: any) => sum + BigInt(i.amount ?? "0"),
    BigInt(0)
  );

  const utilization =
    totalSupplied > BigInt(0)
      ? Number((totalBorrowed * BigInt(10000)) / totalSupplied) / 100
      : 0;

  return {
    lendCount: lends.length,
    borrowCount: borrows.length,
    totalSupplied,
    totalBorrowed,
    utilization: Math.min(utilization, 100),
  };
}
