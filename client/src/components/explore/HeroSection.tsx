"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/ghost";

const HeroSection = () => {
  const [stats, setStats] = useState({ lends: 0, borrows: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await get("/api/v1/internal/pending-intents");
        setStats({
          lends: data.lendIntents?.length ?? 0,
          borrows: data.borrowIntents?.length ?? 0,
        });
      } catch {
        // silent
      }
    };
    load();
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl p-10 text-white">
      <img
        src="/banner.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Explore GHOST Pools
        </h1>
        <p className="max-w-lg text-base text-white/80">
          Browse private lending and borrowing pools. Rates are sealed and
          settled inside Chainlink CRE confidential compute.
        </p>

        <div className="flex items-center gap-8 pt-2">
          <div>
            <p className="text-2xl font-bold">2</p>
            <p className="text-sm text-white/60">Pools Available</p>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="text-2xl font-bold">{stats.lends}</p>
            <p className="text-sm text-white/60">Active Lend Intents</p>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="text-2xl font-bold">{stats.borrows}</p>
            <p className="text-sm text-white/60">Active Borrow Intents</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
