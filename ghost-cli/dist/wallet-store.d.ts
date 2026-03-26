export interface WalletStore {
    mnemonic: string;
}
export declare function loadMnemonic(): Promise<string | null>;
export declare function saveMnemonic(mnemonic: string): Promise<void>;
