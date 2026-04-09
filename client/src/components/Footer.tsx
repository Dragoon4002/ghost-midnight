"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const faqItems = [
  {
    question: "What is GHOST Protocol?",
    answer:
      "GHOST is a private peer-to-peer lending protocol built on Chainlink CRE. Lenders and borrowers submit sealed rate bids that are encrypted and only decrypted inside confidential compute — no one, not even the server, can see your rates.",
  },
  {
    question: "How are lending rates determined?",
    answer:
      "Rates are discovered through a sealed, discriminatory-price auction. Lenders set their own rates (encrypted with CRE's public key). Borrowers set a max rate. CRE matches cheapest lenders to largest borrowers. Each lender earns their own bid rate — no averaging.",
  },
  {
    question: "What happens to my funds when I deposit?",
    answer:
      "Funds are deposited into the Chainlink Compliant Private Transfer vault and then privately transferred to the GHOST pool. All movements use shielded addresses — amounts and participants are hidden on-chain.",
  },
  {
    question: "How does collateral and liquidation work?",
    answer:
      "Borrowers post collateral (e.g. gETH) before submitting a borrow intent. If the loan becomes undercollateralized, CRE detects it and seizes collateral. Higher-rate lenders absorb losses first, protecting conservative lenders.",
  },
  {
    question: "What tokens are supported?",
    answer:
      "GHOST currently supports gUSD for lending/borrowing and gETH as collateral, operating on Sepolia testnet via the Chainlink Compliant Private Transfer vault.",
  },
  {
    question: "Is GHOST safe?",
    answer:
      "GHOST leverages Chainlink CRE (Confidential Compute) so that rate logic runs inside a trusted execution environment. The server is 'dumb storage' — it cannot read rates or manipulate matching. All fund movements go through the Chainlink vault with EIP-712 signature auth.",
  },
];

const Footer = () => {
  const pathname = usePathname();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (pathname === "/infinity") return null;

  return (
    <footer className="w-full max-w-xl mx-auto py-10">
      <h2 className="text-lg font-semibold text-foreground mb-4">FAQs</h2>

      {faqItems.map((item, index) => (
        <div key={index} className="border-b border-border">
          <button
            onClick={() =>
              setOpenIndex(openIndex === index ? null : index)
            }
            className="w-full flex items-center justify-between py-4 cursor-pointer"
          >
            <span className="text-sm font-medium text-foreground text-left">
              {item.question}
            </span>
            <Plus className="w-4 h-4 text-indigo-500 shrink-0 ml-4" />
          </button>

          {openIndex === index && (
            <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </footer>
  );
};

export default Footer;
