import Link from "next/link";

interface PoolActionButtonsProps {
  ticker: string;
}

const PoolActionButtons = ({ ticker }: PoolActionButtonsProps) => {
  return (
    <div className="flex gap-4">
      <Link
        href={`/?tab=Lend`}
        className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#e2a9f1] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#d48ee6]"
      >
        Lend {ticker}
      </Link>
      <Link
        href={`/?tab=Borrow`}
        className="flex-1 inline-flex items-center justify-center rounded-lg border border-[#e2a9f1] px-6 py-3 text-sm font-semibold text-[#e2a9f1] transition-colors hover:bg-[#e2a9f1]/10"
      >
        Borrow {ticker}
      </Link>
    </div>
  );
};

export default PoolActionButtons;
