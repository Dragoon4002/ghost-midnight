# Midnight Migration — What's Left

Gap list to get **lending + borrowing through a single pool** functional end-to-end on Midnight preprod. Assumes [current-flow.md](./current-flow.md) as starting state and [ghost-protocol.md](./ghost-protocol.md) as target. Ordered roughly by dependency.

Out of scope here: repay UX polish, InfoTab swap rewrite, UI copy scrub, multi-asset pools, liquidation, credit scoring.

---

## Tier 0 — Finish the EVM purge (blocks everything else)

Without this, `npm run build` in `client/` fails.

- [ ] **PoolDetailPage.tsx** — still imports `usePrivy`, `useWallets`, `get` from `@/lib/ghost` (deleted), and references `meta.address` which no longer exists on `Coin`. Swap to `useMidnightWallet` + `@/lib/api`, drop `meta.address` (pool is singular, not per-token).
- [ ] **PoolHeader.tsx** — remove hard-coded `<Badge>Sepolia</Badge>`, drop `contractAddress` prop OR repoint to Midnight preprod contract address.
- [ ] **ProfileHeader.tsx** — remove `ethers.JsonRpcProvider(MAINNET_RPC)` ENS lookup, remove `sepolia.etherscan.io` link.
- [ ] **InfoTab.tsx** — gut Wormhole bridge + swap pool. Either delete the route or leave a "Swap coming soon" placeholder.
- [ ] **UI copy scrub** across `infinity/`, `explore/`, `stake/`, `Footer.tsx`, `useNotifications.ts`: "Sepolia" → "Midnight Preprod", "Chainlink CRE" → "Midnight ZK", `sepolia.etherscan.io` → drop or swap.
- [ ] Verify: `grep -r "@privy-io\|from ['\"]ethers\|@wormhole-foundation\|viem\|eciesjs\|sepolia\|chainlink cre" ghost-midnight/client/src` → empty.
- [ ] Verify: `cd client && npm install && npm run build` → passes.

---

## Tier 1 — Shared contract plumbing

Currently no file in `client/` knows about the deployed contract. Need a single place that loads it and hands out a typed instance.

- [ ] **Copy compiled artifacts into client.**
  - `ghost-contract/src/managed/ghost/` is the ZK artifact directory (keys, zkir, contract index).
  - Either: (a) symlink / copy it into `client/src/contract/managed/`, or (b) publish `ghost-contract` as a workspace package and import from it.
  - Note: deploy-preprod copies it locally to avoid WASM instance mismatch. Same trick will be needed in the client.
- [ ] **Add Midnight SDK deps to client/package.json**:
  - `@midnight-ntwrk/compact-runtime`
  - `@midnight-ntwrk/midnight-js-contracts`
  - `@midnight-ntwrk/midnight-js-network-id`
  - `@midnight-ntwrk/midnight-js-types`
  - `@midnight-ntwrk/midnight-js-indexer-public-data-provider`
  - `@midnight-ntwrk/midnight-js-http-client-proof-provider`
  - (match versions used by `deploy-preprod/package.json`)
- [ ] **Create `client/src/lib/contract.ts`**:
  - `GHOST_CONTRACT_ADDRESS` from env: `NEXT_PUBLIC_GHOST_CONTRACT_ADDRESS`
  - `loadContract()` that takes the `connectedApi` from `useMidnightWallet` and returns a typed contract handle via `findDeployedContract(...)` (midnight-js-contracts API).
  - Provide a hook `useGhostContract()` that lazy-loads and memoizes it.
- [ ] **Wire `NEXT_PUBLIC_GHOST_CONTRACT_ADDRESS`** in `.env.local` using the deploy-preprod output (`deployment.json` → `81b3053a...`).
- [ ] **Providers**: indexer + proof server endpoints. Either reuse midrun's config or hardcode for preprod.

---

## Tier 2 — Witness state (commitment nonces)

Sealed-bid commitments require a nonce that must survive page reloads and never leave the user's machine.

- [ ] **Pick storage**: IndexedDB via `idb` (preferred for size) or `localStorage` (simpler, bounded by ~5MB).
- [ ] **Create `client/src/lib/witness-store.ts`**:
  ```ts
  type LendWitness   = { slotId: number; amount: bigint; rMin: number; nonce: Uint8Array }
  type BorrowWitness = { slotId: number; amount: bigint; rMax: number; collateral: bigint; nonce: Uint8Array }
  saveLendWitness(addr, w): void
  loadLendWitnesses(addr): LendWitness[]
  deleteLendWitness(addr, slotId): void
  // same for borrow
  ```
- [ ] **Key by wallet address** so multiple test accounts on one browser don't collide.
- [ ] **Commitment hashing helper** matching the contract's hash scheme (likely `persistent_hash` over a concat of fields — mirror what `ghost.compact` does in `submit_lend` / `reveal_lend`).
- [ ] **Nonce generation** via `crypto.getRandomValues(new Uint8Array(32))`.

---

## Tier 3 — Deposit / Withdraw (pre-req for any bid)

Simplest circuits. Ship these first to validate the contract pipeline end-to-end before touching bids.

- [ ] **`lib/ghost-actions.ts` → `deposit(amount)`**
  - Call `contract.callTx.deposit(ownerBytes, amount)` via the typed contract handle from `useGhostContract`.
  - Return tx hash + wait for confirmation.
- [ ] **`lib/ghost-actions.ts` → `withdraw(amount)`**
  - Same pattern, `contract.callTx.withdraw(ownerBytes, amount)`.
- [ ] **`WithdrawCard.tsx`** — replace the `throw` with real `withdraw()` call. Wire loading/success/error states (already exists from EVM version).
- [ ] **New DepositCard** or inline deposit in lend/borrow forms. v1 UX choice: auto-deposit on bid submit, or separate "fund pool" step. Recommend **separate** for clarity.
- [ ] **Balance reader** — read `balances[owner]` from the contract's public ledger (`contract.callTx.ledger().balances.get(ownerBytes)` or equivalent). Use it for free-balance display in profile + bid forms.
- [ ] **Test**: connect Lace → deposit 100 NIGHT → read balance shows 100 → withdraw 50 → balance shows 50.

---

## Tier 4 — Lend flow

Depends on Tiers 1–3.

- [ ] **`submitLend(amount, rMin)`** in `ghost-actions.ts`:
  1. Generate nonce.
  2. Compute commitment = hash(amount || rMin || nonce || ownerBytes).
  3. Call `contract.callTx.submit_lend(commitment)`.
  4. On success, save `{ slotId, amount, rMin, nonce }` to witness-store keyed by address.
  - Slot ID comes back from the contract (it's `lend_count` at time of submit — may need to read ledger before/after).
- [ ] **`revealLend(witness)`** in `ghost-actions.ts`:
  - Calls `contract.callTx.reveal_lend(commitment, ownerBytes, amount, rMin)`.
  - Must happen in phase 1. Either manual button or auto-trigger when phase becomes 1 (see Tier 6).
- [ ] **`LendCard.tsx`**:
  - Replace `throw` in `handleLend` with `submitLend(amount, rMin)`.
  - Add `rMin` input (basis points or percent — convert in UI).
  - Show current phase + disable submit outside phase 0.
- [ ] **Pending lend bids panel** — read from witness-store, show status (committed / revealed / matched / failed).
- [ ] **Test**: deposit → submitLend(100, 500bps) → phase advance to 1 → revealLend → bid appears in `lend_bids`.

---

## Tier 5 — Borrow flow

Mirror of lend. Depends on Tiers 1–3.

- [ ] **`submitBorrow(amount, rMax, collateral)`** in `ghost-actions.ts`:
  - Validate `collateral >= amount * 1.5` client-side before hitting the chain (contract also checks in reveal).
  - Commitment = hash(amount || rMax || collateral || nonce || ownerBytes).
  - `contract.callTx.submit_borrow(commitment)`.
  - Save witness.
- [ ] **`revealBorrow(witness)`** → `contract.callTx.reveal_borrow(...)`.
- [ ] **`BorrowCard.tsx`**:
  - Restore collateral field (was ripped during EVM purge).
  - Show 150% requirement inline + auto-fill helper ("set collateral = 1.5× amount").
  - Replace `throw` with `submitBorrow(...)`.
- [ ] **`repay(loanId)`** in `ghost-actions.ts`:
  - Read loan from ledger, compute `total_due = principal + principal * rate / 10000`.
  - Top up balance if insufficient (deposit first, then repay).
  - Call `contract.callTx.repay(loanId, ownerBytes, totalDue)`.
- [ ] **`ProfilePositions.tsx`** → `handleRepay` calls real `repay()`.
- [ ] **Test**: deposit 200 → submitBorrow(100, 1000bps, 150) → reveal → (operator settles) → phase 3 → repay → collateral released.

---

## Tier 6 — Phase awareness

Without this the UI is dangerous: users can submit into the wrong phase and waste gas.

- [ ] **`usePhase()` hook** in `client/src/hooks/`:
  - Reads `contract.callTx.ledger().phase` on mount + on a polling interval (e.g. 5s) OR via an indexer subscription if available.
  - Returns `{ phase: 0|1|2|3, epochNum, lastUpdated }`.
- [ ] **Global phase banner** in layout — persistent strip showing current phase + action allowed.
- [ ] **Auto-reveal nudge**: when phase flips from 0→1, walk witness-store, prompt user to call `revealLend` / `revealBorrow` for each uncommitted bid.
- [ ] **Disable bid buttons outside phase 0**, disable reveal buttons outside phase 1, disable repay outside phase 3.

---

## Tier 7 — Operator tooling

Someone has to run the clearing engine and advance phases. Options:

**Option A — ship as a script in `deploy-preprod/`** (recommended for v1):
- [ ] `deploy-preprod/operate.mjs`:
  - `node operate.mjs clear` → reads `lend_bids` + `borrow_bids`, runs clearing algorithm, calls `settle(...)` for each pair.
  - `node operate.mjs advance` → calls `advance_phase`.
  - Runs with the deployer wallet from `wallet.json` (it's the operator).
- [ ] Clearing algorithm lives in `deploy-preprod/src/clearing.mjs` (plain JS, mirrors section 7 of ghost-protocol.md).

**Option B — cron/service** (for a real deployment): skip for v1.

- [ ] Manual run-through on preprod:
  1. Two test wallets (Alice=lender, Bob=borrower).
  2. Both deposit.
  3. Both submit+reveal bids.
  4. Operator clears.
  5. Bob repays.
  6. Both withdraw.

---

## Tier 8 — Backend read API (optional for v1)

The client currently hits `/api/v1/lender-status/{addr}` etc. These don't exist anymore (the old EVM backend is gone).

Two paths:

**Path A — Remove backend entirely**, read everything directly from the contract ledger in the client. Simpler, less infra. Recommended.
- [ ] Rewrite `ProfilePage`, `StatusTab`, `PoolDetailPage`, `useNotifications.ts` to pull from `contract.callTx.ledger()` instead of HTTP.
- [ ] Drop `lib/api.ts` and the `SERVER` constant.

**Path B — New Midnight-native backend**: indexer that watches the contract, exposes same endpoints as before. More work, only worth it if you want richer queries (history, aggregates, notifications).

Pick Path A for v1.

---

## Tier 9 — Smoke test checklist

Run before calling lending+borrowing "done":

- [ ] Lace on preprod, 2 wallets funded with genesis NIGHT.
- [ ] Wallet A deposits 500 NIGHT, balance reads correctly.
- [ ] Wallet A submits lend bid (300, 5%). Witness saved.
- [ ] Wallet B deposits 200 NIGHT. Submits borrow bid (100, 10%, collateral=150).
- [ ] Operator advances to REVEAL. Both reveal successfully.
- [ ] Operator advances to CLEARING. Runs clearing → r* picked → `settle` called once.
- [ ] Operator advances to ACTIVE. Loan appears in both wallets' position lists.
- [ ] Wallet B computes `total_due = 100 + 100 * r*/10000`, calls `repay`.
- [ ] Wallet A's balance goes up by `total_due`. Wallet B's collateral is released.
- [ ] Both withdraw to empty. Contract `total_deposits` == 0.
- [ ] Hard refresh — positions still visible from contract ledger.

---

## Open questions to answer before starting Tier 1

- Is the exact commitment hash scheme in `ghost.compact` documented anywhere, or do we reverse-engineer from `submit_lend` + `reveal_lend`? (Needed for witness-store.)
- Does `@midnight-ntwrk/midnight-js-contracts` v4 work inside a Next.js client component (browser WASM)? If not, we need a server action / route handler as a proxy.
- Is the Ghost contract already connected to an indexer on preprod, or do we hit the node directly?
- Does the existing `ghost-contract/src/test/ghost.test.ts` simulator expose helpers we can port to the browser for commitment hashing?
