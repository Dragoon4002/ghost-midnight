"use client";

const ProvenSection = () => {
  return (
    <section className="w-full py-16 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-sm font-semibold text-emerald-400">Proven</span>
        <h2 className="text-3xl font-semibold text-foreground">
          How the Matching Engine Works
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Ghost uses a tick-based order book for rate discovery. Lenders deposit
          at encrypted rates; Chainlink CRE decrypts, sorts, and fills borrow
          requests at the best available rates.
        </p>
      </div>

      {/* Comparison pills */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
          <div className="text-xs">
            <span className="font-medium text-foreground">Borrower</span>
            <span className="ml-1.5 text-muted-foreground">Submits encrypted max rate</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <div className="h-5 w-5 rounded-full bg-emerald-500" />
          <div className="text-xs">
            <span className="font-medium text-foreground">Lender</span>
            <span className="ml-1.5 text-muted-foreground">Deposits at encrypted rate</span>
          </div>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span className="text-muted-foreground"><span className="font-medium text-foreground">Sealed Bids</span> encrypted with CRE pubkey</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-muted-foreground"><span className="font-medium text-foreground">Matching</span> inside confidential compute</span>
          </div>
        </div>

        {/* Flow visualization */}
        <div className="relative h-48 w-full overflow-hidden rounded-xl">
          <svg viewBox="0 0 600 200" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ghostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Borrow intent flow */}
            <path
              d="M0,180 C50,175 100,160 150,140 C200,120 250,100 300,80 C350,60 400,45 450,35 C500,25 550,20 600,15"
              fill="none"
              stroke="rgb(99, 102, 241)"
              strokeWidth="2"
            />
            {/* Lend offer flow */}
            <path
              d="M0,170 C50,165 100,155 150,145 C200,135 250,120 300,110 C350,100 400,85 450,75 C500,65 550,55 600,50"
              fill="none"
              stroke="rgb(52, 211, 153)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Match point */}
            <circle cx="300" cy="95" r="6" fill="rgb(99, 102, 241)" opacity="0.8" />
            <text x="310" y="92" fill="rgb(156, 163, 175)" fontSize="11">Match</text>
            {/* Settlement area */}
            <path
              d="M300,95 C350,75 400,60 450,50 C500,40 550,32 600,30 L600,200 L300,200 Z"
              fill="url(#ghostGrad)"
            />
          </svg>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Discriminatory pricing: each lender earns their own rate — no gaming possible
        </p>
      </div>
    </section>
  );
};

export default ProvenSection;
