# GHOST CLI Wallet

Mnemonic-based CLI wallet for GHOST Finance on Midnight Network.

## Features

✅ **Wallet Management**
- Mnemonic phrase (24 words) storage in `~/.ghost/wallet.json`
- Automatic wallet creation from seed
- HD key derivation (BIP-44)

✅ **Operations**
- **Send** - Transfer NIGHT tokens (unshielded)
- **Receive** - Display your wallet address
- **Fund Wallet** - Get tokens from genesis (localnet only)
- **Lend** - Submit lending bids (stub - needs contract deployment)
- **Borrow** - Submit borrow bids (stub - needs contract deployment)

✅ **Wallet Info Display**
- Unshielded address (Bech32m format)
- Balances (shielded/unshielded/dust)
- Network endpoint

## Setup

### Prerequisites

1. **Midnight localnet running** (from midnight-local-dev)
2. **Node.js** v20+

### Installation

```bash
cd ghost-cli
npm install
```

### Build

```bash
npm run build
```

## Usage

### Test Wallet (No Mnemonic Prompt)

Quick test with hardcoded Alice mnemonic:

```bash
node dist/test-wallet.js
```

### Full CLI (Interactive)

Run the full wallet CLI with mnemonic prompt:

```bash
node dist/index.js
```

**First Run:**
- Enter your 24-word mnemonic phrase
- Phrase is saved to `~/.ghost/wallet.json`

**Subsequent Runs:**
- Auto-loads saved mnemonic
- No re-entry needed

### Menu Options

```
1. Lend          - Submit lending bid (requires contract)
2. Borrow        - Submit borrow bid (requires contract)
3. Send          - Transfer NIGHT tokens
4. Receive       - Show your address
5. Fund Wallet   - Get tokens from genesis (localnet only)
6. Refresh       - Update wallet info display
0. Exit
```

## Configuration

Edit `src/config.ts` for network endpoints:

```typescript
export class LocalConfig implements Config {
  readonly indexer = 'http://127.0.0.1:8088/api/v3/graphql';
  readonly indexerWS = 'ws://127.0.0.1:8088/api/v3/graphql/ws';
  readonly node = 'http://127.0.0.1:9944';
  readonly proofServer = 'http://127.0.0.1:6300';
}
```

## Architecture

### Files

- `src/wallet-api.ts` - Core wallet operations (SDK v1)
- `src/wallet-store.ts` - Mnemonic persistence
- `src/index.ts` - Main CLI interface
- `src/test-wallet.ts` - Quick test script
- `src/config.ts` - Network configuration

### SDK Version

Uses **Midnight SDK v1**:
- `@midnight-ntwrk/ledger-v7` 7.0.0
- `@midnight-ntwrk/wallet-sdk-facade` 1.0.0
- `WalletFacade` constructor pattern (not `.init()`)

## Test Accounts

From `midnight-local-dev/accounts.json`:

**Alice:**
```
young popular balance act bean merry green bulk become south tank magnet
real pride leopard noodle wild hurdle tissue jump city blur spring emerge
```

**Address:** `mn_addr_undeployed1am8kmkrjqcefgp00jw3uttvd4f5aq8gz8292y67e2pwd9cy8pypqz3jusv`

## Development

### Add New Operation

1. Add function to `src/wallet-api.ts`
2. Add handler to `src/index.ts`
3. Add menu option

### Contract Operations

Lend/Borrow stubs exist but need:
- Contract deployment (currently disabled)
- Fix ghost contract SDK compatibility
- Implement circuit calls

See `MIGRATION_NOTES.md` for details.

## Troubleshooting

**"Waiting for sync..." loops forever**
- Ensure midnight-local-dev is running
- Check network endpoints in config

**"Invalid mnemonic phrase"**
- Must be exactly 24 words
- Use BIP39 wordlist

**"No funds"**
- Use "Fund Wallet" option (localnet only)
- Or transfer from another wallet

## License

Apache-2.0
