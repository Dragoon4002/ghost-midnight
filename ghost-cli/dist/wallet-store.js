import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
const WALLET_DIR = path.join(os.homedir(), '.ghost');
const WALLET_FILE = path.join(WALLET_DIR, 'wallet.json');
export async function loadMnemonic() {
    try {
        const data = await fs.readFile(WALLET_FILE, 'utf-8');
        const store = JSON.parse(data);
        return store.mnemonic;
    }
    catch {
        return null;
    }
}
export async function saveMnemonic(mnemonic) {
    await fs.mkdir(WALLET_DIR, { recursive: true });
    const store = { mnemonic };
    await fs.writeFile(WALLET_FILE, JSON.stringify(store, null, 2), 'utf-8');
}
//# sourceMappingURL=wallet-store.js.map