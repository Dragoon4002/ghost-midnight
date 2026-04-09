# GHOST Server

Intent matching backend for ghost-cli. v0 = direct wallet→wallet settlement, no contract.

## Setup

```bash
cd ghost-server
npm install
cp .env.example .env
# default DATA_FILE=./data/ghost-data.json works out of the box
npm run dev
```

Expect:
```
[info] booting ghost-server
[info] store initialized { dataFile: ./data/ghost-data.json }
[info] matching engine started { epochMs: 5000 }
[success] ghost-server listening on :8080
```

## Persistence (v0)

- **JSON file** at `DATA_FILE` (default `./data/ghost-data.json`).
- Whole snapshot loaded into memory on boot.
- Every mutation atomically rewrites the file via tmp + rename.
- `src/db.ts` and `src/models/*` contain Mongoose code kept as dead code for
  a future swap-in to MongoDB; nothing imports them in v0.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness + counts |
| POST | `/api/v1/intents/lend` | `{ lender, amount, rMin }` |
| POST | `/api/v1/intents/borrow` | `{ borrower, amount, rMax, collateral }` |
| POST | `/api/v1/intents/:id/cancel` | cancel open intent |
| GET | `/api/v1/intents` | all intents + loans (dashboard) |
| GET | `/api/v1/intents/by/:addr` | intents for one address |
| GET | `/api/v1/matches/:addr` | loans where addr is lender or borrower |
| POST | `/api/v1/loans/:id/settle` | `{ txId }` — mark active |

## Matching engine

Every `EPOCH_MS` ms the server:
1. Reads all `open` lend + borrow intents
2. Computes uniform clearing rate `r*` that maximizes matched volume
3. Greedy-pairs cheapest lends × highest-rMax borrows
4. V0: no partial splits — only pairs where lend.amount ≥ borrow.amount match, at borrow.amount
5. Creates `Loan { status: 'awaiting-settlement' }` per pair
6. Lender's CLI polls `/matches/{addr}`, sees loan, executes wallet transfer, POSTs `/loans/:id/settle`

## Logging

Color-coded pino output:

| Level | Color | Event |
|---|---|---|
| `error` | red | errors |
| `warn` | yellow | warnings |
| `info` | gray | general |
| `lendIntent` | yellow | new lend intent |
| `borrowIntent` | green | new borrow intent |
| `match` | cyan | intent matched → loan created |
| `transfer` | blue | transfer in flight |
| `loanActive` | magenta | loan settled |
| `success` | bright green | success confirmations |

## Env

```
DATA_FILE=./data/ghost-data.json
PORT=8080
EPOCH_MS=5000
LOG_LEVEL=info
# MONGODB_URI=...   (unused in v0; reserved for future)
```
