"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface Coin {
  symbol: string;
  name: string;
  address: string;
}

interface CoinSelectorProps {
  coins: Coin[];
  selected: Coin;
  onSelect: (coin: Coin) => void;
  label: string;
}

const CoinIcon = ({ symbol }: { symbol: string }) => (
  <img
    src={symbol === "gUSD" ? "/gusd.png" : "/geth.png"}
    alt={symbol}
    className="w-5 h-5 rounded-full object-cover"
  />
);

const CoinSelector = ({ coins, selected, onSelect, label }: CoinSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 border border-border hover:border-muted-foreground/50 transition-colors cursor-pointer w-full"
      >
        <CoinIcon symbol={selected.symbol} />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">
          {selected.symbol}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {coins.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => {
                onSelect(coin);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-accent transition-colors cursor-pointer ${
                selected.symbol === coin.symbol
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              <CoinIcon symbol={coin.symbol} />
              <span>{coin.symbol}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {coin.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoinSelector;
