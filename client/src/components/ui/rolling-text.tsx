"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface RollingTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}

const smooth: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const RollingText = ({ text, className = "", as: Tag = "span" }: RollingTextProps) => {
  const [key, setKey] = useState(0);
  const prevText = useRef(text);

  useEffect(() => {
    if (text !== prevText.current) {
      setKey((k) => k + 1);
      prevText.current = text;
    }
  }, [text]);

  return (
    <span className={`inline-flex overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${key}-${text}`}
          initial={{ y: "60%", opacity: 0, filter: "blur(3px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-40%", opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: 0.5, ease: smooth }}
          className="inline-block"
        >
          {Tag === "span" ? text : <Tag className={className}>{text}</Tag>}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

interface RollingNumberProps {
  value: string | number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export const RollingNumber = ({ value, className = "", suffix = "", prefix = "" }: RollingNumberProps) => {
  const display = `${prefix}${value}${suffix}`;
  const chars = display.split("");
  const [key, setKey] = useState(0);
  const prevVal = useRef(display);

  useEffect(() => {
    if (display !== prevVal.current) {
      setKey((k) => k + 1);
      prevVal.current = display;
    }
  }, [display]);

  return (
    <span className={`inline-flex overflow-hidden align-bottom ${className}`}>
      {chars.map((char, i) => (
        <RollingChar key={`${key}-${i}`} char={char} delay={i * 0.025} tick={key} />
      ))}
    </span>
  );
};

const RollingChar = ({ char, delay, tick }: { char: string; delay: number; tick: number }) => (
  <span className="inline-flex overflow-hidden">
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={`${tick}-${char}`}
        initial={{ y: "60%", opacity: 0, filter: "blur(2px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: "-40%", opacity: 0, filter: "blur(1px)" }}
        transition={{
          duration: 0.45,
          ease: smooth,
          delay,
        }}
        className="inline-block"
      >
        {char}
      </motion.span>
    </AnimatePresence>
  </span>
);
