"use client";

import { useRouter } from "next/navigation";
import type { PoolRow } from "./data/mockData";
import { gUSD, gETH } from "@/lib/constants";

const contractAddress = (ticker: string) => {
  if (ticker === "gUSD") return gUSD;
  if (ticker === "gETH") return gETH;
  return "";
};

const PoolTableRow = ({ row }: { row: PoolRow }) => {
  const router = useRouter();
  const address = contractAddress(row.ticker);

  return (
    <tr
      className="border-b border-border transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => router.push(`/explore/${row.ticker}`)}
    >
      <td className="py-4 px-4 text-sm text-muted-foreground">{row.rank}</td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <img
            src={row.iconSrc}
            alt={row.ticker}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.ticker}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-sm font-medium text-emerald-500">
        {row.lendIntents}
      </td>
      <td className="py-4 px-4 text-sm font-medium text-foreground">
        {row.borrowIntents}
      </td>
      <td className="py-4 px-4 text-sm text-foreground">
        Sepolia
      </td>
      <td className="py-4 px-4 text-xs text-muted-foreground font-mono">
        {address.slice(0, 6)}...{address.slice(-4)}
      </td>
    </tr>
  );
};

export default PoolTableRow;
