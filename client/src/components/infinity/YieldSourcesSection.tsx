const sources = [
  { label: "Sealed Rates", sublabel: "eciesjs encryption", value: "Private", width: "w-[30%]", color: "bg-indigo-600" },
  { label: "CRE Matching", sublabel: "Chainlink Confidential", value: "Secure", width: "w-[25%]", color: "bg-teal-600" },
  { label: "Credit Tiers", sublabel: "On-chain reputation", value: "Fair", width: "w-[22%]", color: "bg-purple-600" },
  { label: "On-Chain Settlement", sublabel: "Vault + ERC-20", value: "Trustless", width: "w-[23%]", color: "bg-blue-600" },
];

const YieldSourcesSection = () => {
  return (
    <section className="w-full py-16 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-sm font-semibold text-emerald-400">Architecture</span>
        <h2 className="text-3xl font-semibold text-foreground">
          How Ghost Keeps Lending Private
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Four layers of privacy and fairness power every Ghost loan.
        </p>
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
        {/* Labels row */}
        <div className="flex items-end">
          {sources.map((s) => (
            <div key={s.label} className={`${s.width} text-center`}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="flex items-end gap-2 h-32">
          {sources.map((s, i) => (
            <div key={s.label} className={`${s.width} flex flex-col items-center gap-2`}>
              <div
                className={`w-full rounded-xl ${s.color} flex items-center justify-center ${
                  i === 0 ? "h-32" : i === 1 ? "h-28" : i === 2 ? "h-24" : "h-28"
                }`}
              >
                <span className="text-sm font-semibold text-white">{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sublabels */}
        <div className="flex items-start">
          {sources.map((s) => (
            <div key={s.label} className={`${s.width} text-center`}>
              {s.sublabel && (
                <p className="text-[10px] text-muted-foreground">{s.sublabel}</p>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-emerald-400 cursor-pointer hover:underline">
          Read the full architecture docs
        </p>
      </div>
    </section>
  );
};

export default YieldSourcesSection;
