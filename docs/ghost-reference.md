# GHOST EVM Reference — Port Notes

Snapshot of `/home/sounak/programming/silonelabs/midnight/ghost/` (EVM ref repo). Used as input for Midnight CLI + backend port. Not a full audit — scoped to lend/borrow/match/settle.

---

## 1. Server stack

`ghost/server/src/`

- Runtime: Bun
- Framework: Hono v4.12
- DB: MongoDB via Mongoose 9.2
- Auth: EIP-712 typed-data (ethers v6.16)
- Rate encryption: ECIES (eciesjs v0.4) — lender/borrower encrypt rate with CRE pubkey
- Logging: plain `console.log` (no pino)
- Port: 8080

Entry: [server/src/index.ts](../../ghost/server/src/index.ts)
Routes: [server/src/routes/ghost.routes.ts](../../ghost/server/src/routes/ghost.routes.ts)

---

## 2. Endpoints (reference for Midnight port)

### User-signed (EIP-712)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/deposit-lend/init` | create DepositSlot, return slotId |
| POST | `/api/v1/deposit-lend/confirm` | confirm lend intent w/ encrypted rate |
| POST | `/api/v1/cancel-lend` | cancel lend, queue refund |
| POST | `/api/v1/borrow-intent` | submit borrow intent |
| POST | `/api/v1/cancel-borrow` | cancel borrow |
| POST | `/api/v1/accept-proposal` | accept match, create loan |
| POST | `/api/v1/reject-proposal` | reject, slash 5% |
| POST | `/api/v1/repay` | repay loan, unlock collateral |
| POST | `/api/v1/claim-excess-collateral` | claim above-required collateral |

### Internal (x-api-key, CRE-only)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/internal/pending-intents` | fetch unmatched lends/borrows |
| POST | `/api/v1/internal/record-match-proposals` | record batch of proposals |
| POST | `/api/v1/internal/expire-proposals` | auto-accept on expiry |
| POST | `/api/v1/internal/check-loans` | fetch active loans |
| GET | `/api/v1/internal/pending-transfers` | fetch queued transfers |
| POST | `/api/v1/internal/confirm-transfers` | mark done |
| POST | `/api/v1/internal/liquidate-loans` | mark defaulted |

### Public reads
- `GET /api/v1/lender-status/{addr}`
- `GET /api/v1/borrower-status/{addr}`
- `GET /api/v1/credit-score/{addr}`
- `GET /api/v1/collateral-quote`
- `GET /health`

---

## 3. Mongoose models (port to Postgres/SQLite or plain JSON)

`ghost/server/src/models/`

### DepositSlot
`{ slotId, userId, token, amount (string), status (pending|confirmed|cancelled), encryptedRate?, intentId?, createdAt, epochId }`
TTL 10min → cancelled

### LendIntent
`{ intentId, userId, token, amount, encryptedRate, epochId, createdAt }`

### BorrowIntent
`{ intentId, borrower, token, amount, encryptedMaxRate, collateralToken, collateralAmount, status (pending|proposed|matched|cancelled|rejected), createdAt }`

### MatchProposal
`{ proposalId, borrowIntentId, borrower, token, principal, matchedTicks[], effectiveBorrowerRate, collateralToken, collateralAmount, status (pending|accepted|rejected|expired), createdAt, expiresAt }`
Expires 5s after create → auto-accept.

### Loan
`{ loanId, borrower, token, principal, matchedTicks[], effectiveBorrowerRate, collateralToken, collateralAmount, requiredCollateral, maturity (30d), status (active|repaid|defaulted), repaidAmount }`

### PendingTransfer
`{ transferId, recipient, token, amount, reason (cancel-lend|cancel-borrow|disburse|return-collateral|repay-lender|return-collateral-repay|liquidate), createdAt, status (pending|completed|failed) }`

### Balance
`{ user, token (composite unique), amount }` — in-server ledger, credited at deposit, debited at loan disbursement.

### CreditScore
`{ address, tier (bronze|silver|gold|platinum), loansRepaid, loansDefaulted }`
Multipliers: platinum 1.2x → bronze 2.0x

---

## 4. Matching engine

`ghost/ghost-settler/settle-loans/main.ts` L83–150. Runs as CRE cron, 30s epoch.

Algorithm (greedy fill, borrower-optimized):

```
1. decrypt all lend rates (only inside CRE)
2. sort borrows by amount DESC
3. sort lends by rate ASC
4. for each borrow:
     greedy fill cheapest ticks until amount satisfied or lends exhausted
     compute weighted avg tick rate
     if weightedAvg <= borrower.r_max: emit MatchProposal
     else: release all ticks
5. POST batch to /internal/record-match-proposals
```

Properties:
- **tick locking** — lends in pending proposals are filtered from next epoch
- **release on rejection** — rejected/expired ticks return to pool
- **partial fills** — one lend can split across multiple borrows
- **full-or-nothing borrow** — borrower skipped if not fully fillable

Epoch lifecycle:
```
t=0   intents accumulate
t=30  CRE runs matching
t=35  auto-accept unaccepted proposals
t=60  next epoch
```

---

## 5. End-to-end lend flow (EVM ref)

```
lender --approve+deposit to vault (onchain)--> Vault
lender --POST /deposit-lend/init--> Server (creates DepositSlot)
lender --privateTransfer to pool--> Vault
lender --POST /deposit-lend/confirm {encryptedRate, auth}--> Server (creates LendIntent)

<30s>

CRE --GET /internal/pending-intents--> Server
CRE (decrypts rates, runs match)
CRE --POST /internal/record-match-proposals--> Server (creates MatchProposal)

borrower --POST /accept-proposal--> Server
  Server: create Loan, debit lender balances, queue disburse transfer
CRE --GET /internal/pending-transfers--> Server
CRE --signs+executes transfer--> Vault (principal → borrower shielded addr)
CRE --POST /internal/confirm-transfers--> Server
```

Repay:
```
borrower --POST /repay--> Server
  validate amount ≥ owed
  credit each lender's balance (principal + interest pro-rata by tick)
  queue collateral return transfer
CRE executes transfer
```

---

## 6. Logging (EVM ref)

Plain `console.log` only. No structured logger. Our Midnight port will use pino with color-coded levels per spec.

---

## 7. Protocol docs

`ghost/docs/docs/mechanics/`:

- **matching-engine.md** — greedy fill, 5s expiry, tick locking
- **sealed-bid-auctions.md** — discriminatory pricing (each lender earns own bid, not uniform r*), pre+post auction privacy, 30s epoch batching
- **tick-based-rates.md** — supply curve from ECIES-decrypted ticks
- **collateral-system.md** — over-collat `required = amount × multiplier / assetPrice`, tier-based, HF = `collat × price / principal`, liquidation at HF<1.5x

Key diff vs ghost-midnight protocol: EVM uses **discriminatory pricing** (per-tick rates), ghost-midnight uses **uniform clearing rate `r*`** via sealed-bid batch auction. Simpler algo, same 150% collat floor, no credit tier.

---

## 8. Contract delta vs Midnight

| Aspect | Ghost EVM | Ghost Midnight |
|---|---|---|
| Matching | greedy per-tick, discriminatory | uniform `r*`, argmax matched volume |
| Privacy | ECIES on rates, CRE decrypts | sealed-bid commit/reveal, witness state |
| Phases | none (continuous) | 4-phase (BID→REVEAL→CLEAR→ACTIVE) |
| Operator | CRE cron (trusted exec) | deployer script (v1) |
| Collat | tier-based 1.2x–2x | fixed 150% |
| Repay interest | per-lender at own rate | single `r*` for all loans in epoch |
| Liquidation | auto via CRE | none in v1 |

---

## 9. CLI/demo examples

### Raycast lend flow
`ghost/ghost-raycast/src/LendFormView.tsx` L39–93:
1. Approve token
2. Vault deposit
3. initDepositLend → slotId
4. privateTransfer to pool
5. encryptRate(rate) w/ CRE pubkey
6. Sign EIP-712
7. confirmDepositLend → intentId

### Borrow flow
`ghost/ghost-raycast/src/BorrowFormView.tsx` L32–89:
1. Approve collat
2. Vault deposit
3. fetchCollateralQuote
4. privateTransfer collat to pool
5. encryptRate(maxRate)
6. Sign EIP-712
7. submitBorrowIntent → intentId
8. poll proposals → accept

### Transfer demo
`ghost/transfer-demo/api-scripts/src/common.ts`:
- `getWallet()` from `PRIVATE_KEY` env
- `currentTimestamp()`
- `signTypedData()` for EIP-712
- `postApi()` JSON wrapper

---

## 10. Env vars (EVM ref, for comparison)

| Var | Default |
|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/ghost` |
| `POOL_PRIVATE_KEY` | `""` |
| `TOKEN_ADDRESS` | — |
| `CRE_PUBLIC_KEY` | — |
| `PORT` | 8080 |
| `INTERNAL_API_KEY` | `""` |

---

## 11. Takeaways for Midnight port

1. **Store amounts as string** (BigInt serialization)
2. **Lowercase addresses before DB ops**
3. **Auth differs** — EVM uses EIP-712; Midnight will use Lace wallet sign or CLI mnemonic-derived signatures (TBD)
4. **Matching is operator-side** — our Midnight operator replaces CRE role
5. **Tick locking** still needed to prevent double-match across epochs
6. **Transfer queue pattern** — server queues, operator executes, server confirms. Good pattern to reuse
7. **EVM has per-tick rates** — our Midnight v1 has single `r*` → simpler loan schema
8. **Collateral validation at submit AND at accept** — price may move (N/A on Midnight v1 since collat = principal token)
9. **Server is dumb storage in EVM** — encryption/decryption in CRE. For Midnight CLI-only v0, we can do plaintext (no encryption yet), sealed-bid commit/reveal comes later
10. **No scheduled jobs in server** — all timing from CRE. For Midnight, operator/server runs its own scheduler

---

## 12. Midnight contract quick-ref

Preprod: `81b3053a8b521a91cf075204f443f8216c81a29ac7e1c37d9532fd81ef531cfb`
Admin: `14fdfbd80de345d1280a7c54552a5992cfc8fa01df75caf47787fe2eb3bd35f4`
Indexer: `https://indexer.preprod.midnight.network/api/v3/graphql`
Node RPC: `https://rpc.preprod.midnight.network`
Proof server: `http://127.0.0.1:6301` (local docker)

### Circuits ([ghost-contract/src/ghost.compact](../ghost-contract/src/ghost.compact))

| Circuit | Phase | Sig |
|---|---|---|
| `deposit` | any | `(owner: Bytes<32>, amount: U64)` |
| `withdraw` | any | `(owner: Bytes<32>, amount: U64)` |
| `submit_lend` | 0 | `(commitment: Bytes<32>)` |
| `submit_borrow` | 0 | `(commitment: Bytes<32>)` |
| `reveal_lend` | 1 | `(commit, owner, amount, r_min)` |
| `reveal_borrow` | 1 | `(commit, owner, amount, r_max, collateral)` |
| `settle` | 2 | `(rate, lend_slot, borrow_slot, match_amount)` (operator) |
| `repay` | 3 | `(loan_id, caller, total_due)` |
| `advance_phase` | any | `(caller)` (operator) |

Max 8 lend + 8 borrow bids per epoch. 150% collat floor. `total_due × 10000 >= principal × (10000 + rate)`.

### Commitment hash
[ghost-contract/src/witnesses.ts](../ghost-contract/src/witnesses.ts):
```
SHA-256(amount_U64_BE || rate_U32_BE || nonce_32B || owner_32B)
```

### Ledger shape
```
phase: 0..3
epoch_num: bigint
operator: Bytes<32>
balances: Map<owner, bigint>
lend_commits: Map<commitment, slot>
borrow_commits: Map<commitment, slot>
lend_bids: Map<slot, LendBid>
borrow_bids: Map<slot, BorrowBid>
lend_count, borrow_count: bigint
clearing_rate, matched_volume: bigint
loans: Map<loan_id, Loan>
loan_count: bigint
total_deposits, total_locked: bigint
```

### CLI wrappers
[ghost-cli/src/api.ts](../ghost-cli/src/api.ts) L291-387 already has:
- `ghostDeposit`, `ghostWithdraw`
- `ghostSubmitLend`, `ghostSubmitBorrow`
- `ghostRevealLend`, `ghostRevealBorrow`
- `ghostSettle`, `ghostRepay`
- `ghostAdvancePhase`
- `joinContract`, `getLedgerState`, `deploy`

**Gap**: index.ts L103-118 has stub lend/borrow handlers that do not call these wrappers. No backend server exists yet. No matching engine.
