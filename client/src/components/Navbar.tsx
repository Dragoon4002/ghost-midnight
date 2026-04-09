"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMidnightWallet } from "@/components/providers/wallet-wrapper";
import { useNotifications } from "@/hooks/useNotifications";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Dungeon", href: "/infinity" },
  { label: "Profile", href: "/profile" }
];

const moreLinks = [
  { label: "Research", href: "#", external: true },
  { label: "Litepaper", href: "#", external: true },
  { label: "Docs", href: "#", external: true },
  { label: "Careers", href: "https://tattered-elm-7ca.notion.site/Careers-at-Ghost-Finance-31c9eec45dff80b8989fdf81a7373b12", external: true },
  { label: "Dark Dimension", href: "#", external: false, comingSoon: true },
];

const Navbar = () => {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { connect, disconnect, isConnected, address } = useMidnightWallet();
  const [connecting, setConnecting] = useState(false);

  const walletAddress = address;
  const { notifications, unreadCount, markAllRead } = useNotifications(
    isConnected ? walletAddress?.toLowerCase() : undefined
  );

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (err) {
      console.error("[Navbar] connect failed:", err);
    } finally {
      setConnecting(false);
    }
  };

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full">
      <div className="w-full flex items-center justify-between px-10 py-3">
        {/* Left section: Logo + Nav */}
        <div className="flex items-center gap-1">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <Image
              src="/ghost-logo1.png"
              alt="Ghost"
              width={70}
              height={28}

            />
          </div>

          {/* Nav Items
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-foreground rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}

            {/* More Dropdown 
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                More
                {moreOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden origin-top-left"
                  >
                    <div className="py-2">
                      {moreLinks.map((link, i) => (
                        <motion.a
                          key={link.label}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.15 }}
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noopener noreferrer" : undefined}
                          className="flex items-center gap-1.5 px-5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          {"comingSoon" in link && link.comingSoon ? (
                            <div>
                              <div>{link.label}</div>
                              <div className="text-[10px] text-muted-foreground">coming soon</div>
                            </div>
                          ) : (
                            <>
                              {link.label}
                              {link.external && (
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              )}
                            </>
                          )}
                        </motion.a>
                      ))}
                    </div>

                    {/* Social icons 
                    <div className="border-t border-border px-5 py-3 flex items-center gap-4">
                      <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav> */}
        </div>

        {/* Right section: Notifications + Connect */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute top-full right-0 mt-2 w-96 max-h-[480px] overflow-y-auto scrollbar-none bg-card/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 origin-top-right" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="divide-y divide-border">
                    {notifications.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No notifications yet
                      </div>
                    )}
                    {notifications.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.15 }}
                        className="px-5 py-3.5 flex gap-3 transition-colors hover:bg-muted/30"
                      >
                      {/* Icon */}
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground">
                        <Bell className="w-4 h-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{n.title}</span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[11px] text-muted-foreground/60 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isConnected ? (
            <button
              onClick={disconnect}
              className="text-gray-900 px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
              style={{ backgroundColor: "#e2a9f1" }}
            >
              {walletAddress
                ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}`
                : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="text-gray-900 px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: "#e2a9f1" }}
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
