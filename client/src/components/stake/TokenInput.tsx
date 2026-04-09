"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { COINS } from "@/lib/constants";

interface TokenInputProps {
  label: string;
  token: string;
  tokenIcon: React.ReactNode;
  value: string;
  usdValue: string;
  onChange?: (value: string) => void;
  onTokenChange?: (token: string) => void;
  hasDropdown?: boolean;
  readOnly?: boolean;
}

const tokenIcons: Record<string, React.ReactNode> = {
  gUSD: <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400" />,
  gETH: <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />,
};

const TokenInput = ({
  label,
  token,
  tokenIcon,
  value,
  usdValue,
  onChange,
  onTokenChange,
  hasDropdown = false,
  readOnly = false,
}: TokenInputProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="bg-muted/50 rounded-xl px-5 py-4">
      <div className="text-sm text-muted-foreground mb-3">{label}</div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
            placeholder="0"
            className="bg-transparent text-3xl font-medium text-foreground outline-none w-full placeholder:text-muted-foreground/60"
          />
          <div className="text-xs text-muted-foreground mt-1.5">
            ${usdValue}
          </div>
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => hasDropdown && setOpen(!open)}
            className={`flex items-center gap-2 bg-background/60 rounded-full px-3.5 py-2 border border-border transition-colors ${
              hasDropdown ? "hover:border-muted-foreground/50 cursor-pointer" : "cursor-default"
            }`}
          >
            {tokenIcon}
            <span className="text-base font-semibold text-foreground">
              {token}
            </span>
            {hasDropdown && (
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            )}
          </button>

          {open && hasDropdown && (
            <div className="absolute top-full right-0 mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
              {COINS.map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    onTokenChange?.(coin.symbol);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {tokenIcons[coin.symbol]}
                    <span className="font-medium">{coin.symbol}</span>
                    <span className="text-xs text-muted-foreground">{coin.name}</span>
                  </div>
                  {token === coin.symbol && <Check className="h-3.5 w-3.5 text-[#e2a9f1]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenInput;
