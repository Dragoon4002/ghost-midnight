import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { LocalConfig } from './config.js';
import { setLogger, buildWalletFromSeed, mnemonicToSeed, waitForSync, waitForFunds, sendUnshieldedTransfer, fundWalletFromGenesis, } from './wallet-api.js';
import { loadMnemonic, saveMnemonic } from './wallet-store.js';
import * as readline from 'node:readline';
const config = new LocalConfig();
const logger = pino({ level: 'info', depthLimit: 20 }, pino.multistream([
    { stream: pinoPretty({ colorize: true, sync: true, translateTime: true, ignore: 'pid,time', singleLine: false }) },
]));
setLogger(logger);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));
async function getMnemonic() {
    const stored = await loadMnemonic();
    if (stored) {
        logger.info('Found saved mnemonic');
        return stored;
    }
    console.log('\n═══ Wallet Setup ═══');
    console.log('Enter your 24-word mnemonic phrase (words separated by spaces):');
    const input = await ask('> ');
    const mnemonic = input.trim();
    // Validate via mnemonicToSeed (throws if invalid)
    await mnemonicToSeed(mnemonic);
    await saveMnemonic(mnemonic);
    logger.info('Mnemonic saved to ~/.ghost/wallet.json');
    return mnemonic;
}
async function displayWalletInfo(walletContext) {
    const state = await walletContext.wallet.state().pipe().toPromise();
    // Get unshielded address using getBech32Address
    const unshieldedAddr = walletContext.unshieldedKeystore.getBech32Address().asString();
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    GHOST CLI Wallet                        ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Unshielded Address: ${unshieldedAddr}`);
    console.log(`║ Network: ${config.node}`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ Balances:');
    console.log(`║   Shielded:   ${state?.shielded?.balances[require('@midnight-ntwrk/ledger-v7').nativeToken().raw] || 0n} (private)`);
    console.log(`║   Unshielded: ${state?.unshielded?.balances[require('@midnight-ntwrk/ledger-v7').nativeToken().raw] || 0n} (public)`);
    console.log(`║   Dust:       ${state?.dust?.balance || 0n} (fees)`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
}
async function handleSend(walletContext) {
    const recipient = await ask('Recipient address: ');
    const amount = await ask('Amount (in microNIGHT, 1 NIGHT = 1,000,000): ');
    try {
        await sendUnshieldedTransfer(walletContext, recipient, BigInt(amount));
        console.log('✓ Transfer successful!');
    }
    catch (e) {
        logger.error(`Transfer failed: ${e.message}`);
    }
}
async function handleReceive(walletContext) {
    const address = walletContext.unshieldedKeystore.getBech32Address().asString();
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   Your Receive Address                     ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ ${address}`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
}
async function handleFundWallet(walletContext) {
    const amount = await ask('Amount to fund (in microNIGHT, default 50000000000 = 50k NIGHT): ');
    const fundAmount = amount.trim() ? BigInt(amount) : 50000000000n;
    try {
        const address = walletContext.unshieldedKeystore.getBech32Address().asString();
        await fundWalletFromGenesis(address, fundAmount, config);
        console.log('✓ Wallet funded successfully!');
    }
    catch (e) {
        logger.error(`Funding failed: ${e.message}`);
    }
}
async function handleLend(walletContext) {
    const amount = await ask('Lend amount: ');
    const rate = await ask('Min rate (basis points): ');
    // TODO: Implement lend flow
    logger.info('Lend not yet implemented');
}
async function handleBorrow(walletContext) {
    const amount = await ask('Borrow amount: ');
    const rate = await ask('Max rate (basis points): ');
    const collateral = await ask('Collateral amount: ');
    // TODO: Implement borrow flow
    logger.info('Borrow not yet implemented');
}
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           GHOST Finance CLI - Midnight Network            ');
    console.log('═══════════════════════════════════════════════════════════\n');
    const mnemonic = await getMnemonic();
    logger.info('Building wallet...');
    const seed = await mnemonicToSeed(mnemonic);
    const walletContext = await buildWalletFromSeed(seed, config);
    logger.info('Syncing wallet...');
    await waitForSync(walletContext.wallet);
    logger.info('Checking funds...');
    await waitForFunds(walletContext.wallet);
    await displayWalletInfo(walletContext);
    let running = true;
    while (running) {
        console.log('─────────────────── Main Menu ───────────────────────');
        console.log('1. Lend');
        console.log('2. Borrow');
        console.log('3. Send');
        console.log('4. Receive');
        console.log('5. Fund Wallet (localnet only)');
        console.log('6. Refresh Wallet Info');
        console.log('0. Exit');
        const choice = await ask('\nChoice: ');
        try {
            switch (choice.trim()) {
                case '1':
                    await handleLend(walletContext);
                    break;
                case '2':
                    await handleBorrow(walletContext);
                    break;
                case '3':
                    await handleSend(walletContext);
                    break;
                case '4':
                    await handleReceive(walletContext);
                    break;
                case '5':
                    await handleFundWallet(walletContext);
                    break;
                case '6':
                    await displayWalletInfo(walletContext);
                    break;
                case '0':
                    running = false;
                    break;
                default:
                    console.log('Invalid choice');
            }
        }
        catch (e) {
            logger.error(`Error: ${e.message}`);
        }
    }
    rl.close();
    logger.info('Shutting down...');
    // Note: WalletFacade in SDK v1 doesn't have close() method
    process.exit(0);
}
main().catch((e) => {
    logger.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map