import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import path from 'node:path';
export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

export const contractConfig = {
  privateStateStoreName: 'ghost-private-state',
  zkConfigPath: path.resolve(currentDir, '..', '..', 'ghost-contract', 'src', 'managed', 'ghost'),
};

export interface Config {
  readonly logDir: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

export class LocalConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v3/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v3/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId('undeployed');
  }
}
