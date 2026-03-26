import { type Logger } from 'pino';
import { type Config } from './config.js';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { type UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
export declare function setLogger(_logger: Logger): void;
export interface WalletContext {
    wallet: WalletFacade;
    shieldedSecretKeys: ledger.ZswapSecretKeys;
    dustSecretKey: ledger.DustSecretKey;
    unshieldedKeystore: UnshieldedKeystore;
}
export declare const mnemonicToSeed: (mnemonic: string) => Promise<string>;
export declare const buildWalletFromSeed: (seed: string, config: Config) => Promise<WalletContext>;
export declare const waitForSync: (wallet: WalletFacade) => Promise<void>;
export declare const waitForFunds: (wallet: WalletFacade) => Promise<void>;
export declare const sendUnshieldedTransfer: (walletContext: WalletContext, recipientAddress: string, amount: bigint) => Promise<void>;
export declare const fundWalletFromGenesis: (recipientAddress: string, amount: bigint, config: Config) => Promise<void>;
