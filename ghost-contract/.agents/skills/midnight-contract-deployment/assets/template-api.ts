import { Contract, ledger, witnesses } from '@framed/contract';
import { type GameProviders, type DeployedGameContract } from './common-types.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { WebSocket } from 'ws';
import type { WalletFacade, TransactionIntent } from '@midnight-ntwrk/wallet-sdk-facade';

// Required for GraphQL subscriptions (wallet sync) to work in Node.js
globalThis.WebSocket = WebSocket as any;

/**
 * -----------------------------------------------------------------------------
 * WORKAROUND: signTransactionIntents bug in Wallet SDK 4.x
 * -----------------------------------------------------------------------------
 * 
 * Midnight SDK 4.0.4 has a known bug where wallet-sdk misidentifies
 * TransactionIntents as "pre-proof" rather than "proof", causing network
 * rejection. We MUST wrap the wallet's signing method to manually override
 * the kind flag back to 'proof'.
 */
export const signTransactionIntents = async (
  wallet: WalletFacade,
  intents: TransactionIntent[],
): Promise<Uint8Array[]> => {
  const signed = await wallet.signTransactionIntents(intents);
  for (let i = 0; i < signed.length; i++) {
    const tx = signed[i];
    // Workaround: Patch 0x01 (pre-proof) with 0x02 (proof) at index 3
    if (intents[i].kind === 'proof' && tx.length > 3 && tx[3] === 0x01) {
      tx[3] = 0x02;
    }
  }
  return signed;
};

// -----------------------------------------------------------------------------
// CompiledContract Pipeline
// -----------------------------------------------------------------------------

// Make sure to bypass typescript generic constraints and provide actual witnesses!
const gameCompiledContract = ((CompiledContract as any).make('game', Contract)).pipe(
  (CompiledContract as any).withWitnesses(witnesses), 
  (CompiledContract as any).withCompiledFileAssets('./path/to/zk-config-path'),
) as any;

// -----------------------------------------------------------------------------
// Deployment 
// -----------------------------------------------------------------------------

export const deploy = async (
  providers: GameProviders,
  privateState: any, // Your specific private state interface
  creator: Uint8Array,
  maxPlayers: bigint,
): Promise<DeployedGameContract> => {
  const gameContract = await deployContract(providers as any, {
    compiledContract: gameCompiledContract,
    privateStateId: 'gamePrivateState',
    initialPrivateState: privateState,
    args: [creator, maxPlayers], // REQUIRED: Constructor arguments based on your .compact file
  });
  return gameContract;
};

// ... Join and Call functions use similar `(providers as any)` and `as any` casting for circuits.
