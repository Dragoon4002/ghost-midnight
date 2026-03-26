# Ghost CLI Wallet Implementation - Migration Notes

## Current Status

Implemented new wallet CLI with:
- ✅ Mnemonic storage (~/.ghost/wallet.json)
- ✅ 24-word phrase input/validation
- ✅ New menu (Lend/Borrow/Send/Receive/Fund)
- ⚠️  SDK compatibility issues

## SDK Version Problem

**ghost-midnight** uses Midnight SDK v1:
- `@midnight-ntwrk/ledger-v7`
- `@midnight-ntwrk/wallet-sdk-*` 1.0.0
- `WalletFacade.build()` (old API)
- `HDWallet.fromSeed()` returns different structure

**midrun** uses Midnight SDK v2:
- `@midnight-ntwrk/ledger-v8`
- `@midnight-ntwrk/wallet-sdk-*` 2.0.0+
- `WalletFacade.init()` (new API)
- Different HD key derivation

## Required Changes to Complete

### Option 1: Update SDK (Recommended)
1. Update package.json dependencies to SDK v2
2. Rebuild ghost contract with new SDK
3. Test all contract circuits

### Option 2: Keep SDK v1 (Quick Fix)
1. Revert wallet init to old `WalletFacade.build()` pattern
2. Fix HD key derivation for v1 API
3. Limited by ghost contract compatibility

## Files Modified

- `src/wallet-store.ts` - NEW: Mnemonic persistence
- `src/index.ts` - Refactored to new wallet-first flow
- `src/api.ts` - Updated wallet init (currently broken on v1 SDK)

## Next Developer Actions

Choose Option 1 or 2 above, then:
1. Fix compilation errors
2. Test on localnet
3. Implement lend/borrow contract calls
