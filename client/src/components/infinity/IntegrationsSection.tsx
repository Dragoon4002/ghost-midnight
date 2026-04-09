const categories = [
  {
    title: "Borrow",
    description: "Submit a borrow intent with encrypted max rate. Deposit collateral based on your credit tier.",
  },
  {
    title: "Lend",
    description: "Deposit gUSD at your chosen rate. Your rate is sealed — only Chainlink CRE can read it.",
  },
  {
    title: "Rate Discovery",
    description: "CRE decrypts all rates, builds a tick book, and matches borrowers to the cheapest available lenders.",
  },
  {
    title: "Settlement",
    description: "Matched loans are settled on-chain via the vault. Collateral is locked, funds are transferred privately.",
  },
  {
    title: "Repayment & Credit",
    description: "Repay loans to improve your credit tier. Higher tiers unlock lower collateral requirements.",
  },
];

const IntegrationsSection = () => {
  return (
    <section className="w-full py-16">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Left */}
        <div className="flex-1 max-w-sm space-y-4">
          <span className="text-sm font-semibold text-emerald-400">Protocol Flow</span>
          <h2 className="text-3xl font-semibold text-foreground leading-tight">
            End-to-End Lending Pipeline
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            From intent submission to loan settlement, every step is designed
            for privacy, fairness, and trustless execution.
          </p>
        </div>

        {/* Right - Categories */}
        <div className="flex-1 space-y-6">
          {categories.map((cat) => (
            <div key={cat.title} className="flex items-start justify-between gap-6 py-3 border-b border-border last:border-0">
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-semibold text-foreground">{cat.title}</h3>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end max-w-[180px]">
               
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
