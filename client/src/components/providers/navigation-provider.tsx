"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Page = "Stake" | "Infinity" | "Explore";

interface NavigationContextValue {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<Page>("Stake");

  return (
    <NavigationContext.Provider value={{ activePage, setActivePage }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
