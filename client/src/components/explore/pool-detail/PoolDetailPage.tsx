"use client";

import { useState, useEffect } from "react";
import { useMidnightWallet } from "@/components/providers/wallet-wrapper";
import { get } from "@/lib/ghost";
import { getTokenMeta, computePoolStats } from "@/lib/pool-utils";
import PoolHeader from "./PoolHeader";
import ReserveStatus from "./ReserveStatus";
import SupplyBorrowInfo from "./SupplyBorrowInfo";
import RateModelPanel from "./RateModelPanel";
import YourPosition from "./YourPosition";
import PoolCharts from "./PoolCharts";
import PoolActionButtons from "./PoolActionButtons";

interface PoolDetailPageProps {
  ticker: string;
}

const PoolDetailPage = ({ ticker }: PoolDetailPageProps) => {
  const meta = getTokenMeta(ticker);
  const collateralTicker = ticker === "gUSD" ? "gETH" : "gUSD";

  const { isConnected, address } = useMidnightWallet();
  const userAddress = address ? address.toLowerCase() : undefined;

  const [stats, setStats] = useState({
    lendCount: 0,
    borrowCount: 0,
    totalSupplied: BigInt(0),
    totalBorrowed: BigInt(0),
    utilization: 0,
  });
  const [userLends, setUserLends] = useState<any[]>([]);
  const [userBorrows, setUserBorrows] = useState<any[]>([]);
  const [userLoans, setUserLoans] = useState<any[]>([]);

  // Fetch pool stats
  useEffect(() => {
    const load = async () => {
      try {
        const data = await get("/api/v1/internal/pending-intents");
        const poolStats = computePoolStats(
          data.lendIntents ?? [],
          data.borrowIntents ?? [],
          meta.address
        );
        setStats(poolStats);
      } catch {
        // silent
      }
    };
    load();
  }, [meta.address]);

  // Fetch user positions
  useEffect(() => {
    if (!isConnected || !userAddress) return;

    const loadUser = async () => {
      try {
        const [lenderData, borrowerData] = await Promise.all([
          get(`/api/v1/lender-status/${userAddress}`),
          get(`/api/v1/borrower-status/${userAddress}`),
        ]);

        const tokenAddr = meta.address.toLowerCase();

        setUserLends(
          (lenderData.lendSlots ?? []).filter(
            (s: any) => s.token?.toLowerCase() === tokenAddr
          )
        );

        setUserBorrows(
          (borrowerData.borrowIntents ?? []).filter(
            (s: any) => s.token?.toLowerCase() === tokenAddr
          )
        );

        setUserLoans(
          (borrowerData.loans ?? lenderData.loans ?? []).filter(
            (l: any) => l.token?.toLowerCase() === tokenAddr
          )
        );
      } catch {
        // silent
      }
    };
    loadUser();
  }, [isConnected, userAddress, meta.address]);

  return (
    <div className="w-full max-w-6xl mx-auto py-10 space-y-8 px-4">
      <PoolHeader
        name={meta.name}
        ticker={meta.symbol}
        iconSrc={meta.iconSrc}
        contractAddress={meta.address}
      />

      <ReserveStatus
        totalSupplied={stats.totalSupplied}
        totalBorrowed={stats.totalBorrowed}
        activeIntents={stats.lendCount + stats.borrowCount}
        utilization={stats.utilization}
        ticker={ticker}
      />

      <SupplyBorrowInfo
        totalSupplied={stats.totalSupplied}
        totalBorrowed={stats.totalBorrowed}
        lendCount={stats.lendCount}
        borrowCount={stats.borrowCount}
        ticker={ticker}
        collateralTicker={collateralTicker}
      />

      <PoolCharts
        totalSupplied={stats.totalSupplied}
        totalBorrowed={stats.totalBorrowed}
        lendCount={stats.lendCount}
        borrowCount={stats.borrowCount}
        utilization={stats.utilization}
        ticker={ticker}
      />

      <RateModelPanel />

      {isConnected && userAddress && (
        <YourPosition
          lendIntents={userLends}
          borrowIntents={userBorrows}
          loans={userLoans}
          ticker={ticker}
        />
      )}

      <PoolActionButtons ticker={ticker} />
    </div>
  );
};

export default PoolDetailPage;
