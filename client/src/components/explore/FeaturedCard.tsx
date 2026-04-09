import Link from "next/link";
import type { FeaturedPool } from "./data/mockData";

const FeaturedCard = ({ pool }: { pool: FeaturedPool }) => {
  return (
    <Link
      href={`/explore/${pool.ticker}`}
      className="flex-shrink-0 w-[270px] rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-5 cursor-pointer transition-colors hover:border-zinc-600"
    >
      {/* Top: icon + name/ticker */}
      <div className="flex items-center gap-3">
        <img
          src={pool.iconSrc}
          alt={pool.ticker}
          className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{pool.name}</p>
          <p className="text-xs text-muted-foreground">{pool.ticker}</p>
        </div>
      </div>

      {/* Bottom: status */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
          Active Pool
        </span>
        <span className="text-xs text-muted-foreground">Sepolia</span>
      </div>
    </Link>
  );
};

export default FeaturedCard;
