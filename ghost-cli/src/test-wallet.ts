import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { LocalConfig } from './config.js';
import {
  setLogger,
  buildWalletFromSeed,
  mnemonicToSeed,
  waitForSync,
  sendUnshieldedTransfer,
} from './wallet-api.js';
import * as readline from 'node:readline';

const config = new LocalConfig();

const logger = pino(
  { level: 'info', depthLimit: 20 },
  pino.multistream([
    { stream: pinoPretty({ colorize: true, sync: true, translateTime: true, ignore: 'pid,time', singleLine: false }) },
  ]),
);
setLogger(logger);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

// Test mnemonic (Alice from accounts.json)
const TEST_MNEMONIC = 'young popular balance act bean merry green bulk become south tank magnet real pride leopard noodle wild hurdle tissue jump city blur spring emerge';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           GHOST CLI Wallet Test - Basic Functions         ');
  console.log('═══════════════════════════════════════════════════════════\n');

  logger.info('Building wallet from test mnemonic...');
  const seed = await mnemonicToSeed(TEST_MNEMONIC);
  const walletContext = await buildWalletFromSeed(seed, config);

  logger.info('Syncing wallet...');
  await waitForSync(walletContext.wallet);

  const address = walletContext.unshieldedKeystore.getBech32Address().asString();
  logger.info(`Wallet address: ${address}`);

  const state: any = await walletContext.wallet.state().pipe().toPromise();

  const nativeToken = require('@midnight-ntwrk/ledger-v7').nativeToken().raw;
  const unshieldedBalance = state?.unshielded?.balances[nativeToken] || 0n;
  const dustBalance = state?.dust?.balance || 0n;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Wallet Info                             ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Address: ${address}`);
  console.log(`║ Unshielded Balance: ${unshieldedBalance}`);
  console.log(`║ Dust Balance: ${dustBalance}`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (unshieldedBalance > 0n) {
    const test = await ask('Test send? (y/n): ');
    if (test.toLowerCase() === 'y') {
      const recipient = await ask('Recipient address: ');
      const amount = await ask('Amount (microNIGHT): ');

      try {
        await sendUnshieldedTransfer(walletContext, recipient, BigInt(amount));
        logger.info('✓ Transfer successful!');
      } catch (e: any) {
        logger.error(`Transfer failed: ${e.message}`);
      }
    }
  } else {
    logger.info('No funds - skipping send test');
  }

  rl.close();
  logger.info('Test complete');
  process.exit(0);
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
