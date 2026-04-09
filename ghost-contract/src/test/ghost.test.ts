import { GhostSimulator, logger } from "./simulators/simulator.js";
import { computeCommitment } from "../witnesses.js";
import { describe, it, expect } from "vitest";
import { toHexPadded, randomHex32 } from "./utils/utils.js";

// User keys
const lender1Key = toHexPadded("lender1");
const lender2Key = toHexPadded("lender2");
const borrower1Key = toHexPadded("borrower1");
const borrower2Key = toHexPadded("borrower2");

function createSimulator() {
  const sim = GhostSimulator.deploy(lender1Key);
  sim.addUser("lender1", lender1Key);
  sim.addUser("lender2", lender2Key);
  sim.addUser("borrower1", borrower1Key);
  sim.addUser("borrower2", borrower2Key);
  return sim;
}

describe("GHOST Finance", () => {
  describe("Deposit & Withdraw", () => {
    it("deposits and tracks balance", () => {
      const sim = createSimulator();
      const ledger = sim.as("lender1").deposit(1000n);
      logger.info({ phase: ledger.phase, deposits: ledger.total_deposits });
      expect(ledger.total_deposits).toEqual(1000n);
    });

    it("withdraws funds", () => {
      const sim = createSimulator();
      sim.as("lender1").deposit(1000n);
      const ledger = sim.as("lender1").withdraw(400n);
      expect(ledger.total_deposits).toEqual(600n);
    });

    it("rejects withdraw exceeding balance", () => {
      const sim = createSimulator();
      sim.as("lender1").deposit(100n);
      expect(() => sim.as("lender1").withdraw(200n)).toThrow();
    });
  });

  describe("Phase Management", () => {
    it("starts at BIDDING phase (0)", () => {
      const sim = createSimulator();
      const ledger = sim.getLedger();
      expect(ledger.phase).toEqual(0n);
    });

    it("advances through phases", () => {
      const sim = createSimulator();

      // BID -> REVEAL
      let ledger = sim.as("lender1").advancePhase();
      expect(ledger.phase).toEqual(1n);

      // REVEAL -> CLEAR
      ledger = sim.as("lender1").advancePhase();
      expect(ledger.phase).toEqual(2n);
    });
  });

  describe("Sealed-Bid Auction", () => {
    it("full epoch: commit, reveal, clear, repay", () => {
      const sim = createSimulator();

      // ── Setup: deposit funds ──
      sim.as("lender1").deposit(10000n);
      sim.as("lender2").deposit(5000n);
      sim.as("borrower1").deposit(8000n); // for collateral
      sim.as("borrower2").deposit(6000n);

      // ── BIDDING phase: submit commitments ──
      const nonce1 = randomHex32();
      const nonce2 = randomHex32();
      const nonce3 = randomHex32();
      const nonce4 = randomHex32();

      // Lender1: 5000 at 3% min (300 bps)
      const lendCommit1 = computeCommitment(5000n, 300n, nonce1, lender1Key);
      // Lender2: 3000 at 5% min (500 bps)
      const lendCommit2 = computeCommitment(3000n, 500n, nonce2, lender2Key);
      // Borrower1: 4000 at 6% max (600 bps), collateral 6000 (150%)
      const borrowCommit1 = computeCommitment(4000n, 600n, nonce3, borrower1Key);
      // Borrower2: 2000 at 4% max (400 bps), collateral 3000 (150%)
      const borrowCommit2 = computeCommitment(2000n, 400n, nonce4, borrower2Key);

      sim.as("lender1").submitLend(lendCommit1);
      sim.as("lender2").submitLend(lendCommit2);
      sim.as("borrower1").submitBorrow(borrowCommit1);
      sim.as("borrower2").submitBorrow(borrowCommit2);

      let ledger = sim.getLedger();
      expect(ledger.lend_count).toEqual(2n);
      expect(ledger.borrow_count).toEqual(2n);

      // ── Advance to REVEAL ──
      sim.as("lender1").advancePhase();

      // ── REVEAL phase: reveal bids ──
      sim.as("lender1").revealLend(lendCommit1, 5000n, 300n, nonce1);
      sim.as("lender2").revealLend(lendCommit2, 3000n, 500n, nonce2);
      sim.as("borrower1").revealBorrow(borrowCommit1, 4000n, 600n, 6000n, nonce3);
      sim.as("borrower2").revealBorrow(borrowCommit2, 2000n, 400n, 3000n, nonce4);

      // ── Advance to CLEAR ──
      sim.as("lender1").advancePhase();

      // ── CLEARING: settle matched pairs (r=300 is optimal clearing rate) ──
      // lend slot 0 = lender1 (5000, rMin=300), borrow slot 0 = borrower1 (4000, rMax=600)
      // lend slot 0 = lender1 (5000, rMin=300), borrow slot 1 = borrower2 (2000, rMax=400)
      sim.as("lender1").settle(300n, 0n, 0n, 4000n); // lender1 ↔ borrower1
      sim.as("lender1").settle(300n, 0n, 1n, 1000n); // lender1 ↔ borrower2 (partial)
      sim.as("lender1").advancePhase(); // CLEAR → ACTIVE
      ledger = sim.getLedger();

      logger.info({
        section: "Clearing Results",
        clearing_rate: ledger.clearing_rate,
        matched_volume: ledger.matched_volume,
        loan_count: ledger.loan_count,
        phase: ledger.phase
      });

      expect(ledger.clearing_rate).toEqual(300n);
      expect(ledger.phase).toEqual(3n); // ACTIVE

      // Loans should have been created
      expect(ledger.loan_count).toBeGreaterThan(0n);

      // ── ACTIVE: repay loans ──
      // Borrower1 needs principal in balance to repay
      // (they received principal from the match, but we need to simulate that)
      // For now just verify the phase and loan state
      logger.info({
        section: "Epoch Complete",
        total_locked: ledger.total_locked,
        loan_count: ledger.loan_count
      });
    });
  });

  describe("Bid Constraints", () => {
    it("rejects bids outside bidding phase", () => {
      const sim = createSimulator();
      sim.as("lender1").advancePhase(); // move to REVEAL
      const nonce = randomHex32();
      const commit = computeCommitment(1000n, 500n, nonce, lender1Key);
      expect(() => sim.as("lender1").submitLend(commit)).toThrow();
    });

    it("rejects undercollateralized borrow", () => {
      const sim = createSimulator();
      sim.as("borrower1").deposit(1000n);
      const nonce = randomHex32();
      // 1000 amount with only 1000 collateral (100%, needs 150%)
      const commit = computeCommitment(1000n, 500n, nonce, borrower1Key);
      sim.as("borrower1").submitBorrow(commit);
      sim.as("lender1").advancePhase(); // REVEAL (only operator can advance)
      expect(() =>
        sim.as("borrower1").revealBorrow(commit, 1000n, 500n, 1000n, nonce)
      ).toThrow();
    });
  });
});
