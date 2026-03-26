import { type Logger } from 'pino';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';

import {
  type GhostProviders,
  type DeployedGhostContract,
} from './common-types';
import { type Config, contractConfig } from './config';
import { Ghost, type GhostPrivateState, createPrivateState, witnesses } from '@ghost/ghost-contract';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type FinalizedTxData,
  type MidnightProvider,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  type UnshieldedKeystore,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { generateRandomSeed, HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk-address-format';

let logger: Logger;

// @ts-expect-error: Needed for WebSocket in apollo
globalThis.WebSocket = WebSocket;

export function setLogger(_logger: Logger) {
  logger = _logger;
}

// Pre-compile ghost contract
const ghostCompiledContract = CompiledContract.make('ghost', Ghost.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(contractConfig.zkConfigPath),
);

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
  const seed = await bip39.mnemonicToSeed(words.join(' '));
  return Buffer.from(seed).subarray(0, 32).toString('hex');
};

const deriveKeysFromSeed = (seed: string) => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') {
    throw new Error('Failed to initialize HDWallet from seed');
  }
  return {
    zswapKeys: hdWallet.deriveKeyPair(0, 0, Roles.Zswap),
    nightExternalKeys: hdWallet.deriveKeyPair(0, 0, Roles.NightExternal),
    dustKeys: hdWallet.deriveKeyPair(0, 0, Roles.Dust),
  };
};

const buildShieldedConfig = ({ indexer, indexerWS, node, proofServer }: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(node.replace(/^http/, 'ws')),
});

const buildUnshieldedConfig = ({ indexer, indexerWS }: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
});

const buildDustConfig = ({ indexer, indexerWS, node, proofServer }: Config) => ({
  networkId: getNetworkId(),
  costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(node.replace(/^http/, 'ws')),
});

export const buildWalletFromSeed = async (seed: string, config: Config): Promise<WalletContext> => {
  const keys = deriveKeysFromSeed(seed);

  const shieldedWallet = await ShieldedWallet.buildShieldedWallet(
    buildShieldedConfig(config),
    keys.zswapKeys.secretKey,
    keys.zswapKeys.publicKey,
  );
  const unshieldedKeystore = createKeystore(keys.nightExternalKeys.secretKey);
  const unshieldedWallet = UnshieldedWallet.buildUnshieldedWallet(
    buildUnshieldedConfig(config),
    unshieldedKeystore,
  );
  const dustWallet = await DustWallet.buildDustWallet(
    buildDustConfig(config),
    keys.dustKeys.secretKey,
    keys.dustKeys.publicKey,
  );

  const wallet = await WalletFacade.build(shieldedWallet, unshieldedWallet, dustWallet);

  return {
    wallet,
    shieldedSecretKeys: keys.zswapKeys.secretKey,
    dustSecretKey: keys.dustKeys.secretKey,
    unshieldedKeystore,
  };
};

export const buildFreshWallet = async (config: Config): Promise<WalletContext> => {
  const seed = generateRandomSeed();
  return buildWalletFromSeed(Buffer.from(seed).toString('hex'), config);
};

const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: 'proof' | 'pre-proof',
): void => {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      'signature', proofMarker, 'pre-binding', intent.serialize(),
    );
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
};

export const createWalletAndMidnightProvider = async (
  walletContext: WalletContext,
): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(walletContext.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey(): ledger.CoinPublicKey {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey(): ledger.EncPublicKey {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl) {
      const recipe = await walletContext.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletContext.shieldedSecretKeys, dustSecretKey: walletContext.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload: Uint8Array) => walletContext.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return walletContext.wallet.finalizeRecipe(recipe);
    },
    async submitTx(tx: ledger.FinalizedTransaction): Promise<ledger.TransactionId> {
      return await walletContext.wallet.submitTransaction(tx);
    },
  };
};

export const waitForSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((state) => logger.info(`Wallet sync: ${state.isSynced}`)),
      Rx.filter((state) => state.isSynced),
    ),
  );

export const waitForFunds = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state) => {
        const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
        logger.info(`Waiting for funds. Synced: ${state.isSynced}, Balance: ${unshielded}`);
      }),
      Rx.filter((state) => state.isSynced),
      Rx.map((s) =>
        (s.unshielded?.balances[ledger.nativeToken().raw] ?? 0n) +
        (s.shielded?.balances[ledger.nativeToken().raw] ?? 0n),
      ),
      Rx.filter((balance) => balance > 0n),
    ),
  );

// ─── Provider Setup ────────────────────────────────────────────────

export const configureProviders = async (
  walletContext: WalletContext,
  config: Config,
): Promise<GhostProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletContext);
  return {
    privateStateProvider: await levelPrivateStateProvider<GhostPrivateState>({
      privateStateStoreName: contractConfig.privateStateStoreName,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider: new NodeZkConfigProvider<'deposit' | 'withdraw' | 'submit_lend' | 'submit_borrow' | 'reveal_lend' | 'reveal_borrow' | 'settle' | 'repay' | 'advance_phase'>(
      contractConfig.zkConfigPath,
    ),
    proofProvider: httpClientProofProvider(config.proofServer),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

// ─── Contract Ops ──────────────────────────────────────────────────

export const deploy = async (
  providers: GhostProviders,
  adminKey: Uint8Array,
): Promise<DeployedGhostContract> => {
  logger.info('Deploying GHOST contract...');
  const contract = await deployContract(providers, {
    compiledContract: ghostCompiledContract,
    privateStateId: 'ghostPrivateState',
    initialPrivateState: createPrivateState(adminKey),
    constructorArgs: [adminKey],
  });
  logger.info(`Deployed at: ${contract.deployTxData.public.contractAddress}`);
  return contract;
};

export const joinContract = async (
  providers: GhostProviders,
  contractAddress: string,
): Promise<DeployedGhostContract> => {
  const contract = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: ghostCompiledContract,
    privateStateId: 'ghostPrivateState',
    initialPrivateState: createPrivateState(new Uint8Array(32)),
  });
  logger.info(`Joined contract at: ${contract.deployTxData.public.contractAddress}`);
  return contract;
};

export const getLedgerState = async (
  providers: GhostProviders,
  contractAddress: ContractAddress,
) => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (!contractState) return null;
  return Ghost.ledger(contractState.data);
};

// ─── Circuit Wrappers ──────────────────────────────────────────────

export const ghostDeposit = async (
  contract: DeployedGhostContract,
  owner: Uint8Array,
  amount: bigint,
) => {
  logger.info(`Depositing ${amount} for ${toHex(owner).slice(0, 16)}...`);
  const result = await contract.callTx.deposit(owner, amount);
  logger.info(`Deposit tx: ${result.public.txId}`);
  return result;
};

export const ghostWithdraw = async (
  contract: DeployedGhostContract,
  owner: Uint8Array,
  amount: bigint,
) => {
  logger.info(`Withdrawing ${amount}...`);
  const result = await contract.callTx.withdraw(owner, amount);
  return result;
};

export const ghostSubmitLend = async (
  contract: DeployedGhostContract,
  commitment: Uint8Array,
) => {
  logger.info(`Submitting lend commitment...`);
  const result = await contract.callTx.submit_lend(commitment);
  return result;
};

export const ghostSubmitBorrow = async (
  contract: DeployedGhostContract,
  commitment: Uint8Array,
) => {
  logger.info(`Submitting borrow commitment...`);
  const result = await contract.callTx.submit_borrow(commitment);
  return result;
};

export const ghostRevealLend = async (
  contract: DeployedGhostContract,
  commitment: Uint8Array,
  owner: Uint8Array,
  amount: bigint,
  rMin: bigint,
) => {
  logger.info(`Revealing lend bid: amount=${amount}, rMin=${rMin}bps`);
  const result = await contract.callTx.reveal_lend(commitment, owner, amount, rMin);
  return result;
};

export const ghostRevealBorrow = async (
  contract: DeployedGhostContract,
  commitment: Uint8Array,
  owner: Uint8Array,
  amount: bigint,
  rMax: bigint,
  collateral: bigint,
) => {
  logger.info(`Revealing borrow bid: amount=${amount}, rMax=${rMax}bps, collateral=${collateral}`);
  const result = await contract.callTx.reveal_borrow(commitment, owner, amount, rMax, collateral);
  return result;
};

export const ghostSettle = async (
  contract: DeployedGhostContract,
  rate: bigint,
  lendSlot: bigint,
  borrowSlot: bigint,
  matchAmount: bigint,
) => {
  logger.info(`Settling: rate=${rate}bps, lend=${lendSlot}, borrow=${borrowSlot}, amount=${matchAmount}`);
  const result = await contract.callTx.settle(rate, lendSlot, borrowSlot, matchAmount);
  return result;
};

export const ghostRepay = async (
  contract: DeployedGhostContract,
  loanId: bigint,
  caller: Uint8Array,
  totalDue: bigint,
) => {
  logger.info(`Repaying loan ${loanId}: totalDue=${totalDue}`);
  const result = await contract.callTx.repay(loanId, caller, totalDue);
  return result;
};

export const ghostAdvancePhase = async (
  contract: DeployedGhostContract,
  caller: Uint8Array,
) => {
  logger.info(`Advancing phase...`);
  const result = await contract.callTx.advance_phase(caller);
  return result;
};
