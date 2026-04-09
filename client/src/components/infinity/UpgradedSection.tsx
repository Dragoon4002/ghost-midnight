import { Check } from "lucide-react";
import StakeCard from "./StakeCard";

const features = [
  ["Sealed-Rate Auctions", "Discriminatory Pricing"],
  ["Credit-Based Collateral", "Private Token Transfers"],
  ["Chainlink CRE Matching", "On-Chain Settlement"],
];

const partners = ["Chainlink", "Sepolia", "EIP-712", "eciesjs"];

const UpgradedSection = () => {
  return (
    <section className="w-full rounded-2xl border border-border bg-card p-10">
      <div className="flex flex-col lg:flex-row gap-10 items-start justify-between">
        {/* Left */}
        <div className="flex-1 space-y-6 max-w-md">
          <span className="text-sm font-semibold text-emerald-400">How It Works</span>
          <h2 className="text-3xl font-semibold text-foreground leading-tight">
            Borrow privately.<br />Lend at your rate.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ghost Protocol uses sealed-rate auctions where lenders submit encrypted
            interest rates. Chainlink CRE decrypts and matches them inside confidential
            compute — no one can front-run or game the rates.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {features.flat().map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* Partners */}
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">Built with:</p>
            <div className="flex items-center gap-6">
              {partners.map((p) => (
                <span key={p} className="text-sm font-semibold text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Stake card */}
        <StakeCard />
      </div>
    </section>
  );
};

export default UpgradedSection;
