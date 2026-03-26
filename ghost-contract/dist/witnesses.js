import { createHash } from 'node:crypto';
export const createPrivateState = (ownerKey) => ({
    ownerKey,
});
/**
 * Compute a commitment hash for a bid.
 * H = sha256(amount || rate || nonce || owner), truncated to 32 bytes.
 */
export const computeCommitment = (amount, rate, nonce, // 32 bytes
owner) => {
    const buf = Buffer.alloc(8 + 4 + 32 + 32);
    buf.writeBigUInt64BE(amount, 0);
    buf.writeUInt32BE(Number(rate), 8);
    Buffer.from(nonce).copy(buf, 12);
    Buffer.from(owner).copy(buf, 44);
    const hash = createHash('sha256').update(buf).digest();
    return new Uint8Array(hash);
};
export const witnesses = {};
//# sourceMappingURL=witnesses.js.map