// Replicate deriveKeysFromSeed + unshieldedKeystore address locally
// without building a full wallet (no localnet needed).
import { mnemonicToSeed } from '../src/wallet-api.js';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('undeployed');

const mnems = [
  'hard animal differ find matter body walk notable empty video piece burger able gym silver ensure neck reduce bottom picnic record tomato like divide',
  'add width bag erode equip order echo boil depth identify daring nice slow parent general borrow canal board meat auto high debate sponsor service',
];

for (let i = 0; i < mnems.length; i++) {
  const seed = await mnemonicToSeed(mnems[i]!);
  const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hd.type !== 'seedOk') throw new Error('seed');

  // Batch derivation (new ghost-cli code)
  const batch = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (batch.type !== 'keysDerived') throw new Error('batch ' + batch.type);
  const batchKey = Buffer.from(batch.keys[Roles.NightExternal]);
  const ks1 = createKeystore(batchKey, getNetworkId());
  console.log(`W${i + 1} BATCH:   ${ks1.getBech32Address().asString()}`);

  // Single derivation (old ghost-cli code)
  const hd2 = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hd2.type !== 'seedOk') throw new Error('seed2');
  const single = hd2.hdWallet.selectAccount(0).selectRole(Roles.NightExternal).deriveKeyAt(0);
  if (single.type !== 'keyDerived') throw new Error('single ' + single.type);
  const singleKey = Buffer.from(single.key);
  const ks2 = createKeystore(singleKey, getNetworkId());
  console.log(`W${i + 1} SINGLE:  ${ks2.getBech32Address().asString()}`);

  console.log(`W${i + 1} same key? ${batchKey.equals(singleKey)}`);
}
process.exit(0);
