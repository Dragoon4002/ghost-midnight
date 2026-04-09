# v0 Architecture — ghost-cli ⇄ ghost-server

Minimal end-to-end lend/borrow demo. No contract yet. No UI yet. Single pool, direct wallet-to-wallet settlement.

See [ghost-protocol.md](./ghost-protocol.md) for the target v1+ design and [ghost-reference.md](./ghost-reference.md) for EVM reference notes.

## Goals for v0

1. User runs `ghost-cli`, connects Midnight wallet
2. Submits lend or borrow intent (HTTP POST to ghost-server)
3. ghost-server matches intents every 5s using uniform clearing rate
4. On match, lender's CLI receives notification via match poller
5. Lender executes direct wallet→wallet `sendUnshieldedTransfer` to borrower
6. Lender confirms settlement to ghost-server; loan marked `active`
7. Every step structured-logged with color codes

## Non-goals v0

- Sealed-bid commit/reveal phases — deferred
- Contract deposit / settle / repay circuits — deferred
- Collateral enforcement — stored but not validated
- Liquidation, interest, repayment — deferred
- Dashboard / Next.js client — deferred
- Auth (EIP-712 / Lace sign-in) — deferred
- Partial fill splitting — intents match 1:1 only, any excess lend capacity is dropped for the epoch

## Components

```
┌──────────────┐    HTTP     ┌──────────────┐    Mongoose    ┌──────────────┐
│  ghost-cli   │<──────────>│  ghost-server │<─────────────>│ MongoDB Atlas│
│  (Alice)     │            │   (hono)      │                │              │
└──────┬───────┘            │               │                └──────────────┘
       │                    │  ┌──────────┐ │
       │                    │  │ matching │ │
       │                    │  │  5s tick │ │
       │                    │  └──────────┘ │
       │                    └───────────────┘
       │                          ▲
       │                          │
       │   sendUnshieldedTransfer │   HTTP
       │   (Midnight node/proof)  │
       ▼                          │
┌──────────────┐                  │
│  ghost-cli   │──────────────────┘
│   (Bob)      │
└──────────────┘
```

## Data models (MongoDB)

See [ghost-server/src/models/](../ghost-server/src/models/).

### LendIntent
```
intentId: string (unique)
lender: bech32m address
amount: string (bigint, microNIGHT)
rMin: number (basis points)
status: 'open' | 'matched' | 'cancelled'
matchedLoanId?: string
createdAt, matchedAt
```

### BorrowIntent
```
intentId: string
borrower: address
amount: string
rMax: number (bps)
collateral: string (v0: not enforced)
status: 'open' | 'matched' | 'cancelled'
matchedLoanId?: string
createdAt, matchedAt
```

### Loan
```
loanId: string
lender, borrower: address
principal: string
rate: number (bps)
lendIntentId, borrowIntentId: string
status: 'awaiting-settlement' | 'active' | 'failed'
settlementTxId?: string
createdAt, settledAt
```

## HTTP API

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/health` | — | `{ ok, openIntents, activeLoans }` |
| POST | `/api/v1/intents/lend` | `{ lender, amount, rMin }` | → `{ intentId }` |
| POST | `/api/v1/intents/borrow` | `{ borrower, amount, rMax, collateral }` | → `{ intentId }` |
| POST | `/api/v1/intents/:id/cancel` | — | cancel open intent |
| GET | `/api/v1/intents` | — | all intents + loans |
| GET | `/api/v1/intents/by/:addr` | — | intents for one addr |
| GET | `/api/v1/matches/:addr` | — | loans for one addr (lender or borrower) |
| POST | `/api/v1/loans/:id/settle` | `{ txId }` | mark loan active |

See [ghost-server/src/routes.ts](../ghost-server/src/routes.ts).

## Matching algorithm

Runs every `EPOCH_MS` (default 5s) in [ghost-server/src/matching.ts](../ghost-server/src/matching.ts).

```
lends    = open LendIntents sorted by rMin asc
borrows  = open BorrowIntents sorted by rMax desc

candidates = sorted distinct {lends.rMin ∪ borrows.rMax}

for r in candidates:
  supply(r) = Σ lends.amount where rMin ≤ r
  demand(r) = Σ borrows.amount where rMax ≥ r
  matched(r) = min(supply, demand)

r* = argmax matched(r)   (tie-break: lowest r)

greedy pair lends × borrows at rate r*:
  for each lend L in asc order:
    find first borrow B (desc order) with B.amount ≤ L.amount
    create Loan { principal: B.amount, rate: r*, status: awaiting-settlement }
    mark both intents matched
```

**v0 simplification**: no partial splits. A lend can only be fully consumed by a single borrow whose amount ≤ lend's amount. Any unused lend capacity is dropped for the epoch (intent still closes as matched). Clean 1:1 loans, no tracking of remaining amounts.

## ghost-cli flow

1. Start via `npm run start`. Prompts for mnemonic (saved to `~/.ghost/wallet.json`).
2. Wallet syncs against local Midnight node.
3. Background match poller starts (5s interval).
4. Main menu:
   ```
   1. Lend Intent        → POST /intents/lend          yellow log
   2. Borrow Intent      → POST /intents/borrow        green log
   3. List All Intents   → GET /intents                prints table
   4. My Loans           → GET /matches/{addr}         prints table
   5. Settle Loan        → sendUnshieldedTransfer +    blue → bright green
                           POST /loans/{id}/settle
   6. Send (raw)         → sendUnshieldedTransfer      existing
   7. Receive            → show address                existing
   8. Fund Wallet        → genesis → wallet            existing (localnet)
   9. Refresh Info       → print wallet state          existing
   0. Exit
   ```
5. Poller detects new `awaiting-settlement` loans where the wallet is lender or borrower → logs cyan "intent matched" notification.

See [ghost-cli/src/index.ts](../ghost-cli/src/index.ts), [ghost-cli/src/server-client.ts](../ghost-cli/src/server-client.ts), [ghost-cli/src/logger.ts](../ghost-cli/src/logger.ts).

## Color-coded logging

Both server and CLI use pino + pino-pretty with custom levels mapped to colors.

| Event | Pino level | Color | When |
|---|---|---|---|
| error / fatal | `error` | red | any failure |
| warning | `warn` | yellow | recoverable issues |
| info | `info` | gray | general status |
| lend intent | `lendIntent` | yellow | POST /intents/lend |
| borrow intent | `borrowIntent` | green | POST /intents/borrow |
| match | `match` | cyan | intents matched → loan created, or CLI poller detects |
| transfer | `transfer` | blue | CLI calling sendUnshieldedTransfer |
| loan active | `loanActive` | magenta | loan marked active after settle |
| success | `success` | bright green | final success confirmations |

Implementation: [ghost-server/src/logger.ts](../ghost-server/src/logger.ts), [ghost-cli/src/logger.ts](../ghost-cli/src/logger.ts).

## Settlement flow

```
ghost-server       Alice (lender)           Bob (borrower)
    │                    │                         │
    │── loan created ────┼─────────────────────────┤
    │                    │                         │
    │   (poller 5s)      │                         │
    │<── GET /matches ───┤                         │
    │── loan list ──────>│                         │
    │                    │ log cyan "match!"       │
    │                    │                         │
    │                    │ menu 5: Settle          │
    │                    │ log blue "transferring" │
    │                    ├── sendUnshieldedTx ────>│
    │                    │         │               │
    │                    │         │ (Midnight)    │
    │                    │<────────┘               │
    │<── POST /settle ───┤                         │
    │── loan active ────>│                         │
    │                    │ log bright green "done" │
    │                    │                         │
    │   (poller 5s)      │                         │
    │<── GET /matches ───┼─────────────────────────┤
    │── loan active ─────┼────────────────────────>│
    │                    │                         │ log magenta "loan active"
```

"Principal locked, loan created" semantics for v0:
- **Loan created** = DB record in ghost-server with `status: awaiting-settlement`
- **Principal locked/transferred** = on-chain unshielded transfer from lender's wallet to borrower's wallet
- **Loan active** = DB status flipped to `active` after lender reports settlement txId

## Running the demo

### 1. Start ghost-server

```bash
cd ghost-midnight/ghost-server
npm install
cp .env.example .env
# set MONGODB_URI in .env
npm run dev
```

### 2. Start Midnight localnet (for wallet sync)

```bash
cd ../midnight-local-dev
# follow local-dev README
```

### 3. Run two ghost-cli instances

Terminal A (Alice, lender):
```bash
cd ghost-midnight/ghost-cli
npm install
npm run start
# enter Alice mnemonic, fund wallet, menu 1 (Lend)
# amount=1000000, rMin=500
```

Terminal B (Bob, borrower):
```bash
cd ghost-midnight/ghost-cli
npm run start
# use a different HOME or delete ~/.ghost/wallet.json to enter Bob's mnemonic
# fund wallet, menu 2 (Borrow)
# amount=1000000, rMax=800, collateral=1500000
```

Within 5s of Bob's borrow submission both CLIs should log cyan "intent matched".

Alice: menu 5 (Settle) → picks the loan → CLI transfers 1_000_000 µN to Bob's address → loan marked active.

Bob: menu 4 (My Loans) → sees loan as `active`.

## Paths to extend for v1

- **Contract wiring** — replace direct send with `deposit` + phase advance + `settle` circuits from [ghost-cli/src/api.ts](../ghost-cli/src/api.ts) L293-387 (wrappers already exist)
- **Commitment hash** — add witness-store + sha256 commitment builder from [ghost-contract/src/witnesses.ts](../ghost-contract/src/witnesses.ts)
- **Dashboard** — Next.js client in `client/` polls same `/api/v1/intents` endpoint for display
- **Auth** — sign request bodies with wallet's unshielded keystore; verify on server
- **Partial fills** — allow 1 lend to split across N borrows, track `remaining` per intent
- **Repay flow** — borrower triggers repayment tx, server computes `total_due`, lender receives
