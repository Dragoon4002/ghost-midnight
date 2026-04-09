import { LocalConfig } from './config.js';
import {
  setLogger,
  buildWalletFromSeed,
  mnemonicToSeed,
  waitForSync,
  waitForFunds,
  registerNightForDust,
  sendUnshieldedTransfer,
  fundWalletFromGenesis,
  type WalletContext,
} from './wallet-api.js';
import { loadMnemonic, saveMnemonic } from './wallet-store.js';
import { logger } from './logger.js';
import { GhostServerClient } from './server-client.js';
import * as readline from 'node:readline';

const config = new LocalConfig();
setLogger(logger as any);

const server = new GhostServerClient(config.serverUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

// Track which matched-loan notifications we've already logged so the poller
// doesn't spam. Keyed by loanId. Cleared when the loan leaves
// awaiting-settlement.
const notifiedLoans = new Set<string>();

async function getMnemonic(): Promise<string> {
  const stored = await loadMnemonic();
  if (stored) {
    logger.info('found saved mnemonic');
    return stored;
  }

  console.log('\n═══ Wallet Setup ═══');
  console.log('Enter your 24-word mnemonic phrase (words separated by spaces):');
  const input = await ask('> ');
  const mnemonic = input.trim();

  // Validate via mnemonicToSeed (throws if invalid)
  await mnemonicToSeed(mnemonic);

  await saveMnemonic(mnemonic);
  logger.info('mnemonic saved to ~/.ghost/wallet.json');
  return mnemonic;
}

async function displayWalletInfo(walletContext: WalletContext) {
  const { firstValueFrom } = await import('rxjs');
  const state = await firstValueFrom(walletContext.wallet.state());

  const unshieldedAddr = walletContext.unshieldedKeystore.getBech32Address().asString();

  const ledgerV7 = await import('@midnight-ntwrk/ledger-v7');
  const nativeTokenRaw = ledgerV7.nativeToken().raw;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    GHOST CLI Wallet                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Address: ${unshieldedAddr}`);
  console.log(`║ Network: ${config.node}`);
  console.log(`║ Server:  ${config.serverUrl}`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Balances:');
  console.log(`║   Shielded:   ${(state as any)?.shielded?.balances[nativeTokenRaw] || 0n} (private)`);
  console.log(`║   Unshielded: ${(state as any)?.unshielded?.balances[nativeTokenRaw] || 0n} (public)`);
  console.log(`║   Dust:       ${(state as any)?.dust?.balance || 0n} (fees)`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

function walletAddress(walletContext: WalletContext): string {
  return walletContext.unshieldedKeystore.getBech32Address().asString();
}

// ─── Intent actions ────────────────────────────────────────────────

async function handleLend(walletContext: WalletContext) {
  const amountStr = await ask('Lend amount (microNIGHT): ');
  const rateStr = await ask('Min rate (basis points, e.g. 500 = 5%): ');

  const amount = BigInt(amountStr.trim());
  const rMin = Number(rateStr.trim());

  try {
    const { intentId } = await server.submitLend(walletAddress(walletContext), amount, rMin);
    logger.lendIntent(
      {
        intentId,
        lender: walletAddress(walletContext),
        amount: amount.toString(),
        rMin,
      },
      'lend intent submitted to server',
    );
  } catch (e: any) {
    logger.error(`failed to submit lend intent: ${e.message}`);
  }
}

async function handleBorrow(walletContext: WalletContext) {
  const amountStr = await ask('Borrow amount (microNIGHT): ');
  const rateStr = await ask('Max rate (basis points, e.g. 800 = 8%): ');
  const collatStr = await ask('Collateral (microNIGHT, >= 1.5x amount): ');

  const amount = BigInt(amountStr.trim());
  const rMax = Number(rateStr.trim());
  const collateral = BigInt(collatStr.trim());

  try {
    const { intentId } = await server.submitBorrow(
      walletAddress(walletContext),
      amount,
      rMax,
      collateral,
    );
    logger.borrowIntent(
      {
        intentId,
        borrower: walletAddress(walletContext),
        amount: amount.toString(),
        rMax,
        collateral: collateral.toString(),
      },
      'borrow intent submitted to server',
    );
  } catch (e: any) {
    logger.error(`failed to submit borrow intent: ${e.message}`);
  }
}

async function handleListIntents() {
  try {
    const { lends, borrows, loans } = await server.listIntents();

    console.log('\n─── Open Lend Intents ───');
    const openLends = lends.filter((l) => l.status === 'open');
    if (openLends.length === 0) console.log('  (none)');
    for (const l of openLends) {
      console.log(
        `  ${l.intentId}  ${l.amount} µN  rMin=${l.rMin}bps  by ${l.lender.slice(0, 20)}...`,
      );
    }

    console.log('\n─── Open Borrow Intents ───');
    const openBorrows = borrows.filter((b) => b.status === 'open');
    if (openBorrows.length === 0) console.log('  (none)');
    for (const b of openBorrows) {
      console.log(
        `  ${b.intentId}  ${b.amount} µN  rMax=${b.rMax}bps  collat=${b.collateral}  by ${b.borrower.slice(0, 20)}...`,
      );
    }

    console.log('\n─── Loans ───');
    if (loans.length === 0) console.log('  (none)');
    for (const loan of loans) {
      console.log(
        `  ${loan.loanId}  ${loan.principal} µN  @${loan.rate}bps  [${loan.status}]  ${loan.lender.slice(0, 12)}... → ${loan.borrower.slice(0, 12)}...`,
      );
    }
    console.log('');
  } catch (e: any) {
    logger.error(`failed to list intents: ${e.message}`);
  }
}

async function handleMyLoans(walletContext: WalletContext) {
  try {
    const addr = walletAddress(walletContext);
    const { loans } = await server.listMatches(addr);

    console.log(`\n─── My Loans (${addr.slice(0, 20)}...) ───`);
    if (loans.length === 0) console.log('  (none)');
    for (const loan of loans) {
      const role = loan.lender === addr ? 'LENDER' : 'BORROWER';
      console.log(
        `  [${role}] ${loan.loanId}  ${loan.principal} µN  @${loan.rate}bps  [${loan.status}]`,
      );
      if (loan.settlementTxId) console.log(`       txId: ${loan.settlementTxId}`);
    }
    console.log('');
  } catch (e: any) {
    logger.error(`failed to fetch loans: ${e.message}`);
  }
}

async function handleSettleLoan(walletContext: WalletContext) {
  try {
    const addr = walletAddress(walletContext);
    const { loans } = await server.listMatches(addr);
    const toSettle = loans.filter(
      (l) => l.lender === addr && l.status === 'awaiting-settlement',
    );

    if (toSettle.length === 0) {
      console.log('\n  No loans awaiting settlement where you are the lender.\n');
      return;
    }

    console.log('\n─── Loans Awaiting Settlement ───');
    toSettle.forEach((l, i) => {
      console.log(
        `  ${i + 1}. ${l.loanId}  ${l.principal} µN → ${l.borrower.slice(0, 20)}...`,
      );
    });

    const pick = await ask('Pick loan # (or 0 to cancel): ');
    const idx = Number(pick.trim()) - 1;
    if (idx < 0 || idx >= toSettle.length) {
      console.log('cancelled');
      return;
    }

    const loan = toSettle[idx]!;
    const principal = BigInt(loan.principal);

    logger.transfer(
      { loanId: loan.loanId, to: loan.borrower, amount: principal.toString() },
      'executing settlement transfer',
    );

    // sendUnshieldedTransfer does not currently return the txId directly.
    // Fetch wallet state before/after and pick up the newest tx if needed.
    // For v0 we treat the call completing as success and use a placeholder.
    await sendUnshieldedTransfer(walletContext, loan.borrower, principal);

    // Confirm on server
    const txIdPlaceholder = `settled_${Date.now()}`;
    await server.confirmSettlement(loan.loanId, txIdPlaceholder);

    logger.success(
      { loanId: loan.loanId, principal: principal.toString() },
      'loan settled — principal delivered',
    );
    notifiedLoans.delete(loan.loanId);
  } catch (e: any) {
    logger.error(`settlement failed: ${e.message}`);
  }
}

// ─── Existing wallet actions ───────────────────────────────────────

async function handleSend(walletContext: WalletContext) {
  const recipient = await ask('Recipient address: ');
  const amount = await ask('Amount (microNIGHT): ');

  try {
    await sendUnshieldedTransfer(walletContext, recipient, BigInt(amount));
    logger.success('transfer successful');
  } catch (e: any) {
    logger.error(`transfer failed: ${e.message}`);
  }
}

async function handleReceive(walletContext: WalletContext) {
  const address = walletContext.unshieldedKeystore.getBech32Address().asString();
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Your Receive Address                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ ${address}`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

async function handleFundWallet(walletContext: WalletContext) {
  const amount = await ask('Amount to fund (microNIGHT, default 50000000000 = 50k NIGHT): ');
  const fundAmount = amount.trim() ? BigInt(amount) : 50_000_000_000n;

  try {
    const address = walletContext.unshieldedKeystore.getBech32Address().asString();
    await fundWalletFromGenesis(address, fundAmount, config);
    logger.success('wallet funded');
  } catch (e: any) {
    logger.error(`funding failed: ${e.message}`);
  }
}

// ─── Match poller ──────────────────────────────────────────────────

function startMatchPoller(walletContext: WalletContext): NodeJS.Timeout {
  const addr = walletAddress(walletContext);
  logger.info({ pollMs: config.matchPollMs }, 'match poller started');

  return setInterval(async () => {
    try {
      const { loans } = await server.listMatches(addr);
      for (const loan of loans) {
        if (loan.status === 'awaiting-settlement' && !notifiedLoans.has(loan.loanId)) {
          notifiedLoans.add(loan.loanId);
          const role = loan.lender === addr ? 'LENDER' : 'BORROWER';
          logger.match(
            {
              loanId: loan.loanId,
              role,
              principal: loan.principal,
              rate: loan.rate,
              counterparty: role === 'LENDER' ? loan.borrower : loan.lender,
            },
            `${role === 'LENDER' ? 'your lend' : 'your borrow'} intent matched — loan ${loan.loanId}`,
          );
          if (role === 'LENDER') {
            console.log(
              `  >>> Use menu option 5 (Settle Loan) to deliver ${loan.principal} µN.`,
            );
          }
        }
        // Clean up notified set when loan moves out of awaiting-settlement
        if (loan.status !== 'awaiting-settlement' && notifiedLoans.has(loan.loanId)) {
          notifiedLoans.delete(loan.loanId);
          if (loan.status === 'active') {
            logger.loanActive(
              { loanId: loan.loanId, principal: loan.principal, rate: loan.rate },
              'loan active',
            );
          }
        }
      }
    } catch (e: any) {
      // Don't spam; log once per error class
      logger.debug(`poller: ${e.message}`);
    }
  }, config.matchPollMs);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           GHOST Finance CLI - Midnight Network            ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mnemonic = await getMnemonic();

  logger.info('building wallet');
  const seed = await mnemonicToSeed(mnemonic);
  const walletContext = await buildWalletFromSeed(seed, config);

  logger.info('syncing wallet');
  await waitForSync(walletContext.wallet);

  logger.info('checking funds');
  await waitForFunds(walletContext.wallet);

  logger.info('ensuring DUST for fees');
  await registerNightForDust(walletContext);

  await displayWalletInfo(walletContext);

  // Start background match poller
  const pollerHandle = startMatchPoller(walletContext);

  let running = true;
  while (running) {
    console.log('─────────────────── Main Menu ───────────────────────');
    console.log('1. Lend Intent');
    console.log('2. Borrow Intent');
    console.log('3. List All Intents');
    console.log('4. My Loans');
    console.log('5. Settle Loan (lender)');
    console.log('6. Send (raw)');
    console.log('7. Receive');
    console.log('8. Fund Wallet (localnet)');
    console.log('9. Refresh Wallet Info');
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
          await handleListIntents();
          break;
        case '4':
          await handleMyLoans(walletContext);
          break;
        case '5':
          await handleSettleLoan(walletContext);
          break;
        case '6':
          await handleSend(walletContext);
          break;
        case '7':
          await handleReceive(walletContext);
          break;
        case '8':
          await handleFundWallet(walletContext);
          break;
        case '9':
          await displayWalletInfo(walletContext);
          break;
        case '0':
          running = false;
          break;
        default:
          console.log('invalid choice');
      }
    } catch (e: any) {
      logger.error(`error: ${e.message}`);
    }
  }

  clearInterval(pollerHandle);
  rl.close();
  logger.info('shutting down');
  process.exit(0);
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
