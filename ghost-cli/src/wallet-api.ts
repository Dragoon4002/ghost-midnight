import { type Logger } from 'pino';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';

import { type Config } from './config.js';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  type UnshieldedKeystore,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';

let logger: Logger;

// @ts-expect-error: Needed for WebSocket in apollo
globalThis.WebSocket = WebSocket;

export function setLogger(_logger: Logger) {
  logger = _logger;
}

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

// ─── Wallet Setup ──────────────────────────────────────────────────

export const mnemonicToSeed = async (mnemonic: string): Promise<string> => {
  const words = mnemonic.trim().split(/\s+/);
  if (!bip39.validateMnemonic(words.join(' '), english)) {
    throw new Error('Invalid mnemonic phrase');
  }
  // Full 64-byte BIP-39 seed — matches midnight-local-dev. Truncating
  // to 32 bytes yields a different HD derivation and wallet address.
  const seed = await bip39.mnemonicToSeed(words.join(' '));
  return Buffer.from(seed).toString('hex');
};

const deriveKeysFromSeed = (seed: string) => {
  const hdResult = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdResult.type !== 'seedOk') {
    throw new Error('Failed to derive keys from seed');
  }

  // Match midnight-local-dev derivation exactly: batch-derive all roles at
  // index 0 in a single call. The previous recursive retry at index+1
  // produced different addresses than the canonical local-dev derivation.
  const derivationResult = hdResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (derivationResult.type !== 'keysDerived') {
    throw new Error(`Failed to derive keys: ${derivationResult.type}`);
  }

  const keys = derivationResult.keys;
  hdResult.hdWallet.clear();

  return {
    zswapSeed: Buffer.from(keys[Roles.Zswap]),
    dustSeed: Buffer.from(keys[Roles.Dust]),
    unshieldedKey: Buffer.from(keys[Roles.NightExternal]),
  };
};

export const buildWalletFromSeed = async (seed: string, config: Config): Promise<WalletContext> => {
  const keys = deriveKeysFromSeed(seed);

  const shieldedKeys = ledger.ZswapSecretKeys.fromSeed(keys.zswapSeed);
  const dustKey = ledger.DustSecretKey.fromSeed(keys.dustSeed);
  const unshieldedKeystore = createKeystore(keys.unshieldedKey, getNetworkId());

  const configuration = {
    networkId: getNetworkId(),
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    relayURL: new URL(config.node.replace(/^http/, 'ws')),
    provingServerUrl: new URL(config.proofServer),
    indexerClientConnection: {
      indexerHttpUrl: config.indexer,
      indexerWsUrl: config.indexerWS,
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  };

  const shieldedWallet = ShieldedWallet(configuration).startWithSecretKeys(shieldedKeys);
  const unshieldedWallet = UnshieldedWallet(configuration).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
  const dustWallet = DustWallet(configuration).startWithSecretKey(dustKey, ledger.LedgerParameters.initialParameters().dust);

  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedKeys, dustKey);

  return { wallet, shieldedSecretKeys: shieldedKeys, dustSecretKey: dustKey, unshieldedKeystore };
};

export const waitForSync = (wallet: WalletFacade): Promise<void> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap(() => logger.info('Waiting for sync...')),
      Rx.filter((state) => state.isSynced),
      Rx.map(() => undefined),
    ),
  );

export const waitForFunds = (wallet: WalletFacade): Promise<void> => {
  const nativeRaw = ledger.nativeToken().raw;
  const asBig = (v: unknown): bigint => {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number' || typeof v === 'string') return BigInt(v);
    return 0n;
  };
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter((state: any) => {
        const u = asBig(state.unshielded?.balances?.[nativeRaw]);
        const s = asBig(state.shielded?.balances?.[nativeRaw]);
        logger.info(
          `Waiting for funds. Synced: ${state.isSynced}, Unshielded: ${u}, Shielded: ${s}`,
        );
        return state.isSynced && u + s > 0n;
      }),
      Rx.map(() => undefined),
    ),
  );
};

// ─── Wallet Operations ─────────────────────────────────────────────

/**
 * Register unshielded NIGHT UTXOs for DUST generation. Must be done once
 * per wallet after receiving NIGHT — without it, the wallet has no DUST
 * and cannot pay tx fees.
 */
export const registerNightForDust = async (
  walletContext: WalletContext,
): Promise<boolean> => {
  const state: any = await Rx.firstValueFrom(
    walletContext.wallet.state().pipe(Rx.filter((s: any) => s.isSynced)),
  );

  const unregistered =
    state.unshielded?.availableCoins?.filter(
      (coin: any) => coin.meta?.registeredForDustGeneration === false,
    ) ?? [];

  if (unregistered.length === 0) {
    const bal = state.dust?.balance?.(new Date()) ?? 0n;
    logger.info(`no NIGHT UTXOs to register; current DUST: ${bal}`);
    return bal > 0n;
  }

  logger.info(`registering ${unregistered.length} NIGHT UTXOs for DUST generation`);

  const recipe = await (walletContext.wallet as any).registerNightUtxosForDustGeneration(
    unregistered,
    walletContext.unshieldedKeystore.getPublicKey(),
    (payload: Uint8Array) => walletContext.unshieldedKeystore.signData(payload),
  );
  const finalizedTx = await walletContext.wallet.finalizeRecipe(recipe);
  await walletContext.wallet.submitTransaction(finalizedTx);
  logger.info('dust registration tx submitted, waiting for DUST to accrue');

  await Rx.firstValueFrom(
    walletContext.wallet.state().pipe(
      Rx.tap((s: any) => {
        const bal = s.dust?.balance?.(new Date()) ?? 0n;
        logger.info(`DUST balance: ${bal}`);
      }),
      Rx.filter((s: any) => (s.dust?.balance?.(new Date()) ?? 0n) > 0n),
    ),
  );
  logger.info('dust registration complete');
  return true;
};

export const sendUnshieldedTransfer = async (
  walletContext: WalletContext,
  recipientAddress: string,
  amount: bigint,
): Promise<void> => {
  logger.info(`Sending ${amount} to ${recipientAddress}...`);

  const recipe = await walletContext.wallet.transferTransaction(
    [
      {
        type: 'unshielded',
        outputs: [
          {
            amount,
            receiverAddress: recipientAddress,
            type: ledger.unshieldedToken().raw,
          },
        ],
      },
    ],
    {
      shieldedSecretKeys: walletContext.shieldedSecretKeys,
      dustSecretKey: walletContext.dustSecretKey,
    },
    {
      ttl: new Date(Date.now() + 30 * 60 * 1000),
    },
  );

  const signedRecipe = await walletContext.wallet.signRecipe(
    recipe,
    (payload: Uint8Array) => walletContext.unshieldedKeystore.signData(payload),
  );

  const finalizedTx = await walletContext.wallet.finalizeRecipe(signedRecipe);
  await walletContext.wallet.submitTransaction(finalizedTx);

  logger.info('Transfer submitted successfully');
};

export const fundWalletFromGenesis = async (
  recipientAddress: string,
  amount: bigint,
  config: Config,
): Promise<void> => {
  logger.info('Funding wallet from genesis account...');

  // Genesis seed from localnet
  const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

  // Build genesis wallet
  const genesisWallet = await buildWalletFromSeed(GENESIS_SEED, config);
  await waitForSync(genesisWallet.wallet);

  // Transfer to recipient
  await sendUnshieldedTransfer(genesisWallet, recipientAddress, amount);

  logger.info('Funding complete');
};
