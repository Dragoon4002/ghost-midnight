"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import { COINS } from "@/lib/constants";
import PoolDetailPage from "@/components/explore/pool-detail/PoolDetailPage";

const VALID_TICKERS = COINS.map((c) => c.symbol);

export default function PoolDetail({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);

  if (!VALID_TICKERS.includes(ticker)) {
    redirect("/explore");
  }

  return <PoolDetailPage ticker={ticker} />;
}
