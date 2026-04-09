/**
 * Generate a fresh preprod wallet seed for ghost contract deployment.
 *
 * Writes ./wallet.json with { seed, address, network: 'preprod' }.
 * Print the bech32 unshielded address — fund it via:
 *   https://faucet.preprod.midnight.network/
 * then wait 2-5 minutes before running `node deploy.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

setNetworkId('preprod');

const WALLET_FILE = path.resolve('wallet.json');

if (fs.existsSync(WALLET_FILE)) {
  const existing = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
  console.log('wallet.json already exists. Reusing.');
  console.log(`Address: ${existing.address}`);
  console.log(`Network: ${existing.network}`);
  process.exit(0);
}

// 32-byte random seed (hex)
const seed = crypto.randomBytes(32).toString('hex');

const hdResult = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hdResult.type !== 'seedOk') throw new Error('seed init failed');

const derived = hdResult.hdWallet
  .selectAccount(0)
  .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
  .deriveKeysAt(0);
if (derived.type !== 'keysDerived') throw new Error('key derivation failed');
hdResult.hdWallet.clear();

const unshieldedKeystore = createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
const address = unshieldedKeystore.getBech32Address().asString();

fs.writeFileSync(
  WALLET_FILE,
  JSON.stringify({ seed, address, network: 'preprod' }, null, 2),
  { mode: 0o600 },
);

console.log('=== NEW PREPROD WALLET ===');
console.log(`Seed (KEEP SECRET): ${seed}`);
console.log(`Address:            ${address}`);
console.log(`File:               ${WALLET_FILE}`);
console.log('\nNext steps:');
console.log('1. Open https://faucet.preprod.midnight.network/');
console.log('2. Paste the address above and request tNIGHT');
console.log('3. Wait 2-5 minutes for DUST to accrue');
console.log('4. Run: node deploy.mjs');
