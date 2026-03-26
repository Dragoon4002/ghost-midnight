export declare const currentDir: string;
export declare const contractConfig: {
    privateStateStoreName: string;
    zkConfigPath: string;
};
export interface Config {
    readonly logDir: string;
    readonly indexer: string;
    readonly indexerWS: string;
    readonly node: string;
    readonly proofServer: string;
}
export declare class LocalConfig implements Config {
    logDir: string;
    indexer: string;
    indexerWS: string;
    node: string;
    proofServer: string;
    constructor();
}
