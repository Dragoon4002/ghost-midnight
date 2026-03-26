/**
 * GHOST Finance — Deploy to localnet
 *
 * Prerequisites:
 * 1. midnight-local-dev running (docker containers up)
 * 2. Alice funded via midnight-local-dev (run it first, fund from config)
 * 3. ghost-contract compiled (npm run compact)
 *
 * Usage: npx ts-node --esm src/deploy.ts
 */

import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey as UnshieldedPublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import path from 'node:path';

import { Ghost, createPrivateState } from '@ghost/ghost-contract';

// @ts-expect-error: WebSocket polyfill
globalThis.WebSocket = WebSocket;

// ─── Config ────────────────────────────────────────────────────────

setNetworkId('undeployed');

const CONFIG = {
  indexer: 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  node: 'http://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  networkId: 'undeployed' as const,
};

const zkConfigPath = path.resolve(
  new URL(import.meta.url).pathname, '..', '..', '..', 'ghost-contract', 'src', 'managed', 'ghost'
);

const ALICE_MNEMONIC = 'young popular balance act bean merry green bulk become south tank magnet real pride leopard noodle wild hurdle tissue jump city blur spring emerge';

// ─── Wallet ────────────────────────────────────────────────────────

async function buildWallet() {
  const words = ALICE_MNEMONIC.trim().split(/\s+/);
  const seed = Buffer.from(await bip39.mnemonicToSeed(words.join(' ')));

  const hdWallet = HDWallet.fromSeed(seed);
  if (hdWallet.type !== 'seedOk') throw new Error('HDWallet init failed');

  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (derivationResult.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derivationResult.keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(derivationResult.keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(derivationResult.keys[Roles.NightExternal], CONFIG.networkId);

  const facade = await WalletFacade.init({
    configuration: {
      networkId: CONFIG.networkId,
      indexerClientConnection: {
        indexerHttpUrl: CONFIG.indexer,
        indexerWsUrl: CONFIG.indexerWS,
      },
      provingServerUrl: new URL(CONFIG.proofServer),
      relayURL: new URL(CONFIG.node.replace(/^http/, 'ws')),
      costParameters: {
        additionalFeeOverhead: 300_000_000_000_000n,
        feeBlocksMargin: 5,
      },
      txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    },
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(UnshieldedPublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await facade.start(shieldedSecretKeys, dustSecretKey);

  return { wallet: facade, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

// ─── Deploy ────────────────────────────────────────────────────────

async function main() {
  console.log('═══ GHOST Finance — Deploy to Localnet ═══\n');

  console.log('1. Building wallet...');
  const walletCtx = await buildWallet();

  console.log('2. Waiting for wallet sync...');
  await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(3000),
      Rx.tap((s) => process.stdout.write(`   synced: ${s.isSynced}\r`)),
      Rx.filter((s) => s.isSynced),
    ),
  );
  console.log('   Wallet synced.');

  const walletState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const nightBal = walletState.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const dustBal = walletState.dust.walletBalance(new Date());
  console.log(`   NIGHT: ${nightBal}, DUST: ${dustBal}`);

  if (dustBal <= 0n) {
    console.log('   No DUST — need to register NIGHT for dust generation first.');
    console.log('   Run midnight-local-dev and fund Alice first.');
    process.exit(1);
  }

  console.log('\n3. Setting up providers...');

  const walletAndMidnight = {
    getCoinPublicKey: () => walletState.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => walletState.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload: Uint8Array) => walletCtx.unshieldedKeystore.signData(payload);
      // Sign intents
      if (recipe.baseTransaction.intents) {
        for (const segment of recipe.baseTransaction.intents.keys()) {
          const intent = recipe.baseTransaction.intents.get(segment);
          if (!intent) continue;
          const cloned = ledger.Intent.deserialize('signature', 'proof', 'pre-binding', intent.serialize());
          const sig = signFn(cloned.signatureData(segment));
          if (cloned.fallibleUnshieldedOffer) {
            const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
              (_: any, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? sig,
            );
            cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
          }
          if (cloned.guaranteedUnshieldedOffer) {
            const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
              (_: any, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? sig,
            );
            cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
          }
          recipe.baseTransaction.intents.set(segment, cloned);
        }
      }
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    async submitTx(tx: ledger.FinalizedTransaction) {
      return await walletCtx.wallet.submitTransaction(tx);
    },
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'ghost-private-state' }),
    publicDataProvider: indexerPublicDataProvider(CONFIG.indexer, CONFIG.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(CONFIG.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnight,
    midnightProvider: walletAndMidnight,
  };

  console.log('4. Compiling contract...');
  const compiledContract = CompiledContract.make('ghost', Ghost.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  const adminKey = new Uint8Array(32); // deployer key

  console.log('5. Deploying GHOST contract...');
  const contract = await deployContract(providers, {
    compiledContract,
    privateStateId: 'ghostPrivateState',
    initialPrivateState: createPrivateState(adminKey),
    constructorArgs: [adminKey],
  });

  const address = contract.deployTxData.public.contractAddress;
  console.log(`\n✓ GHOST contract deployed!`);
  console.log(`  Address: ${address}`);
  console.log(`  Tx ID:   ${contract.deployTxData.public.txId}`);

  // Read initial state
  const state = await providers.publicDataProvider.queryContractState(address);
  if (state) {
    const l = Ghost.ledger(state.data);
    console.log(`  Phase:   ${l.phase} (0=BID)`);
    console.log(`  Epoch:   ${l.epoch_num}`);
  }

  console.log('\nDone. Press Ctrl+C to exit.');
  await walletCtx.wallet.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('Deploy failed:', e);
  process.exit(1);
});
