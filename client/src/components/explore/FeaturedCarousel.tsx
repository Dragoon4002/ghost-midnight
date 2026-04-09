"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { featuredPools } from "./data/mockData";
import FeaturedCard from "./FeaturedCard";

const FeaturedCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 290;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground">
          Featured Pools
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide"
      >
        {featuredPools.map((pool) => (
          <FeaturedCard key={pool.ticker} pool={pool} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedCarousel;
