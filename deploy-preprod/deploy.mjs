/**
 * Deploy the GHOST Finance contract to Midnight preprod.
 *
 * Adapted from https://github.com/Debanjannnn/Midnight-Fix/blob/main/deploy.mjs
 * for the Ghost contract (constructor takes Bytes<32> admin).
 *
 * Prereqs:
 *   - node gen-wallet.mjs (creates ./wallet.json)
 *   - faucet-fund the printed address, wait 2-5 min for DUST
 *   - local proof server running:
 *       docker run -d -p 6300:6300 midnightntwrk/proof-server:latest \
 *         midnight-proof-server -v
 */
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import * as Rx from 'rxjs';
import path from 'node:path';
import fs from 'node:fs';
import { Buffer } from 'buffer';
import { WebSocket } from 'ws';

globalThis.WebSocket = WebSocket;

// ─── Network ───────────────────────────────────────────────────────
const NETWORK_ID = 'preprod';
const INDEXER = 'https://indexer.preprod.midnight.network/api/v3/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';
const NODE = 'https://rpc.preprod.midnight.network';
const PROOF_SERVER = 'http://127.0.0.1:6301';

// ─── Wallet ────────────────────────────────────────────────────────
const WALLET_FILE = path.resolve('wallet.json');
if (!fs.existsSync(WALLET_FILE)) {
  console.error('wallet.json not found. Run: node gen-wallet.mjs');
  process.exit(1);
}
const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
console.log(`Wallet: ${walletData.address}`);

// ─── Contract location ─────────────────────────────────────────────
// Use local copy under ./managed/ghost so dynamic import resolves
// @midnight-ntwrk/compact-runtime from deploy-preprod's node_modules
// (avoids the `expected instance of ContractMaintenanceAuthority` error
// caused by two WASM instances from separate node_modules trees).
// Keep this in sync with ../ghost-contract/src/managed/ghost after recompilation.
const zkConfigPath = path.resolve('managed', 'ghost');
const contractIndexPath = path.resolve(zkConfigPath, 'contract', 'index.js');
if (!fs.existsSync(contractIndexPath)) {
  console.error(`ghost contract not compiled. Expected: ${contractIndexPath}`);
  console.error('Copy ../ghost-contract/src/managed/ghost here or recompile:');
  console.error('  cp -r ../ghost-contract/src/managed ./managed');
  process.exit(1);
}

async function main() {
  setNetworkId(NETWORK_ID);

  // Load contract
  const contractModule = await import(contractIndexPath);
  const compiledContract = CompiledContract.make('ghost', contractModule.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );
  console.log('Contract loaded.');

  // Derive keys
  const keys = deriveKeysFromSeed(walletData.seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  // Wallet config (mirrors Midnight-Fix)
  const walletConfig = {
    networkId: getNetworkId(),
    indexerClientConnection: { indexerHttpUrl: INDEXER, indexerWsUrl: INDEXER_WS },
    provingServerUrl: new URL(PROOF_SERVER),
    relayURL: new URL(NODE.replace(/^http/, 'ws')),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  };

  console.log('Initializing wallet...');
  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) =>
      UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) =>
      DustWallet(cfg).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  console.log('Wallet started. Syncing (preprod first sync ~5min)...');

  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10000),
      Rx.tap((s) => {
        const sh = s.shielded?.state?.progress;
        const us = s.unshielded?.state?.progress;
        const d = s.dust?.state?.progress;
        const pct = (a, b) => {
          if (a == null || b == null) return '?';
          const ai = typeof a === 'bigint' ? a : BigInt(a);
          const bi = typeof b === 'bigint' ? b : BigInt(b);
          if (bi === 0n) return '0%';
          return `${((Number(ai) / Number(bi)) * 100).toFixed(1)}%`;
        };
        const shStr = sh ? `${pct(sh.appliedIndex, sh.highestRelevantWalletIndex)}` : '-';
        const usStr = us ? `${pct(us.appliedId, us.highestTransactionId)}` : '-';
        const dStr = d ? `${pct(d.appliedIndex, d.highestRelevantWalletIndex)}` : '-';
        console.log(`[sync] isSynced=${s.isSynced} shielded=${shStr} unshielded=${usStr} dust=${dStr}`);
      }),
      Rx.filter((s) => s.isSynced),
    ),
  );
  console.log('Wallet synced.');

  let state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const balance = state.unshielded.balances[ledger.unshieldedToken().raw] ?? 0n;
  console.log(`tNight balance: ${balance.toLocaleString()}`);

  if (balance === 0n) {
    console.error('No tNight. Fund via https://faucet.preprod.midnight.network/');
    process.exit(1);
  }

  // Register UTXOs for DUST if no DUST yet
  if (state.dust.availableCoins.length === 0) {
    const nightUtxos = state.unshielded.availableCoins.filter(
      (c) => c.meta?.registeredForDustGeneration !== true,
    );
    if (nightUtxos.length > 0) {
      console.log(`Registering ${nightUtxos.length} NIGHT UTXO(s) for DUST generation...`);
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        unshieldedKeystore.getPublicKey(),
        (p) => unshieldedKeystore.signData(p),
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      await wallet.submitTransaction(finalized);
      console.log('Registration submitted. Waiting for DUST to accrue...');
    }
    await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.tap((s) => {
          const d = s.dust.balance(new Date());
          process.stdout.write(`  dust=${d}\r`);
        }),
        Rx.filter((s) => s.isSynced && s.dust.balance(new Date()) > 0n),
      ),
    );
    console.log('');
  }

  state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const dustBal = state.dust.balance(new Date());
  console.log(`DUST balance: ${dustBal.toLocaleString()}`);

  // Providers
  const walletProvider = await createWalletAndMidnightProvider({
    wallet,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
  });
  const accountId = walletProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'ghost-private-state',
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER, INDEXER_WS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(PROOF_SERVER, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  // Ghost constructor takes admin: Bytes<32>. Use the deployer's coin public key bytes.
  const adminKey = Buffer.from(accountId, 'hex');
  if (adminKey.length !== 32) {
    throw new Error(`expected 32-byte admin key, got ${adminKey.length}`);
  }

  console.log('Deploying GHOST contract (30-60 seconds)...');
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: 'ghostPrivateState',
    initialPrivateState: {},
    args: [adminKey],
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('\n=== GHOST DEPLOYED ===');
  console.log(`Address: ${contractAddress}`);
  console.log(`Network: ${NETWORK_ID}`);
  console.log(`Tx ID:   ${deployed.deployTxData.public.txId}`);

  fs.writeFileSync(
    'deployment.json',
    JSON.stringify(
      {
        contractAddress,
        network: NETWORK_ID,
        deployedAt: new Date().toISOString(),
        deployer: walletData.address,
        admin: adminKey.toString('hex'),
      },
      null,
      2,
    ),
  );
  console.log('Saved to deployment.json');
  await wallet.stop();
  process.exit(0);
}

function deriveKeysFromSeed(seed) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid seed');
  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();
  return result.keys;
}

function signTransactionIntents(tx, signFn, proofMarker) {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize('signature', proofMarker, 'pre-binding', intent.serialize());
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_, i) => cloned.fallibleUnshieldedOffer.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_, i) => cloned.guaranteedUnshieldedOffer.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
}

async function createWalletAndMidnightProvider(ctx) {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey() {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx);
    },
  };
}

main().catch((err) => {
  console.error('DEPLOY FAILED:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
