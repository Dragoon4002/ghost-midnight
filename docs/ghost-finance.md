# GHOST Finance on Midnight

> Privacy-preserving DeFi lending via sealed-bid batch auctions on Midnight's ZK blockchain.

## The Problem

### Variable Rate Roulette
Aave/Compound use utilization-based interest rate curves — your rate changes every block. A borrower at 4% might face 15% tomorrow. The standard model:

```
R = R_base + (U / U_opt) × R_slope1                    if U ≤ U_opt
R = R_base + R_slope1 + ((U - U_opt) / (1 - U_opt)) × R_slope2   otherwise
```

Unpredictable. Discourages institutional adoption. Prevents effective treasury management.

### The MEV Tax
On-chain order books leak information. Searchers front-run large deposits, sandwich orders, and manipulate utilization to trigger liquidations. Lending markets pay an invisible MEV tax on every interaction.

### Capital Inefficiency
DeFi demands 150%+ collateral regardless of history. A user who has repaid 50 loans faces the same requirements as a first-time borrower. $50B+ sits dormant in over-collateralization.

## The GHOST Mechanism

### Sealed-Bid Batch Auctions

GHOST replaces continuous order books with discrete epochs (τ = 300 seconds). Participants submit sealed intents without seeing others' bids.

**Intent structure:**

```
I_L = (address, amount, r_min, duration, σ)    // lend intent
I_B = (address, amount, r_max, duration, σ)    // borrow intent
```

At epoch boundary, the clearing rate r* is computed:

```
r* = argmax_r { min(S(r), D(r)) }
```

Where supply and demand curves are:

```
S(r) = Σ amount_i   for all lend intents where r_min,i ≤ r
D(r) = Σ amount_j   for all borrow intents where r_max,j ≥ r
```

All matched participants transact at r* regardless of their reservation price. This uniform price auction is weakly dominant for truthful bidding and eliminates MEV.

### Why Midnight

Midnight's dual-state model maps perfectly to sealed-bid auctions:

| GHOST concept | Midnight primitive |
|---|---|
| Sealed bids (invisible during bidding) | `witness` — private, never on-chain |
| Bid commitments | `persistentHash` — on-chain commitment |
| Public settlement state | `ledger` — public on-chain state |
| Rate/amount validation | `circuit` — compiles to ZK-SNARK |
| MEV resistance | Bids exist only as commitments until reveal |

## Protocol Architecture

### Epoch Lifecycle

```
EPOCH N:

  BIDDING (phase 0)
  ├─ Users deposit() funds
  ├─ Lenders submit_lend(commitment)    ← hash of (amount, r_min, nonce, owner)
  ├─ Borrowers submit_borrow(commitment)
  └─ advance_phase() → REVEAL

  REVEAL (phase 1)
  ├─ Lenders reveal_lend(commitment, amount, r_min)
  ├─ Borrowers reveal_borrow(commitment, amount, r_max, collateral)
  └─ advance_phase() → CLEARING

  CLEARING (phase 2)
  ├─ Operator calls settle() per matched pair
  │   ├─ Verifies: rate ≥ lender's r_min
  │   ├─ Verifies: rate ≤ borrower's r_max
  │   ├─ Verifies: collateral ≥ 150% of principal
  │   ├─ Locks lender funds + borrower collateral
  │   └─ Creates loan record on-chain
  └─ advance_phase() → ACTIVE

  ACTIVE (phase 3)
  ├─ Borrowers repay(loan_id, total_due)
  │   ├─ total_due = principal + interest
  │   ├─ Lender credited, collateral returned
  │   └─ Loan marked repaid
  ├─ Lenders/borrowers withdraw() profits
  └─ advance_phase() → new BIDDING epoch
```

### Clearing Rate Calculation

The clearing engine computes r* off-chain, then settles each matched pair on-chain. The contract verifies all invariants:

```
For each candidate rate r (from lend bids):

  supply(r) = sum of lend amounts where r_min ≤ r
  demand(r) = sum of borrow amounts where r_max ≥ r
  matched(r) = min(supply, demand)

  r* = rate that maximizes matched volume
```

On-chain `settle()` circuit enforces:
- `rate ≥ lbid.r_min` — lender satisfied
- `rate ≤ bbid.r_max` — borrower satisfied
- `match_amount ≤ lbid.amount` — no over-lending
- `match_amount ≤ bbid.amount` — no over-borrowing
- `collateral * 100 ≥ amount * 150` — 150% collateralization

### Hybrid Architecture

```
┌─────────────────────┐     ┌────────────────────┐
│   User Layer        │     │  Off-Chain Engine   │
│                     │     │                     │
│  Wallet (Lace)      │     │  Clearing Rate      │
│  CLI / Frontend     │────▶│  Computation        │
│  Bid Submission     │     │  Match Generation   │
│                     │     │                     │
└─────────┬───────────┘     └──────────┬──────────┘
          │                            │
          ▼                            ▼
┌──────────────────────────────────────────────────┐
│              Midnight Network                     │
│                                                   │
│  ┌─────────────┐  ┌───────────┐  ┌────────────┐  │
│  │ GhostPool   │  │  Loan     │  │  Balance   │  │
│  │ Contract    │  │  Records  │  │  Ledger    │  │
│  │             │  │           │  │            │  │
│  │ • deposit   │  │ • lender  │  │ • per-user │  │
│  │ • withdraw  │  │ • borrower│  │   balances │  │
│  │ • submit_*  │  │ • rate    │  │ • deposits │  │
│  │ • reveal_*  │  │ • repaid  │  │ • locked   │  │
│  │ • settle    │  │           │  │            │  │
│  │ • repay     │  │           │  │            │  │
│  └─────────────┘  └───────────┘  └────────────┘  │
│                                                   │
│  Funds on-chain. Logic off-chain. Trust in code.  │
└───────────────────────────────────────────────────┘
```

## Smart Contract — `ghost.compact`

### Ledger State

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `Uint<8>` | Current epoch phase (0-3) |
| `epoch_num` | `Uint<32>` | Current epoch number |
| `operator` | `Bytes<32>` | Operator/admin public key |
| `balances` | `Map<Bytes<32>, Uint<64>>` | Per-user deposited balances |
| `lend_commits` | `Map<Bytes<32>, Uint<32>>` | Lend bid commitment → slot |
| `borrow_commits` | `Map<Bytes<32>, Uint<32>>` | Borrow bid commitment → slot |
| `lend_bids` | `Map<Uint<32>, LendBid>` | Revealed lend bids (max 8) |
| `borrow_bids` | `Map<Uint<32>, BorrowBid>` | Revealed borrow bids (max 8) |
| `loans` | `Map<Uint<32>, Loan>` | Active/repaid loans |
| `clearing_rate` | `Uint<32>` | Last clearing rate (basis points) |
| `matched_volume` | `Uint<64>` | Total matched volume this epoch |
| `total_deposits` | `Uint<64>` | Sum of all user deposits |
| `total_locked` | `Uint<64>` | Funds locked in active loans |

### Circuits (9 total)

| Circuit | Phase | Description |
|---------|-------|-------------|
| `deposit(owner, amount)` | Any | Add funds to protocol |
| `withdraw(owner, amount)` | Any | Remove unlocked funds |
| `submit_lend(commitment)` | BIDDING | Submit sealed lend bid hash |
| `submit_borrow(commitment)` | BIDDING | Submit sealed borrow bid hash |
| `reveal_lend(commitment, owner, amount, r_min)` | REVEAL | Reveal lend bid, verify commitment |
| `reveal_borrow(commitment, owner, amount, r_max, collateral)` | REVEAL | Reveal borrow bid, verify 150% collateral |
| `settle(rate, lend_slot, borrow_slot, match_amount)` | CLEARING | Settle one matched pair, verify invariants |
| `repay(loan_id, caller, total_due)` | ACTIVE | Repay loan, return collateral |
| `advance_phase(caller)` | Any | Move to next phase (operator only) |

### Structs

```compact
struct LendBid {
  owner: Bytes<32>,
  amount: Uint<64>,
  r_min: Uint<32>,       // basis points
  revealed: Boolean
}

struct BorrowBid {
  owner: Bytes<32>,
  amount: Uint<64>,
  r_max: Uint<32>,
  collateral: Uint<64>,
  revealed: Boolean
}

struct Loan {
  lender: Bytes<32>,
  borrower: Bytes<32>,
  principal: Uint<64>,
  collateral: Uint<64>,
  rate: Uint<32>,
  repaid: Boolean
}
```

## Invariants Enforced On-Chain

1. **Rate satisfaction** — all matched lenders get r* ≥ their r_min, all borrowers r* ≤ their r_max
2. **Collateralization** — borrower collateral ≥ 150% of matched principal
3. **Balance solvency** — can't lock more than deposited balance
4. **Phase gating** — bids only in BIDDING, reveals only in REVEAL, settlement only in CLEARING
5. **Max bids** — capped at 8 per side per epoch
6. **Repayment integrity** — total_due ≥ principal, borrower identity verified

## Interest Calculation

Compact has no division operator. Interest is computed off-chain and verified on-chain:

```
Off-chain: total_due = principal + (principal × rate / 10000)

On-chain verification:
  assert(total_due ≥ principal)
  assert(total_due × 10000 ≥ principal × (10000 + rate))
```

This avoids division while ensuring the interest amount is correct to within 1 unit.

## v1 Scope & Future Roadmap

### v1 (Current)
- Sealed-bid batch auction with commit-reveal
- 8 lend + 8 borrow bids per epoch
- Hybrid clearing (off-chain computation, on-chain verification)
- Single collateral type (tDUST)
- Operator-managed phase transitions

### v2 (Planned)
- **Tranched risk architecture** — Senior (70%, first priority) and Junior (30%, first loss) tranches
- **Haunt Score** — on-chain reputation system (0-400+), reduces collateral requirements from 150% to 110%
- **On-chain clearing** — bounded iteration in Compact when circuit sizes allow
- **Decentralized phase management** — time-based automatic transitions
- **Multi-asset support** — multiple token types as collateral

### v3 (Future)
- Cross-chain deposit flow via Midnight bridge
- GHOST token with fee sharing, governance, and manifestation acceleration
- Liquidation bounties with time-scaled rewards
- Emission schedule with halving curve

## Project Structure

```
ghost-midnight/
  ghost-contract/
    src/
      ghost.compact          # Compact contract (9 circuits)
      witnesses.ts           # Private state types + commitment hash
      index.ts               # Re-exports
      managed/ghost/         # Compiled ZK artifacts
        contract/            # index.js, index.d.ts
        zkir/                # ZK intermediate representation
        keys/                # Prover + verifier keys
    package.json
  ghost-cli/
    src/
      deploy.ts              # Localnet deployment script
      api.ts                 # Circuit call wrappers
      config.ts              # Network endpoints
      common-types.ts        # TypeScript types
    package.json
  docs/
    ghost-finance.md         # This document
```

## References

- [GHOST Finance Litepaper v1.0](../GHOST%20Finance%20Litepaper%20v1.0.pdf) — Original protocol design
- [Midnight Documentation](https://docs.midnight.network) — Compact language reference
- [Compact Language Reference](https://docs.midnight.network/develop/reference/compact/lang-ref) — Type system, circuits, witnesses
- [ZKLoan Example](https://github.com/midnightntwrk/example-zkloan) — Reference Compact contract
