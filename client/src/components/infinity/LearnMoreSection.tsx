const articles = [
  {
    title: "Ghost Protocol: Private P2P Lending Explained",
    description: "How sealed-rate auctions and Chainlink CRE enable trustless, private lending.",
   
  },
  {
    title: "Credit Tiers & Collateral: How Reputation Works",
    description: "Repay loans to move from Bronze (2x) to Platinum (1.1x) collateral requirements.",
  },
];

const LearnMoreSection = () => {
  return (
    <section className="w-full py-16">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        <h2 className="text-3xl font-semibold text-foreground leading-tight flex-shrink-0">
          Learn more about Ghost
        </h2>

        <div className="flex-1 space-y-4">
          {articles.map((article) => (
            <a
              key={article.title}
              href="#"
              className="flex items-center gap-5 rounded-xl border border-border p-4 transition-colors hover:bg-accent/50 cursor-pointer group"
            >
              

              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-muted-foreground">{article.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearnMoreSection;
