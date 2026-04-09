"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

interface FilterBarProps {
  tokenFilter: string;
  networkFilter: string;
  statusFilter: string;
  search: string;
  onTokenFilterChange: (v: string) => void;
  onNetworkFilterChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onSearchChange: (v: string) => void;
}

const tokenOptions = ["All Tokens", "gUSD", "gETH"];
const networkOptions = ["All Networks", "Sepolia"];
const statusOptions = ["All Status", "Active"];

interface DropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

const FilterDropdown = ({ label, options, value, onChange }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const display = value === options[0] ? label : value;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
          value !== options[0]
            ? "border-[#e2a9f1]/50 bg-[#e2a9f1]/10 text-foreground"
            : "border-border bg-card text-foreground hover:bg-accent"
        }`}
      >
        {display}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-40 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              {opt}
              {value === opt && <Check className="h-3.5 w-3.5 text-[#e2a9f1]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterBar = ({
  tokenFilter,
  networkFilter,
  statusFilter,
  search,
  onTokenFilterChange,
  onNetworkFilterChange,
  onStatusFilterChange,
  onSearchChange,
}: FilterBarProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <FilterDropdown
          label="Token"
          options={tokenOptions}
          value={tokenFilter}
          onChange={onTokenFilterChange}
        />
        <FilterDropdown
          label="Network"
          options={networkOptions}
          value={networkFilter}
          onChange={onNetworkFilterChange}
        />
        <FilterDropdown
          label="Status"
          options={statusOptions}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search pool name or symbol"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-48"
        />
        <kbd className="flex-shrink-0 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">/</kbd>
      </div>
    </div>
  );
};

export default FilterBar;
