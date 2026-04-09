"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

const FAQ = ({ items }: FAQProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-0">
      <h2 className="text-lg font-semibold text-foreground mb-4">FAQs</h2>

      {items.map((item, index) => (
        <div key={index} className="border-b border-border">
          <button
            onClick={() =>
              setOpenIndex(openIndex === index ? null : index)
            }
            className="w-full flex items-center justify-between py-4 cursor-pointer group"
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
    </div>
  );
};

export default FAQ;
