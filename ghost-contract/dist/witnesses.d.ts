export type GhostPrivateState = {
    readonly ownerKey: Uint8Array;
};
export declare const createPrivateState: (ownerKey: Uint8Array) => GhostPrivateState;
/**
 * Compute a commitment hash for a bid.
 * H = sha256(amount || rate || nonce || owner), truncated to 32 bytes.
 */
export declare const computeCommitment: (amount: bigint, rate: bigint, nonce: Uint8Array, // 32 bytes
owner: Uint8Array) => Uint8Array;
export declare const witnesses: {};
