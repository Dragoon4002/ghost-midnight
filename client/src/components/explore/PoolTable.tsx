"use client";

import PoolTableRow from "./PoolTableRow";
import type { PoolRow } from "./data/mockData";

const headers = ["#", "Name", "Lend Intents", "Borrow Intents", "Network", "Contract"];

interface PoolTableProps {
  rows: PoolRow[];
}

const PoolTable = ({ rows }: PoolTableProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-accent/30">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => <PoolTableRow key={row.rank} row={row} />)
          ) : (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                No pools match your filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PoolTable;
