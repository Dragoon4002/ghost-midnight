import { nanoid } from 'nanoid';
import * as store from './store.js';
import type { LendIntent, BorrowIntent } from './store.js';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * Uniform clearing rate matching, simplified v0.
 *
 * Algorithm (mirror of ghost-protocol.md §7, no partial splits):
 *   1. lends  = open LendIntents sorted by rMin asc
 *   2. borrows = open BorrowIntents sorted by rMax desc
 *   3. candidates = sorted distinct union of all rMin + rMax
 *   4. for each r in candidates:
 *        supply(r) = Σ lends.amount where rMin ≤ r
 *        demand(r) = Σ borrows.amount where rMax ≥ r
 *        matched(r) = min(supply, demand)
 *   5. r* = argmax matched (tie-break: lowest r)
 *   6. greedy pair lends × borrows. v0: only match pairs where a single
 *      lend can fully cover a single borrow's amount. No splitting.
 *
 * This means some matches from the theoretical r* may be skipped, but every
 * loan that IS created is a clean 1:1 pair at r*. Good enough for v0 demo.
 */
export function runEpoch(): void {
  const lends = store.findOpenLendsSortedByRMin();
  const borrows = store.findOpenBorrowsSortedByRMaxDesc();

  if (lends.length === 0 || borrows.length === 0) {
    return;
  }

  logger.debug(
    { lends: lends.length, borrows: borrows.length },
    'epoch: scanning open intents',
  );

  // Build candidate rate set
  const candidates = new Set<number>();
  for (const l of lends) candidates.add(l.rMin);
  for (const b of borrows) candidates.add(b.rMax);
  const sortedRates = Array.from(candidates).sort((a, b) => a - b);

  // Find r* that maximizes matched volume
  let bestR: number | null = null;
  let bestMatched = 0n;
  for (const r of sortedRates) {
    const supply = lends
      .filter((l) => l.rMin <= r)
      .reduce((s, l) => s + BigInt(l.amount), 0n);
    const demand = borrows
      .filter((b) => b.rMax >= r)
      .reduce((s, b) => s + BigInt(b.amount), 0n);
    const m = supply < demand ? supply : demand;
    if (m > bestMatched) {
      bestMatched = m;
      bestR = r;
    }
  }

  if (bestR === null || bestMatched === 0n) {
    return;
  }

  logger.debug({ rStar: bestR, volume: bestMatched.toString() }, 'epoch: r* found');

  // Greedy pair: cheapest lenders × highest-rMax borrowers
  const eligibleLends = lends.filter((l) => l.rMin <= bestR!);
  const eligibleBorrows = borrows.filter((b) => b.rMax >= bestR!);

  const usedLends = new Set<string>();
  const usedBorrows = new Set<string>();

  for (const lend of eligibleLends) {
    if (usedLends.has(lend.intentId)) continue;
    const lendAmt = BigInt(lend.amount);

    // V0: find a borrow with exactly same or smaller amount (no splitting).
    // Prefer equal amount; fall back to smaller (lender keeps extra capacity
    // open for next epoch).
    let pair: BorrowIntent | null = null;
    for (const borrow of eligibleBorrows) {
      if (usedBorrows.has(borrow.intentId)) continue;
      const borrowAmt = BigInt(borrow.amount);
      if (borrowAmt === lendAmt) {
        pair = borrow;
        break;
      }
    }
    // Fallback: any borrow <= lend (partial capture of lend)
    if (!pair) {
      for (const borrow of eligibleBorrows) {
        if (usedBorrows.has(borrow.intentId)) continue;
        const borrowAmt = BigInt(borrow.amount);
        if (borrowAmt <= lendAmt) {
          pair = borrow;
          break;
        }
      }
    }
    if (!pair) continue;

    // V0 simplification: match at the borrow's amount. Both intents close
    // fully (the lender's excess capacity is dropped on the floor for v0).
    const principal = BigInt(pair.amount);
    createLoan(lend, pair, principal, bestR);
    usedLends.add(lend.intentId);
    usedBorrows.add(pair.intentId);
  }
}

function createLoan(
  lend: LendIntent,
  borrow: BorrowIntent,
  principal: bigint,
  rate: number,
): void {
  const loanId = `loan_${nanoid(12)}`;

  store.createLoan({
    loanId,
    lender: lend.lender,
    borrower: borrow.borrower,
    principal: principal.toString(),
    rate,
    lendIntentId: lend.intentId,
    borrowIntentId: borrow.intentId,
  });

  store.markLendMatched(lend.intentId, loanId);
  store.markBorrowMatched(borrow.intentId, loanId);

  logger.match(
    {
      loanId,
      lender: lend.lender,
      borrower: borrow.borrower,
      principal: principal.toString(),
      rate,
      lendIntentId: lend.intentId,
      borrowIntentId: borrow.intentId,
    },
    `intent matched: ${principal} @ ${rate}bps`,
  );
}

export function startMatchingEngine(): NodeJS.Timeout {
  logger.info({ epochMs: config.epochMs }, 'matching engine started');
  return setInterval(() => {
    try {
      runEpoch();
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'epoch tick failed');
    }
  }, config.epochMs);
}
