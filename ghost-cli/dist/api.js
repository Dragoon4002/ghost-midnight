import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import { contractConfig } from './config';
import { Ghost, createPrivateState } from '@ghost/ghost-contract';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createKeystore, InMemoryTransactionHistoryStorage, PublicKey, UnshieldedWallet, } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { generateRandomSeed, HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
let logger;
// @ts-expect-error: Needed for WebSocket in apollo
globalThis.WebSocket = WebSocket;
export function setLogger(_logger) {
    logger = _logger;
}
// Pre-compile ghost contract
const ghostCompiledContract = CompiledContract.make('ghost', Ghost.Contract).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets(contractConfig.zkConfigPath));
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
export const buildFreshWallet = async (config) => {
    const seed = generateRandomSeed();
    return buildWalletFromSeed(Buffer.from(seed).toString('hex'), config);
};
const signTransactionIntents = (tx, signFn, proofMarker) => {
    if (!tx.intents || tx.intents.size === 0)
        return;
    for (const segment of tx.intents.keys()) {
        const intent = tx.intents.get(segment);
        if (!intent)
            continue;
        const cloned = ledger.Intent.deserialize('signature', proofMarker, 'pre-binding', intent.serialize());
        const sigData = cloned.signatureData(segment);
        const signature = signFn(sigData);
        if (cloned.fallibleUnshieldedOffer) {
            const sigs = cloned.fallibleUnshieldedOffer.inputs.map((_, i) => cloned.fallibleUnshieldedOffer.signatures.at(i) ?? signature);
            cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
        }
        if (cloned.guaranteedUnshieldedOffer) {
            const sigs = cloned.guaranteedUnshieldedOffer.inputs.map((_, i) => cloned.guaranteedUnshieldedOffer.signatures.at(i) ?? signature);
            cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
        }
        tx.intents.set(segment, cloned);
    }
};
export const createWalletAndMidnightProvider = async (walletContext) => {
    const state = await Rx.firstValueFrom(walletContext.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
    return {
        getCoinPublicKey() {
            return state.shielded.coinPublicKey.toHexString();
        },
        getEncryptionPublicKey() {
            return state.shielded.encryptionPublicKey.toHexString();
        },
        async balanceTx(tx, ttl) {
            const recipe = await walletContext.wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys: walletContext.shieldedSecretKeys, dustSecretKey: walletContext.dustSecretKey }, { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) });
            const signFn = (payload) => walletContext.unshieldedKeystore.signData(payload);
            signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
            if (recipe.balancingTransaction) {
                signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
            }
            return walletContext.wallet.finalizeRecipe(recipe);
        },
        async submitTx(tx) {
            return await walletContext.wallet.submitTransaction(tx);
        },
    };
};
export const waitForSync = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.tap((state) => logger.info(`Wallet sync: ${state.isSynced}`)), Rx.filter((state) => state.isSynced)));
export const waitForFunds = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(10_000), Rx.tap((state) => {
    const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
    logger.info(`Waiting for funds. Synced: ${state.isSynced}, Balance: ${unshielded}`);
}), Rx.filter((state) => state.isSynced), Rx.map((s) => (s.unshielded?.balances[ledger.nativeToken().raw] ?? 0n) +
    (s.shielded?.balances[ledger.nativeToken().raw] ?? 0n)), Rx.filter((balance) => balance > 0n)));
// ─── Provider Setup ────────────────────────────────────────────────
export const configureProviders = async (walletContext, config) => {
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletContext);
    return {
        privateStateProvider: await levelPrivateStateProvider({
            privateStateStoreName: contractConfig.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider(contractConfig.zkConfigPath),
        proofProvider: httpClientProofProvider(config.proofServer),
        walletProvider: walletAndMidnightProvider,
        midnightProvider: walletAndMidnightProvider,
    };
};
// ─── Contract Ops ──────────────────────────────────────────────────
export const deploy = async (providers, adminKey) => {
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
export const joinContract = async (providers, contractAddress) => {
    const contract = await findDeployedContract(providers, {
        contractAddress,
        compiledContract: ghostCompiledContract,
        privateStateId: 'ghostPrivateState',
        initialPrivateState: createPrivateState(new Uint8Array(32)),
    });
    logger.info(`Joined contract at: ${contract.deployTxData.public.contractAddress}`);
    return contract;
};
export const getLedgerState = async (providers, contractAddress) => {
    assertIsContractAddress(contractAddress);
    const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!contractState)
        return null;
    return Ghost.ledger(contractState.data);
};
// ─── Circuit Wrappers ──────────────────────────────────────────────
export const ghostDeposit = async (contract, owner, amount) => {
    logger.info(`Depositing ${amount} for ${toHex(owner).slice(0, 16)}...`);
    const result = await contract.callTx.deposit(owner, amount);
    logger.info(`Deposit tx: ${result.public.txId}`);
    return result;
};
export const ghostWithdraw = async (contract, owner, amount) => {
    logger.info(`Withdrawing ${amount}...`);
    const result = await contract.callTx.withdraw(owner, amount);
    return result;
};
export const ghostSubmitLend = async (contract, commitment) => {
    logger.info(`Submitting lend commitment...`);
    const result = await contract.callTx.submit_lend(commitment);
    return result;
};
export const ghostSubmitBorrow = async (contract, commitment) => {
    logger.info(`Submitting borrow commitment...`);
    const result = await contract.callTx.submit_borrow(commitment);
    return result;
};
export const ghostRevealLend = async (contract, commitment, owner, amount, rMin) => {
    logger.info(`Revealing lend bid: amount=${amount}, rMin=${rMin}bps`);
    const result = await contract.callTx.reveal_lend(commitment, owner, amount, rMin);
    return result;
};
export const ghostRevealBorrow = async (contract, commitment, owner, amount, rMax, collateral) => {
    logger.info(`Revealing borrow bid: amount=${amount}, rMax=${rMax}bps, collateral=${collateral}`);
    const result = await contract.callTx.reveal_borrow(commitment, owner, amount, rMax, collateral);
    return result;
};
export const ghostSettle = async (contract, rate, lendSlot, borrowSlot, matchAmount) => {
    logger.info(`Settling: rate=${rate}bps, lend=${lendSlot}, borrow=${borrowSlot}, amount=${matchAmount}`);
    const result = await contract.callTx.settle(rate, lendSlot, borrowSlot, matchAmount);
    return result;
};
export const ghostRepay = async (contract, loanId, caller, totalDue) => {
    logger.info(`Repaying loan ${loanId}: totalDue=${totalDue}`);
    const result = await contract.callTx.repay(loanId, caller, totalDue);
    return result;
};
export const ghostAdvancePhase = async (contract, caller) => {
    logger.info(`Advancing phase...`);
    const result = await contract.callTx.advance_phase(caller);
    return result;
};
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
    // Note: WalletFacade in SDK v1 doesn't have close() method
    logger.info('Funding complete');
};
//# sourceMappingURL=api.js.map