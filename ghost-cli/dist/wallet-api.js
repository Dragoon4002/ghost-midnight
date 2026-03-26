import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createKeystore, InMemoryTransactionHistoryStorage, PublicKey, UnshieldedWallet, } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
let logger;
// @ts-expect-error: Needed for WebSocket in apollo
globalThis.WebSocket = WebSocket;
export function setLogger(_logger) {
    logger = _logger;
}
// ─── Wallet Setup ──────────────────────────────────────────────────
export const mnemonicToSeed = async (mnemonic) => {
    const words = mnemonic.trim().split(/\s+/);
    if (!bip39.validateMnemonic(words.join(' '), english)) {
        throw new Error('Invalid mnemonic phrase');
    }
    const seed = await bip39.mnemonicToSeed(words.join(' '));
    return Buffer.from(seed).subarray(0, 32).toString('hex');
};
const deriveKeysFromSeed = (seed) => {
    const hdResult = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
    if (hdResult.type !== 'seedOk') {
        throw new Error('Failed to derive keys from seed');
    }
    const account = hdResult.hdWallet.selectAccount(0);
    function deriveRoleKey(accountKey, role, index = 0) {
        const result = accountKey.selectRole(role).deriveKeyAt(index);
        if (result.type === 'keyDerived')
            return Buffer.from(result.key);
        return deriveRoleKey(accountKey, role, index + 1);
    }
    const zswapSeed = deriveRoleKey(account, Roles.Zswap);
    const dustSeed = deriveRoleKey(account, Roles.Dust);
    const unshieldedKey = deriveRoleKey(account, Roles.NightExternal);
    hdResult.hdWallet.clear();
    return {
        zswapSeed,
        dustSeed,
        unshieldedKey,
    };
};
export const buildWalletFromSeed = async (seed, config) => {
    const keys = deriveKeysFromSeed(seed);
    const shieldedKeys = ledger.ZswapSecretKeys.fromSeed(keys.zswapSeed);
    const dustKey = ledger.DustSecretKey.fromSeed(keys.dustSeed);
    const unshieldedKeystore = createKeystore(keys.unshieldedKey, getNetworkId());
    const configuration = {
        networkId: getNetworkId(),
        costParameters: {
            additionalFeeOverhead: 300000000000000n,
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
export const waitForSync = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.tap(() => logger.info('Waiting for sync...')), Rx.filter((state) => state.isSynced), Rx.map(() => undefined)));
export const waitForFunds = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(10_000), Rx.tap((state) => {
    const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
    logger.info(`Waiting for funds. Synced: ${state.isSynced}, Balance: ${unshielded}`);
}), Rx.filter((state) => state.isSynced), Rx.map((s) => (s.unshielded?.balances[ledger.nativeToken().raw] ?? 0n) +
    (s.shielded?.balances[ledger.nativeToken().raw] ?? 0n)), Rx.filter((balance) => balance > 0n), Rx.map(() => undefined)));
// ─── Wallet Operations ─────────────────────────────────────────────
export const sendUnshieldedTransfer = async (walletContext, recipientAddress, amount) => {
    logger.info(`Sending ${amount} to ${recipientAddress}...`);
    const recipe = await walletContext.wallet.transferTransaction([
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
    ], {
        shieldedSecretKeys: walletContext.shieldedSecretKeys,
        dustSecretKey: walletContext.dustSecretKey,
    }, {
        ttl: new Date(Date.now() + 30 * 60 * 1000),
    });
    const signedRecipe = await walletContext.wallet.signRecipe(recipe, (payload) => walletContext.unshieldedKeystore.signData(payload));
    const finalizedTx = await walletContext.wallet.finalizeRecipe(signedRecipe);
    await walletContext.wallet.submitTransaction(finalizedTx);
    logger.info('Transfer submitted successfully');
};
export const fundWalletFromGenesis = async (recipientAddress, amount, config) => {
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
//# sourceMappingURL=wallet-api.js.map