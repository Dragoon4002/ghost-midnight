"use client";

const stats = [
  { value: "Private", label: "Sealed-Rate Lending" },
  { value: "Sepolia", label: "Testnet Live" },
  { value: "CRE", label: "Chainlink Powered" },
];

const InfinityHero = () => {
  return (
    <section className="relative w-full overflow-hidden py-16">
      {/* Decorative gradient blob */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-[500px] w-[500px]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 via-yellow-300 to-orange-400 opacity-80 blur-sm" />
        <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-blue-500 via-purple-400 to-pink-400 opacity-70 blur-sm" />
        <div className="absolute inset-16 rounded-full bg-gradient-to-bl from-cyan-300 via-green-300 to-yellow-400 opacity-60 blur-md" />
      </div>

      <div className="relative z-10 max-w-xl space-y-6">
        {/* Badge */}
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm font-medium text-muted-foreground">Ghost Protocol</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-semibold leading-tight tracking-tight text-foreground">
          Private P2P Lending<br />with Sealed Rates
        </h1>

        {/* Subtitle */}
        <p className="text-base text-muted-foreground leading-relaxed max-w-md">
          The first lending protocol where rates are encrypted, matched
          confidentially by Chainlink CRE, and settled on-chain — no one
          sees your bid.
        </p>

        {/* Stats */}
        <div className="flex items-center gap-10 pt-2">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InfinityHero;
