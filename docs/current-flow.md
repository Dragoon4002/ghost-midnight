# GHOST Midnight — Current Flow

Snapshot of where the codebase actually stands today (post-Privy purge, pre-Midnight contract wiring). Scope: lending / borrowing path.

## 1. Subprojects

```
ghost-midnight/
├── client/           Next.js 16 dApp (React 19). Midnight Lace connector wired.
├── ghost-contract/   Compact v1 contract (sealed-bid batch auction). Compiled.
├── deploy-preprod/   Deploy script. Contract deployed to preprod.
├── ghost-cli/        Node CLI wallet (SDK v1). Lend/Borrow menu items stubbed.
└── docs/             Protocol spec + this doc.
```

### Deployment state
- Contract address (preprod): `81b3053a8b521a91cf075204f443f8216c81a29ac7e1c37d9532fd81ef531cfb`
- Admin key: `14fdfbd80de345d1280a7c54552a5992cfc8fa01df75caf47787fe2eb3bd35f4`
- Client is NOT yet calling the contract. All write paths throw `EVM removed — rewrite for Midnight`.

## 2. Client: Wallet Flow (working)

```
User opens app
    ↓
MidnightWalletProvider mounts (app/layout.tsx)
    ↓
useMidnightWallet() available everywhere
    ↓
User clicks Connect (Navbar / ConnectWalletButton)
    ↓
waitForMidnight(networkId="preprod")         — polls window.midnight
    ↓
wallet.enable()                               — Lace approval popup
    ↓
api.getUnshieldedAddress() + getConfiguration()
    ↓
state: { isConnected:true, address:"mn_addr_preprod1...", connectedApi }
    ↓
Navbar shows truncated address, pink disconnect button
```

Relevant files:
- [wallet-wrapper.tsx](../client/src/components/providers/wallet-wrapper.tsx) — context + connect/disconnect
- [Navbar.tsx](../client/src/components/Navbar.tsx) — UI
- [ConnectWalletButton.tsx](../client/src/components/shared/ConnectWalletButton.tsx) — reusable CTA

No auto-reconnect. Hard refresh → disconnected. Matches midrun reference.

## 3. Client: Backend API (read path only)

Base URL: `SERVER` from [constants.ts](../client/src/lib/constants.ts) (default `http://localhost:8080`). Wrapped by [lib/api.ts](../client/src/lib/api.ts) (`get`, `post`, `ts`).

Read endpoints the UI actually hits:

| Endpoint | Caller | Purpose |
|---|---|---|
| `GET /health` | `fetchPoolAddress()` | Bootstrap pool address |
| `GET /api/v1/internal/pending-intents` | ExplorePage, HeroSection, PoolDetailPage | Pool-wide lend/borrow intents |
| `GET /api/v1/lender-status/{addr}` | LendCard, ProfilePage, StatusTab, PoolDetailPage, MigrateTab, useNotifications | User lender positions |
| `GET /api/v1/borrower-status/{addr}` | BorrowCard, ProfilePage, StatusTab, PoolDetailPage, useNotifications | User borrower positions |
| `GET /api/v1/credit-score/{addr}` | ProfilePage | Reputation tier |
| `GET /api/v1/swap-quote` | InfoTab | (EVM relic, to gut) |

Polling: [useNotifications.ts](../client/src/hooks/useNotifications.ts) polls lender+borrower status every 10s.

Write endpoints: none. Every submit handler in the UI currently throws.

## 4. Client: Lend Flow (as it stands)

```
/explore                                    — list of pools (one token per pool)
    ↓ click pool
/explore/[ticker]                           — PoolDetailPage
    ↓ click "Lend"
LendCard mounts (or /lend page)
    ↓
User picks coin + amount
    ↓
handleLend()
    ├─ setStatus("submitting")
    └─ throw new Error("EVM removed — rewrite for Midnight")
        ↓
    catch → toast error, setStatus("error")
```

Files: [LendCard.tsx](../client/src/components/lend/LendCard.tsx), [PoolDetailPage.tsx](../client/src/components/explore/pool-detail/PoolDetailPage.tsx)

UI shows existing lend intents (from `/lender-status/{addr}`) correctly, so the read half is live.

## 5. Client: Borrow Flow (as it stands)

```
/explore/[ticker] → BorrowCard  (or /borrow page)
    ↓
User picks coin + amount + (collateral UI hidden/stubbed)
    ↓
handleBorrow()
    └─ throw "EVM removed — rewrite for Midnight"
```

Files: [BorrowCard.tsx](../client/src/components/borrow/BorrowCard.tsx)

Collateral quote logic was ripped out during EVM purge. Component shows a single amount field; the 150% collateral requirement is not yet surfaced in the UI.

## 6. Client: Status / Repay / Withdraw

All write actions throw:
- [StatusTab.tsx](../client/src/components/status/StatusTab.tsx) — cancel lend/borrow intents
- [ProfilePositions.tsx](../client/src/components/profile/ProfilePositions.tsx) — repay loan
- [WithdrawCard.tsx](../client/src/components/profile/WithdrawCard.tsx) — withdraw balance
- [MigrateTab.tsx](../client/src/components/stake/tabs/MigrateTab.tsx) — cancel / withdraw

Read paths (positions, loans, pending payouts) render real server data if the backend returns it.

## 7. Still-EVM files (not yet migrated)

- [PoolDetailPage.tsx](../client/src/components/explore/pool-detail/PoolDetailPage.tsx) — still imports `usePrivy`, `useWallets`, and `meta.address` (field no longer exists on `Coin`)
- [PoolHeader.tsx](../client/src/components/explore/pool-detail/PoolHeader.tsx) — hard-coded `<Badge>Sepolia</Badge>`, takes `contractAddress` prop
- [InfoTab.tsx](../client/src/components/info/InfoTab.tsx) — full Wormhole bridge + swap pool, entirely EVM
- [ProfileHeader.tsx](../client/src/components/profile/ProfileHeader.tsx) — `ethers.JsonRpcProvider` for mainnet ENS + `sepolia.etherscan.io` link
- UI copy sweep pending across `infinity/`, `explore/`, `stake/`, `Footer.tsx`, `useNotifications.ts` (Sepolia / Chainlink CRE strings).

## 8. Contract: What's compiled & deployed

[ghost.compact](../ghost-contract/src/ghost.compact) exposes 9 circuits. Phase machine: `0 BIDDING → 1 REVEAL → 2 CLEARING → 3 ACTIVE → 0`.

| Circuit | Phase | Purpose |
|---|---|---|
| `deposit(owner, amount)` | any | add to balance |
| `withdraw(owner, amount)` | any | pull free balance |
| `submit_lend(commitment)` | 0 | sealed hash of (amount, r_min, nonce, owner) |
| `submit_borrow(commitment)` | 0 | sealed hash of (amount, r_max, collateral, nonce, owner) |
| `reveal_lend(commit, owner, amt, r_min)` | 1 | verify commit, check balance ≥ amt |
| `reveal_borrow(commit, owner, amt, r_max, coll)` | 1 | verify commit, check collateral ≥ 150% |
| `settle(rate, lend_slot, borrow_slot, match_amt)` | 2 | operator-only; lock funds, create loan |
| `repay(loan_id, caller, total_due)` | 3 | pay lender, release collateral |
| `advance_phase(caller)` | any | operator-only; 0→1→2→3→0 |

Max 8 lend bids + 8 borrow bids per epoch. Single collateral token (tDUST). Interest computed off-chain, verified on-chain via `total_due × 10000 ≥ principal × (10000 + rate)`.

Contract tests exist: [ghost.test.ts](../ghost-contract/src/test/ghost.test.ts) with a simulator.

## 9. What's missing end-to-end

- Client → contract: zero wiring. No contract-finder, no circuit calls, no commitment generation, no witness state.
- Client → backend: backend endpoints for submit / cancel / repay / withdraw do not exist (only status reads).
- UI: collateral ratio, phase display, epoch countdown, reveal-phase prompts — none shown.
- Operator: clearing engine + phase advancer runs nowhere. Someone needs to call `settle` + `advance_phase`.

See [midnight-todo.md](./midnight-todo.md) for the actionable gap list.
