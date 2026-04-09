# Deploy GHOST to Midnight Preprod

End-to-end guide for deploying the GHOST Finance contract to Midnight preprod from a fresh machine.

Adapted from [Debanjannnn/Midnight-Fix](https://github.com/Debanjannnn/Midnight-Fix). Uses Midnight SDK 4.x (`midnight-js-contracts@4.0.2`, `ledger-v8@8.0.3`, `compact-js@2.5.0`).

## Prereqs

- Node.js >= 20
- Docker (for proof server)
- Compiled contract artifacts at [../ghost-contract/src/managed/ghost/](../ghost-contract/src/managed/ghost) (compiler, contract, keys, zkir)

## Steps

### 1. Install deps

```bash
cd ghost-midnight/deploy-preprod
npm install
```

### 2. Copy managed artifacts locally (CRITICAL)

```bash
cp -r ../ghost-contract/src/managed ./managed
```

**Why:** the dynamic `import()` in [deploy.mjs](deploy.mjs) must resolve `@midnight-ntwrk/compact-runtime` from `deploy-preprod/node_modules` — the same instance used by `compact-js`. If you import from `../ghost-contract/src/managed/ghost/contract/index.js` directly, Node resolves `compact-runtime` from `ghost-contract/node_modules`, loading a **separate WASM instance** of `onchain-runtime-v3`. Deploy then fails with:

```
Error: expected instance of ContractMaintenanceAuthority
```

even though both trees have identical package versions. Two WASM instances = two disjoint class hierarchies.

Re-copy after every `compact compile`.

### 3. Start the preprod proof server

```bash
docker run -d --name midnight-proof-server-preprod \
  -p 6301:6300 \
  midnightntwrk/proof-server:latest \
  midnight-proof-server -v
```

Port 6301 (not the default 6300) so it doesn't clash with a local-dev proof server if you run both. Matches `PROOF_SERVER` in [deploy.mjs:45](deploy.mjs#L45).

### 4. Generate a wallet

```bash
node gen-wallet.mjs
```

Writes [wallet.json](wallet.json) (`{ seed, address, network: "preprod" }`, mode 0600). Prints the bech32 unshielded address. Keep the seed secret — it's the only key material.

### 5. Fund from the faucet

Open <https://faucet.preprod.midnight.network/>, paste the address, request tNIGHT. Wait **2–5 minutes** for inclusion.

### 6. Deploy

```bash
node deploy.mjs
```

What it does:

1. Loads `wallet.json`, derives HD keys for `Zswap`, `NightExternal`, `Dust` roles.
2. Boots `WalletFacade` against the preprod indexer + node + local proof server.
3. Syncs all three wallet streams against the preprod chain. First sync ~5 min (level-db cold); subsequent runs resume from `.midnight-level-db/`.
4. If `dust.availableCoins` is empty, registers the NIGHT UTXOs for DUST generation and waits for the first DUST to accrue.
5. Loads `./managed/ghost` via `CompiledContract.make(...).pipe(withVacantWitnesses, withCompiledFileAssets(zkConfigPath))`.
6. Calls `deployContract(providers, { compiledContract, privateStateId: 'ghostPrivateState', initialPrivateState: {}, args: [adminKey] })`.
   - `adminKey` = the deployer's 32-byte coin public key (the ghost constructor takes `admin: Bytes<32>`).
7. Writes `deployment.json` with `contractAddress`, `txId`, `deployer`, `admin`, `deployedAt`.

Expected output:

```
=== GHOST DEPLOYED ===
Address: 81b3053a8b521a91cf075204f443f8216c81a29ac7e1c37d9532fd81ef531cfb
Network: preprod
Tx ID:   006a5a0e4a66b386c96c9662b22a49f0eca5949babf60de20847a9d25e4b49d832
```

## Layout

```
deploy-preprod/
├── deploy.mjs          # main deploy script
├── gen-wallet.mjs      # wallet seed generator
├── package.json        # SDK 4.x pinned deps
├── wallet.json         # seed + address (gitignored, 0600)
├── deployment.json     # post-deploy artifact (gitignored)
├── managed/ghost/      # local copy of compiled contract (gitignored)
└── .midnight-level-db/ # wallet sync cache (gitignored)
```

## Gotchas

### WASM instance mismatch
See step 2. Any dynamic-import path that falls through to a second `node_modules` tree will hit `expected instance of ContractMaintenanceAuthority`. Keep artifacts inside `deploy-preprod/`.

### Sync appears stuck
The Midnight-Fix template uses `process.stdout.write(..., '\r')` which silently overwrites in some terminals, making sync look frozen. [deploy.mjs](deploy.mjs) logs throttled `console.log` lines with percentages:

```
[sync] isSynced=false shielded=42.3% unshielded=100% dust=42.3%
```

If both shielded/dust stay at ~42% for >10 min, kill and delete `.midnight-level-db/` to force a fresh sync.

### State shape (SDK 4.x)
Progress lives under `state.<chain>.state.progress`:

- `shielded` / `dust`: `{ appliedIndex, highestRelevantWalletIndex, isConnected }`
- `unshielded`: `{ appliedId, highestTransactionId, isConnected }`

`appliedIndex` / `highestRelevantWalletIndex` are BigInts — cast before division.

### BigInt in JSON
Any `JSON.stringify` of wallet state needs a replacer: `(k, v) => typeof v === 'bigint' ? v.toString() : v`.

### Proof server port
Local-dev uses 6300. Preprod uses 6301 here. Changing `PROOF_SERVER` at [deploy.mjs:45](deploy.mjs#L45) must match the `-p` flag on the docker run.

### Re-deploy
Delete `.midnight-level-db/` and `ghost-private-state/` to force a clean state. The wallet seed is reused from `wallet.json`.

## Explorer visibility

Preprod explorer indexing lags the chain. A freshly deployed contract may take several blocks to appear. The contract address in `deployment.json` is authoritative — it's the canonical on-chain address returned by the node. Query it directly via `publicDataProvider.queryContractState(address)` before trusting explorer UIs.

## Network endpoints

| | URL |
|---|---|
| Indexer (HTTP) | `https://indexer.preprod.midnight.network/api/v3/graphql` |
| Indexer (WS) | `wss://indexer.preprod.midnight.network/api/v3/graphql/ws` |
| Node | `https://rpc.preprod.midnight.network` |
| Proof server (local) | `http://127.0.0.1:6301` |
| Faucet | `https://faucet.preprod.midnight.network/` |
