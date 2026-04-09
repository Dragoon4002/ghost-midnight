"use client";

import { ShieldCheck, Layers, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";

const items = [
  {
    icon: ShieldCheck,
    title: "Sealed Bids",
    desc: "Lenders and borrowers submit encrypted rate bids. Nobody — not even the server — can read them.",
  },
  {
    icon: Layers,
    title: "Tick Matching",
    desc: "Chainlink CRE decrypts bids inside confidential compute, matches supply & demand at the clearing rate.",
  },
  {
    icon: Eye,
    title: "Privacy Preserved",
    desc: "Individual rates are never revealed. Only the matched clearing rate is published on settlement.",
  },
];

const RateModelPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Discovery Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          GHOST uses a sealed-bid tick auction for rate discovery, powered by
          Chainlink CRE confidential compute.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i, duration: 0.4 }}
              className="space-y-2 rounded-lg border border-border p-4"
            >
              <item.icon className="h-5 w-5 text-[#e2a9f1]" />
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RateModelPanel;
