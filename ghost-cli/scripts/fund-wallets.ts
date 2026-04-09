import { LocalConfig } from '../src/config.js';
import { fundWalletFromGenesis, setLogger } from '../src/wallet-api.js';
import { logger } from '../src/logger.js';

setLogger(logger as any);
const cfg = new LocalConfig();

const addrs = process.argv.slice(2);
if (addrs.length === 0) {
  console.error('usage: fund-wallets.ts <addr1> [<addr2> ...]');
  process.exit(1);
}

const AMOUNT = BigInt(process.env.FUND_AMOUNT ?? '50000000000'); // 50k NIGHT default

for (const addr of addrs) {
  logger.info({ addr, amount: AMOUNT.toString() }, 'funding');
  await fundWalletFromGenesis(addr, AMOUNT, cfg);
  logger.info({ addr }, 'funded');
}

process.exit(0);
