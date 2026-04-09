"use client";

import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { Copy, Check, ExternalLink } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

const PFP_COUNT = 3;

interface ProfileHeaderProps {
  address: string;
  tier: string;
  multiplier: number;
  loansRepaid: number;
  loansDefaulted: number;
}

const MAINNET_RPC = "https://ethereum-rpc.publicnode.com";

const tierConfig: Record<string, {
  text: string;
  badge: string;
  next: string;
  threshold: number;
  nextThreshold: number;
  barColor: string;
}> = {
  bronze: {

    text: "text-orange-400",
    badge: "text-orange-400 border-orange-400/30",
    next: "Silver",
    threshold: 0,
    nextThreshold: 5,
    barColor: "linear-gradient(90deg, #f97316, #fb923c)",
  },
  silver: {

    text: "text-zinc-300",
    badge: "text-zinc-300 border-zinc-400/30",
    next: "Gold",
    threshold: 5,
    nextThreshold: 15,
    barColor: "linear-gradient(90deg, #a1a1aa, #d4d4d8)",
  },
  gold: {

    text: "text-yellow-400",
    badge: "text-yellow-400 border-yellow-500/30",
    next: "Max",
    threshold: 15,
    nextThreshold: 15,
    barColor: "linear-gradient(90deg, #eab308, #f59e0b)",
  },
};

const ProfileHeader = ({ address, tier, multiplier, loansRepaid, loansDefaulted }: ProfileHeaderProps) => {
  const [copied, setCopied] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const pfp = useMemo(() => `/pfp/${Math.floor(Math.random() * PFP_COUNT) + 1}.jpg`, []);
  const config = tierConfig[tier] ?? tierConfig.bronze;
  const repScore = Math.max(0, loansRepaid * 10 - loansDefaulted * 25);
  const progress = tier === "gold"
    ? 100
    : Math.min(100, ((loansRepaid - config.threshold) / (config.nextThreshold - config.threshold)) * 100);

  useEffect(() => {
    if (!address) return;
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    provider.lookupAddress(address).then((name) => {
      if (name) setEnsName(name);
    }).catch(() => {});
  }, [address]);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayName = ensName ?? `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Identity */}
        <div className="flex items-center gap-4">
          <Image
            src={pfp}
            alt="avatar"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-mono">
                {displayName}
              </h1>
              <Badge variant="outline" className="text-[10px]">Sepolia</Badge>
              <Badge variant="outline" className={config.badge}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              {ensName && (
                <span className="text-xs text-muted-foreground font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              )}
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={`https://sepolia.etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Etherscan
              </a>
            </div>
          </div>
        </div>

        {/* Right: Rep + Tier Progress */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Rep Score</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{repScore}</p>
          </div>

          <div className="h-10 w-px bg-border" />

          <div className="min-w-[160px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold capitalize ${config.text}`}>
                {multiplier}x collateral
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%`, background: config.barColor }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {tier === "gold" ? "Max tier" : `${Math.round(progress)}% to ${config.next}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
