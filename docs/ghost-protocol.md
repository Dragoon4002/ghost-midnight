# GHOST Protocol — How Lending & Borrowing Should Work

Target behavior for v1 on Midnight preprod. Scope: the single-pool sealed-bid auction for lending and borrowing. Read this alongside [ghost-finance.md](./ghost-finance.md) for the deeper design rationale.

## 1. Mental model

GHOST is not Aave. There is no continuous interest rate curve and no on-demand matching. The protocol runs as a sequence of discrete **epochs**. Each epoch is a sealed-bid uniform-price auction:

- Everyone commits hidden bids during BIDDING.
- Everyone reveals them during REVEAL.
- The clearing engine computes a single rate `r*` that maximizes matched volume.
- All matched loans settle at that one rate.
- Borrowers repay during ACTIVE.
- Next epoch starts.

Privacy comes from: (a) commitments hide bid contents until reveal, (b) Midnight's witness state keeps the nonce off-chain.

## 2. Actors

| Actor | Role |
|---|---|
| **Lender** | Deposits NIGHT, submits lend bid (amount, min rate) |
| **Borrower** | Deposits NIGHT as collateral, submits borrow bid (amount, max rate) |
| **Operator** | Runs clearing engine, calls `settle` for each matched pair, advances phases. Deployer in v1. |
| **Client** | Next.js UI. Reads public ledger + own witness state. Builds transactions. |
| **Backend (optional)** | Indexer + clearing engine. Could be just a script the operator runs. |

## 3. Pool shape

v1 = **one pool per epoch**, not per asset.

- Single borrow asset: NIGHT (the protocol's native token)
- Single collateral: NIGHT itself (in v1 — no multi-collateral yet)
- Max 8 lend bids + 8 borrow bids per epoch (hard-coded in contract)
- All matches at the same clearing rate `r*`

The client's "pool per token" view (`/explore/[ticker]`) is UI framing. Under the hood there's one contract, one pool, one epoch at a time.

## 4. Lifecycle of an epoch

```
 ┌─────────────────┐
 │  BIDDING (0)    │  lenders/borrowers deposit + submit commitments
 └────────┬────────┘
          │ operator.advance_phase()
          ▼
 ┌─────────────────┐
 │  REVEAL  (1)    │  reveal bids, contract checks commits + balances
 └────────┬────────┘
          │ operator.advance_phase()
          ▼
 ┌─────────────────┐
 │  CLEARING (2)   │  off-chain: compute r*, pick pairs
 │                 │  on-chain: operator calls settle(...) per pair
 └────────┬────────┘
          │ operator.advance_phase()
          ▼
 ┌─────────────────┐
 │  ACTIVE  (3)    │  borrowers repay, lenders receive principal+interest
 └────────┬────────┘
          │ operator.advance_phase() → next BIDDING
          ▼
```

Epoch duration is a policy choice (e.g. 1 hour, 1 day). Contract doesn't enforce — operator advances phases.

## 5. Lender flow — step by step

### 5.1 Deposit
```
lender.connect()                          — Lace wallet
lender.deposit(owner, amount)             — circuit: deposit
    → balances[owner] += amount
    → total_deposits += amount
```

Funds now sit in the pool as free balance. They do not earn yet.

### 5.2 Submit sealed bid (phase 0, BIDDING)
```
off-chain (witness state):
    nonce = random()
    commitment = hash(amount || r_min || nonce || owner)
    persist { amount, r_min, nonce } in wallet-local witness

on-chain:
    submit_lend(commitment)               — circuit: submit_lend
        → lend_commits[commitment] = next_slot
        → lend_count += 1
```

Contract sees only the hash. Other users learn nothing about the lender's minimum acceptable rate.

### 5.3 Reveal (phase 1, REVEAL)
```
reveal_lend(commitment, owner, amount, r_min)
    verify: hash(amount || r_min || nonce || owner) == commitment
    verify: balances[owner] >= amount
    → lend_bids[slot] = { owner, amount, r_min, revealed: true }
```

Amount + r_min are now on the public ledger. Lender's balance is not yet locked — locking happens in `settle`.

### 5.4 Clearing (phase 2)
Lender does nothing. Operator runs the clearing engine, calls `settle` for each matched pair. If this lender is matched:
```
settle(r*, lend_slot, borrow_slot, match_amount)
    verify: r* >= lend_bids[lend_slot].r_min
    verify: r* <= borrow_bids[borrow_slot].r_max
    balances[lender]  -= match_amount           (principal locked)
    balances[borrower] -= borrower.collateral   (collateral locked)
    loans[loan_id] = { lender, borrower, principal=match_amount,
                       collateral, rate=r*, repaid=false }
    total_locked += match_amount + collateral
```

If not matched, the lend bid simply dies at end of epoch. Funds stay in free balance, no harm.

### 5.5 Get repaid (phase 3, ACTIVE)
When borrower calls `repay`:
```
repay(loan_id, caller, total_due)
    verify: caller == loans[loan_id].borrower
    verify: total_due >= principal
    verify: total_due × 10000 >= principal × (10000 + rate)
    balances[lender]   += total_due            (principal + interest)
    balances[borrower] += collateral           (collateral released)
    loans[loan_id].repaid = true
```

### 5.6 Withdraw
```
withdraw(owner, amount)
    verify: balances[owner] >= amount  (and amount is not locked)
    balances[owner] -= amount
    total_deposits -= amount
    → wallet receives NIGHT back
```

## 6. Borrower flow — step by step

### 6.1 Deposit collateral
```
borrower.deposit(owner, collateral_amount)
```
Collateral must be ≥ 150% of the intended borrow amount. E.g. to borrow 100 NIGHT, deposit at least 150.

### 6.2 Submit sealed bid (phase 0)
```
off-chain (witness state):
    nonce = random()
    commitment = hash(amount || r_max || collateral || nonce || owner)
    persist { amount, r_max, collateral, nonce }

on-chain:
    submit_borrow(commitment)
        → borrow_commits[commitment] = next_slot
```

### 6.3 Reveal (phase 1)
```
reveal_borrow(commitment, owner, amount, r_max, collateral)
    verify: commitment matches
    verify: collateral × 100 >= amount × 150      (150% rule)
    verify: balances[owner] >= collateral
    → borrow_bids[slot] = { owner, amount, r_max, collateral, revealed: true }
```

### 6.4 Clearing (phase 2)
Operator runs `settle(r*, …)`. If matched, borrower's collateral gets locked and a `Loan` record appears in public ledger. Borrower now owes `principal × (10000 + r*) / 10000` (computed off-chain).

### 6.5 Repay (phase 3)
```
off-chain:
    total_due = principal + principal × rate / 10000
    user tops up balance if balance[owner] < total_due

on-chain:
    repay(loan_id, caller, total_due)
```

After repay: lender receives principal+interest into their balance, borrower's collateral is released back into their free balance.

If borrower doesn't repay: v1 has **no liquidation**. Collateral stays locked. Lender can't withdraw the matched principal. Reputation system + liquidation are v2. (This is why v1 demands 150% — it's a hack to buy time while the op runs.)

## 7. Clearing engine — the operator's job

Off-chain, given `lend_bids` and `borrow_bids` from the public ledger after phase 1:

```
candidates = sort(distinct union of lender.r_min + borrower.r_max)

for r in candidates:
    supply(r) = Σ lend_bids[i].amount  where r_min[i] <= r
    demand(r) = Σ borrow_bids[j].amount where r_max[j] >= r
    matched(r) = min(supply(r), demand(r))

r* = argmax matched(r)       (tie-break: lowest r)
```

Then pick pairs up to `matched(r*)`:
- Greedy: sort lenders by r_min asc, borrowers by r_max desc, pair them off
- For each pair, compute `match_amount = min(lend.amount_remaining, borrow.amount_remaining)`
- Call `settle(r*, lend_slot, borrow_slot, match_amount)`
- One lender can be split across multiple borrowers (and vice versa) by calling `settle` multiple times with the same slot until one side is drained.

All calls must land in phase 2. Then operator calls `advance_phase` to enter ACTIVE.

## 8. What must hold (invariants)

- `Σ balances[*] == total_deposits` (assuming accounting is correct)
- `total_locked ≤ total_deposits`
- For every active loan: `collateral ≥ 1.5 × principal`
- For every matched lender: `r* ≥ r_min`
- For every matched borrower: `r* ≤ r_max`
- A commitment can only be revealed once; a revealed bid can only settle once up to its amount.

## 9. Client UX contract (what the UI must show)

For lenders:
- Current phase + time remaining
- Your free balance, your committed/revealed/locked amounts
- Your outstanding loans (as lender) + expected repayment
- History: matched rate per past epoch, your realized APY

For borrowers:
- Current phase + time remaining
- Your free balance, collateral locked
- Outstanding loans + total_due + repay button (active in phase 3)
- Clearing rate history (so they can bid intelligently)

For both:
- Bids submitted during BIDDING are **editable** (they can submit a new commitment if contract allows — in v1 each commitment is a separate slot, so they'd just submit another one up to the 8-per-epoch cap).
- Reveal must be automatic or strongly nudged — if a user submits a commit in phase 0 but fails to reveal in phase 1, the bid is dead.

## 10. Non-goals for v1

These are explicitly out of scope and deferred to v2+:
- On-chain liquidation and bounties
- Multi-asset borrowing / collateral
- Continuous (non-epoch) matching
- Reputation-based under-collateralization
- Cross-chain deposits
- GHOST governance token
- Tranched risk (senior/junior)

For v1 the target is: a single pool where a lender can deposit NIGHT, bid a rate, get matched at a uniform clearing rate, be repaid, and withdraw. Everything else is scaffolding.
