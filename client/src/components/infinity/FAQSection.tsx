"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is Ghost Protocol?",
    a: "Ghost is a private peer-to-peer lending protocol where interest rates are sealed (encrypted) and matched by Chainlink CRE inside confidential compute. No one — not even the server — can see your rate bid.",
  },
  {
    q: "How do sealed-rate auctions work?",
    a: "Lenders encrypt their desired interest rate with the CRE public key using ECIES (secp256k1). Chainlink CRE decrypts all rates, builds a tick-based order book, and fills borrow requests starting from the cheapest available rate.",
  },
  {
    q: "What is discriminatory pricing?",
    a: "Unlike uniform-price auctions, each lender earns the rate they actually bid — not a single clearing rate. This means there's no incentive to game or front-run rates.",
  },
  {
    q: "What tokens does Ghost support?",
    a: "Ghost currently supports gUSD (Ghost USD) for lending and gETH (Ghost ETH) as collateral, both on Sepolia testnet.",
  },
  {
    q: "How does the credit tier system work?",
    a: "Your credit tier determines your collateral multiplier. New users start at Bronze (2x collateral). Repaying loans on time improves your tier: Silver (1.5x), Gold (1.25x), and Platinum (1.1x).",
  },
  {
    q: "What happens if I default on a loan?",
    a: "If a loan isn't repaid by maturity, your collateral is liquidated to repay the lender. Defaults lower your credit tier, increasing future collateral requirements.",
  },
  {
    q: "Can I cancel a borrow or lend intent?",
    a: "Yes, pending intents can be cancelled at any time before they're matched. Sign a Cancel Borrow or Cancel Lend message and the protocol will return your funds.",
  },
  {
    q: "What is Chainlink CRE?",
    a: "Chainlink Confidential Compute Runtime Environment (CRE) is a WASM-based confidential compute platform. Ghost uses CRE workflows to decrypt rates, run the matching engine, and execute loan settlements — all inside a trusted execution environment.",
  },
  {
    q: "How are funds transferred privately?",
    a: "All fund movements (disbursements, collateral returns, liquidations) go through a pool wallet that calls the external vault's private-transfer endpoint. The server queues transfers, and CRE workflows execute and confirm them.",
  },
  {
    q: "Is Ghost available on mainnet?",
    a: "Ghost is currently live on Sepolia testnet. Mainnet deployment is planned after further testing and audits.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full py-16 space-y-8">
      <h2 className="text-3xl font-semibold text-foreground">
        Frequently Asked Questions
      </h2>

      <div className="divide-y divide-border">
        {faqs.map((faq, i) => (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between py-4 text-left cursor-pointer group"
            >
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {faq.q}
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === i && (
              <p className="pb-4 text-sm text-muted-foreground leading-relaxed pl-1">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
