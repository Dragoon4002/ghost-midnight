import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { LocalConfig } from './config.js';
import {
  setLogger,
  buildWalletFromSeed,
  mnemonicToSeed,
  configureProviders,
  deploy,
  joinContract,
  getLedgerState,
  waitForSync,
  waitForFunds,
  ghostDeposit,
  ghostSubmitLend,
  ghostSubmitBorrow,
  ghostRevealLend,
  ghostRevealBorrow,
  ghostSettle,
  ghostRepay,
  ghostAdvancePhase,
} from './api.js';
import { computeCommitment } from '@ghost/ghost-contract';
import * as readline from 'node:readline';

const config = new LocalConfig();

const logger = pino(
  { level: 'info', depthLimit: 20 },
  pino.multistream([
    { stream: pinoPretty({ colorize: true, sync: true, translateTime: true, ignore: 'pid,time', singleLine: false }) },
  ]),
);
setLogger(logger);

// Genesis seed — matches midnight-local-dev master wallet
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
// Alice mnemonic from midnight-local-dev/accounts.json
const ALICE_MNEMONIC = 'young popular balance act bean merry green bulk become south tank magnet real pride leopard noodle wild hurdle tissue jump city blur spring emerge';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

async function main() {
  logger.info('═══ GHOST Finance — Localnet Deployment ═══');

  // Build wallet from Alice's mnemonic
  logger.info('Building wallet from Alice mnemonic...');
  const seed = await mnemonicToSeed(ALICE_MNEMONIC);
  const walletContext = await buildWalletFromSeed(seed, config);

  logger.info('Waiting for wallet sync...');
  await waitForSync(walletContext.wallet);

  logger.info('Waiting for funds...');
  await waitForFunds(walletContext.wallet);

  logger.info('Configuring providers...');
  const providers = await configureProviders(walletContext, config);

  // Get operator key (32 bytes from wallet public key)
  const state = await walletContext.wallet.state().pipe().toPromise();
  const operatorKey = new Uint8Array(32); // placeholder — in production derive from wallet

  logger.info('Deploying GHOST contract...');
  const contract = await deploy(providers, operatorKey);
  const contractAddress = contract.deployTxData.public.contractAddress;

  logger.info('');
  logger.info(`Contract deployed at: ${contractAddress}`);
  logger.info('');

  // Show initial state
  const ledgerState = await getLedgerState(providers, contractAddress);
  if (ledgerState) {
    logger.info(`Phase: ${ledgerState.phase}`);
    logger.info(`Epoch: ${ledgerState.epoch_num}`);
    logger.info(`Total deposits: ${ledgerState.total_deposits}`);
  }

  // Interactive menu
  let running = true;
  while (running) {
    console.log('\n─── GHOST Finance Menu ───');
    console.log('1. Deposit');
    console.log('2. Submit Lend Bid');
    console.log('3. Submit Borrow Bid');
    console.log('4. Advance Phase');
    console.log('5. Reveal Lend');
    console.log('6. Reveal Borrow');
    console.log('7. Settle Match');
    console.log('8. Repay Loan');
    console.log('9. View State');
    console.log('0. Exit');

    const choice = await ask('\nChoice: ');

    try {
      switch (choice.trim()) {
        case '1': {
          const amt = await ask('Amount: ');
          await ghostDeposit(contract, operatorKey, BigInt(amt));
          break;
        }
        case '2': {
          const nonce = crypto.getRandomValues(new Uint8Array(32));
          const amt = await ask('Lend amount: ');
          const rate = await ask('Min rate (basis points): ');
          const commitment = computeCommitment(BigInt(amt), BigInt(rate), nonce, operatorKey);
          await ghostSubmitLend(contract, commitment);
          logger.info(`Commitment: ${Buffer.from(commitment).toString('hex')}`);
          logger.info(`Save nonce: ${Buffer.from(nonce).toString('hex')} (needed for reveal)`);
          break;
        }
        case '3': {
          const nonce = crypto.getRandomValues(new Uint8Array(32));
          const amt = await ask('Borrow amount: ');
          const rate = await ask('Max rate (basis points): ');
          const commitment = computeCommitment(BigInt(amt), BigInt(rate), nonce, operatorKey);
          await ghostSubmitBorrow(contract, commitment);
          logger.info(`Commitment: ${Buffer.from(commitment).toString('hex')}`);
          logger.info(`Save nonce: ${Buffer.from(nonce).toString('hex')} (needed for reveal)`);
          break;
        }
        case '4': {
          await ghostAdvancePhase(contract, operatorKey);
          break;
        }
        case '5': {
          const commitHex = await ask('Commitment (hex): ');
          const amt = await ask('Amount: ');
          const rate = await ask('Min rate (bps): ');
          await ghostRevealLend(contract, Buffer.from(commitHex, 'hex'), operatorKey, BigInt(amt), BigInt(rate));
          break;
        }
        case '6': {
          const commitHex = await ask('Commitment (hex): ');
          const amt = await ask('Amount: ');
          const rate = await ask('Max rate (bps): ');
          const col = await ask('Collateral: ');
          await ghostRevealBorrow(contract, Buffer.from(commitHex, 'hex'), operatorKey, BigInt(amt), BigInt(rate), BigInt(col));
          break;
        }
        case '7': {
          const rate = await ask('Clearing rate (bps): ');
          const ls = await ask('Lend slot: ');
          const bs = await ask('Borrow slot: ');
          const ma = await ask('Match amount: ');
          await ghostSettle(contract, BigInt(rate), BigInt(ls), BigInt(bs), BigInt(ma));
          break;
        }
        case '8': {
          const lid = await ask('Loan ID: ');
          const td = await ask('Total due: ');
          await ghostRepay(contract, BigInt(lid), operatorKey, BigInt(td));
          break;
        }
        case '9': {
          const s = await getLedgerState(providers, contractAddress);
          if (s) {
            console.log(`\nPhase: ${s.phase} (0=BID,1=REVEAL,2=CLEAR,3=ACTIVE)`);
            console.log(`Epoch: ${s.epoch_num}`);
            console.log(`Lend bids: ${s.lend_count}`);
            console.log(`Borrow bids: ${s.borrow_count}`);
            console.log(`Clearing rate: ${s.clearing_rate} bps`);
            console.log(`Matched volume: ${s.matched_volume}`);
            console.log(`Loans: ${s.loan_count}`);
            console.log(`Total deposits: ${s.total_deposits}`);
            console.log(`Total locked: ${s.total_locked}`);
          }
          break;
        }
        case '0':
          running = false;
          break;
        default:
          console.log('Invalid choice');
      }
    } catch (e: any) {
      logger.error(`Error: ${e.message}`);
    }
  }

  rl.close();
  logger.info('Shutting down...');
  await walletContext.wallet.close();
  process.exit(0);
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
