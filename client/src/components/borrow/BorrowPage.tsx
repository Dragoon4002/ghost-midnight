"use client";

import BorrowCard from "./BorrowCard";

const BorrowPage = () => {
  return (
    <div className="w-full max-w-xl mx-auto py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium text-foreground">
          Borrow with Privacy
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit a private borrow intent. Your max rate is encrypted and only
          revealed inside the CRE settlement engine.
        </p>
      </div>
      <BorrowCard />
    </div>
  );
};

export default BorrowPage;
