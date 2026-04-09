"use client";

import { motion } from "motion/react";

const tabs = ["Borrow", "Lend", "Status"];

interface TabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabSwitcher = ({ activeTab, onTabChange }: TabSwitcherProps) => {
  return (
    <div className="flex items-center bg-card border border-border rounded-full p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`relative flex-1 px-6 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === tab
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="tab-pill"
              className="absolute inset-0 bg-muted rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );
};

export default TabSwitcher;
