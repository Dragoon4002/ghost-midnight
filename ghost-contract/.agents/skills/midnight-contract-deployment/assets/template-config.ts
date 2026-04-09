import path from 'node:path';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';

// Configure the correct paths for the contract ZK file assets
export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

export const contractConfig = {
  privateStateStoreName: 'my-private-state',
  zkConfigPath: path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'game'),
};

export interface Config {
  readonly logDir: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

/** 
 * Local Standalone Testnet Configuration
 * Matches the default exposed ports in `testcontainers` or docker-compose.
 */
export class StandaloneConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v3/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v3/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId('undeployed');
  }
}

/** 
 * Official Midnight Preprod configuration.
 * Note: The proof-server runs locally as a proxy bounding to preprod node.
 */
export class PreprodConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', 'preprod', `${new Date().toISOString()}.log`);
  indexer = 'https://indexer.preprod.midnight.network/api/v3/graphql';
  indexerWS = 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';
  node = 'https://rpc.preprod.midnight.network';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
     // REQUIRED: You must set the network ID correctly for signatures to work!
    setNetworkId('preprod');
  }
}
