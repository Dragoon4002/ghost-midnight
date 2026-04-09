"use client";

import React from "react";
import Navbar from "../Navbar";
import Footer from "../Footer";
import PageTransition from "./PageTransition";

const CoreLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full h-full flex flex-col items-center">
      <Navbar />
      <div className="w-full max-w-6xl">
        <PageTransition>{children}</PageTransition>
      </div>
      <Footer />
    </div>
  );
};

export default CoreLayout;
