/**
 * JSON-file-backed persistence for v0.
 *
 * Single in-memory snapshot persisted to disk on every mutation via
 * atomic rename. Node is single-threaded so no locking needed.
 *
 * MongoDB / Mongoose models in ./db.ts and ./models/* are kept intentionally
 * as dead code for future swap-in. Nothing imports them in v0.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export type LendIntentStatus = 'open' | 'matched' | 'cancelled';
export type BorrowIntentStatus = 'open' | 'matched' | 'cancelled';
export type LoanStatus = 'awaiting-settlement' | 'active' | 'failed';

export interface LendIntent {
  intentId: string;
  lender: string;
  amount: string;          // BigInt as string, microNIGHT
  rMin: number;            // basis points
  status: LendIntentStatus;
  matchedLoanId?: string;
  createdAt: string;       // ISO
  matchedAt?: string;
}

export interface BorrowIntent {
  intentId: string;
  borrower: string;
  amount: string;
  rMax: number;
  collateral: string;
  status: BorrowIntentStatus;
  matchedLoanId?: string;
  createdAt: string;
  matchedAt?: string;
}

export interface Loan {
  loanId: string;
  lender: string;
  borrower: string;
  principal: string;
  rate: number;
  lendIntentId: string;
  borrowIntentId: string;
  status: LoanStatus;
  createdAt: string;
  settledAt?: string;
  settlementTxId?: string;
}

interface Snapshot {
  lends: LendIntent[];
  borrows: BorrowIntent[];
  loans: Loan[];
}

let db: Snapshot = { lends: [], borrows: [], loans: [] };
let dataFile = '';
let initialized = false;

export function initStore(filePath: string): void {
  dataFile = path.resolve(filePath);
  const dir = path.dirname(dataFile);
  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    db = {
      lends: parsed.lends ?? [],
      borrows: parsed.borrows ?? [],
      loans: parsed.loans ?? [],
    };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      fs.mkdirSync(dir, { recursive: true });
      persist();
    } else {
      throw err;
    }
  }
  initialized = true;
}

function persist(): void {
  const tmp = dataFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, dataFile);
}

function assertInit(): void {
  if (!initialized) throw new Error('store not initialized — call initStore() first');
}

// ─── Lends ────────────────────────────────────────────────────────

export function createLend(data: {
  intentId: string;
  lender: string;
  amount: string;
  rMin: number;
}): LendIntent {
  assertInit();
  const intent: LendIntent = {
    ...data,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  db.lends.push(intent);
  persist();
  return intent;
}

export function findOpenLendsSortedByRMin(): LendIntent[] {
  assertInit();
  return db.lends
    .filter((l) => l.status === 'open')
    .sort((a, b) => a.rMin - b.rMin);
}

export function findAllLends(limit = 200): LendIntent[] {
  assertInit();
  return [...db.lends]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function findLendsByAddr(addr: string): LendIntent[] {
  assertInit();
  return db.lends
    .filter((l) => l.lender === addr)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function cancelLend(intentId: string): LendIntent | null {
  assertInit();
  const l = db.lends.find((x) => x.intentId === intentId && x.status === 'open');
  if (!l) return null;
  l.status = 'cancelled';
  persist();
  return l;
}

export function markLendMatched(intentId: string, loanId: string): void {
  assertInit();
  const l = db.lends.find((x) => x.intentId === intentId);
  if (!l) return;
  l.status = 'matched';
  l.matchedLoanId = loanId;
  l.matchedAt = new Date().toISOString();
  persist();
}

export function countOpenLends(): number {
  assertInit();
  return db.lends.filter((l) => l.status === 'open').length;
}

// ─── Borrows ──────────────────────────────────────────────────────

export function createBorrow(data: {
  intentId: string;
  borrower: string;
  amount: string;
  rMax: number;
  collateral: string;
}): BorrowIntent {
  assertInit();
  const intent: BorrowIntent = {
    ...data,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  db.borrows.push(intent);
  persist();
  return intent;
}

export function findOpenBorrowsSortedByRMaxDesc(): BorrowIntent[] {
  assertInit();
  return db.borrows
    .filter((b) => b.status === 'open')
    .sort((a, b) => b.rMax - a.rMax);
}

export function findAllBorrows(limit = 200): BorrowIntent[] {
  assertInit();
  return [...db.borrows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function findBorrowsByAddr(addr: string): BorrowIntent[] {
  assertInit();
  return db.borrows
    .filter((b) => b.borrower === addr)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function cancelBorrow(intentId: string): BorrowIntent | null {
  assertInit();
  const b = db.borrows.find((x) => x.intentId === intentId && x.status === 'open');
  if (!b) return null;
  b.status = 'cancelled';
  persist();
  return b;
}

export function markBorrowMatched(intentId: string, loanId: string): void {
  assertInit();
  const b = db.borrows.find((x) => x.intentId === intentId);
  if (!b) return;
  b.status = 'matched';
  b.matchedLoanId = loanId;
  b.matchedAt = new Date().toISOString();
  persist();
}

export function countOpenBorrows(): number {
  assertInit();
  return db.borrows.filter((b) => b.status === 'open').length;
}

// ─── Loans ────────────────────────────────────────────────────────

export function createLoan(data: {
  loanId: string;
  lender: string;
  borrower: string;
  principal: string;
  rate: number;
  lendIntentId: string;
  borrowIntentId: string;
}): Loan {
  assertInit();
  const loan: Loan = {
    ...data,
    status: 'awaiting-settlement',
    createdAt: new Date().toISOString(),
  };
  db.loans.push(loan);
  persist();
  return loan;
}

export function findAllLoans(limit = 200): Loan[] {
  assertInit();
  return [...db.loans]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function findLoansForAddr(addr: string): Loan[] {
  assertInit();
  return db.loans
    .filter((l) => l.lender === addr || l.borrower === addr)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function settleLoan(loanId: string, txId: string): Loan | null {
  assertInit();
  const loan = db.loans.find(
    (l) => l.loanId === loanId && l.status === 'awaiting-settlement',
  );
  if (!loan) return null;
  loan.status = 'active';
  loan.settlementTxId = txId;
  loan.settledAt = new Date().toISOString();
  persist();
  return loan;
}

export function countActiveLoans(): number {
  assertInit();
  return db.loans.filter(
    (l) => l.status === 'awaiting-settlement' || l.status === 'active',
  ).length;
}
