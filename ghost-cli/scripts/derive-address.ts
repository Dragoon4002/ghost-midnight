import { mnemonicToSeed } from '../src/wallet-api.js';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('undeployed');

const mnems = process.argv.slice(2);
if (mnems.length === 0) {
  console.error('usage: derive-address.ts "<mnemonic1>" ["<mnemonic2>" ...]');
  process.exit(1);
}

for (let i = 0; i < mnems.length; i++) {
  const seed = await mnemonicToSeed(mnems[i]!);
  const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hd.type !== 'seedOk') throw new Error('HD seed failed');
  const acct = hd.hdWallet.selectAccount(0);
  const r = acct.selectRole(Roles.NightExternal).deriveKeyAt(0);
  if (r.type !== 'keyDerived') throw new Error('derive failed');
  const ks = createKeystore(Buffer.from(r.key), getNetworkId());
  console.log(`WALLET${i + 1}_ADDR=${ks.getBech32Address().asString()}`);
}
