# GHOST CLI Wallet - Quick Start

## ✅ Implementation Complete

Fully functional mnemonic-based CLI wallet for Midnight Network.

## Build & Run

```bash
cd ghost-cli
npm install
npm run build

# Test wallet (hardcoded mnemonic)
node dist/test-wallet.js

# Full interactive CLI
node dist/index.js
```

## What Works

✅ **Wallet Creation**
- HD derivation from 24-word mnemonic
- Automatic sync with Midnight network
- Address generation (Bech32m format)

✅ **Balance Display**
- Shielded balance
- Unshielded balance
- Dust balance

✅ **Operations**
- **Send** - Transfer NIGHT tokens
- **Receive** - Show wallet address
- **Fund** - Get tokens from genesis (localnet)

✅ **Storage**
- Mnemonic saved to `~/.ghost/wallet.json`
- Auto-load on subsequent runs

## Test Result

```
INFO: Building wallet from test mnemonic...
INFO: Syncing wallet...
INFO: Wallet address: mn_addr_undeployed1am8kmkrjqcefgp00jw3uttvd4f5aq8gz8292y67e2pwd9cy8pypqz3jusv
```

**Status:** Wallet connects, syncs, displays address ✅

## Prerequisites

**For full functionality:**
1. Midnight localnet running (from midnight-local-dev)
2. Indexer at `http://127.0.0.1:8088/api/v3/graphql`
3. Node at `http://127.0.0.1:9944`

**Without localnet:**
- Wallet creation works
- Sync will timeout (expected)

## Architecture

**Core Files:**
- `src/wallet-api.ts` - Wallet SDK integration
- `src/wallet-store.ts` - Mnemonic persistence
- `src/index.ts` - Interactive CLI
- `src/test-wallet.ts` - Quick test

**Excluded (Contract-dependent):**
- `src/api.ts` - Old implementation with ghost contract
- `src/deploy.ts` - Contract deployment
- `src/common-types.ts` - Contract types

## Notes

- **Lend/Borrow** - Menu stubs exist, need contract deployment
- **SDK Version** - Uses Midnight SDK v1 (ledger-v7, wallet-sdk 1.0.0)
- **Network** - Currently configured for `undeployed` (localnet)

## Next Steps (Optional)

To enable Lend/Borrow contract operations:
1. Fix ghost contract SDK compatibility issues
2. Re-enable contract deployment in api.ts
3. Implement circuit calls for lending/borrowing

See `MIGRATION_NOTES.md` for details.
