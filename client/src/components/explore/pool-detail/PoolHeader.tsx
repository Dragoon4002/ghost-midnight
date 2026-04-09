"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PoolHeaderProps {
  name: string;
  ticker: string;
  iconSrc: string;
  contractAddress: string;
}

const PoolHeader = ({ name, ticker, iconSrc, contractAddress }: PoolHeaderProps) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Explore
      </Link>

      <div className="flex items-center gap-4">
        <img
          src={iconSrc}
          alt={ticker}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{name}</h1>
            <Badge variant="outline">Sepolia</Badge>
          </div>
          <button
            onClick={copyAddress}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoolHeader;
