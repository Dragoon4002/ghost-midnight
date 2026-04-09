"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import TabSwitcher from "./TabSwitcher";
import BorrowCard from "../borrow/BorrowCard";
import LendCard from "../lend/LendCard";
import StatusTab from "../status/StatusTab";

const headings: Record<string, { title: string; desc: string }> = {
  Borrow: {
    title: "Borrow with Privacy",
    desc: "Submit a private borrow intent. Your max rate is encrypted and only revealed inside the CRE settlement engine.",
  },
  Lend: {
    title: "Lend privately on GHOST",
    desc: "Set your rate, deposit funds. Rates are sealed \u2014 only matched inside CRE confidential compute.",
  },
  Status: {
    title: "Your Positions",
    desc: "Track your active intents, loans, and payouts in real time.",
  },
};

const StakePage = () => {
  const [activeTab, setActiveTab] = useState("Borrow");

  const h = headings[activeTab] ?? headings.Borrow;

  return (
    <div className="w-full max-w-xl mx-auto py-10 space-y-8">
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ y: 8, opacity: 0, filter: "blur(2px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -8, opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h1 className="text-2xl font-medium text-foreground">{h.title}</h1>
            <p className="text-sm text-muted-foreground">{h.desc}</p>
          </div>

          {activeTab === "Borrow" && <BorrowCard />}
          {activeTab === "Lend" && <LendCard />}
          {activeTab === "Status" && <StatusTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default StakePage;
