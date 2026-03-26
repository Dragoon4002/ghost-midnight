import { Ghost, type GhostPrivateState } from '@ghost/ghost-contract';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ImpureCircuitId } from '@midnight-ntwrk/compact-js';

export type GhostCircuits = ImpureCircuitId<Ghost.Contract<GhostPrivateState>>;

export const GhostPrivateStateId = 'ghostPrivateState';

export type GhostProviders = MidnightProviders<GhostCircuits, typeof GhostPrivateStateId, GhostPrivateState>;

export type GhostContract = Ghost.Contract<GhostPrivateState>;

export type DeployedGhostContract = DeployedContract<GhostContract> | FoundContract<GhostContract>;
