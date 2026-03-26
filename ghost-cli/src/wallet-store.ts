import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const WALLET_DIR = path.join(os.homedir(), '.ghost');
const WALLET_FILE = path.join(WALLET_DIR, 'wallet.json');

export interface WalletStore {
  mnemonic: string;
}

export async function loadMnemonic(): Promise<string | null> {
  try {
    const data = await fs.readFile(WALLET_FILE, 'utf-8');
    const store: WalletStore = JSON.parse(data);
    return store.mnemonic;
  } catch {
    return null;
  }
}

export async function saveMnemonic(mnemonic: string): Promise<void> {
  await fs.mkdir(WALLET_DIR, { recursive: true });
  const store: WalletStore = { mnemonic };
  await fs.writeFile(WALLET_FILE, JSON.stringify(store, null, 2), 'utf-8');
}
