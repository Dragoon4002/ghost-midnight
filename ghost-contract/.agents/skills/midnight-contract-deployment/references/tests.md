# Testing Guidelines

Integrating and testing Midnight Smart contracts requires instantiating the entire stack: generating Wallets dynamically, spinning up local Blockchains, deploying the Contract via test sequences, and then validating ledger states.

We utilize `Vitest` running sequentially to avoid port collision.

## Setup Context

In your `package.json`, route the test command identically to the standalone bootup process:
```json
{"test-api": "docker compose -f standalone.yml pull && DEBUG='testcontainers' vitest run"}
```

## Writing Tests Pattern

The standard testing pattern requires using `testcontainers` `DockerComposeEnvironment` inside the test suite's `beforeAll` block to guarantee clean state.

```typescript
// integration.test.ts
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { DockerComposeEnvironment, StartedDockerComposeEnvironment } from 'testcontainers';
import { StandaloneConfig } from './config.js';
import * as api from './api.js';

describe('Game Contract Integration', () => {
  let dockerEnv: StartedDockerComposeEnvironment;
  let testProviders: api.GameProviders;
  let testWallet: api.WalletContext;

  beforeAll(async () => {
    // 1. Boot up the standalone Node, Indexer, and Proof Server
    const env = new DockerComposeEnvironment(path.resolve(currentDir, '..'), 'standalone.yml');
    dockerEnv = await env.up();
    
    // 2. Map standard standalone ports
    const config = new StandaloneConfig();
    
    // 3. Generate a fresh randomized seed for testing
    const seed = api.generateRandomSeed();
    const logger = await createLogger('test.log');

    // 4. Initialize Midnight Providers over the local containers
    testProviders = await api.initializeProviders(config, logger);
    testWallet = await api.buildWallet(testProviders, seed);
    
    // 5. Ensure the test wallet receives DUST needed for transactions!
    await api.registerForDustGeneration(testWallet.wallet);
  }, 60000); // Massive timeout required for container booting

  afterAll(async () => {
    await dockerEnv.down();
  });

  it('should deploy the contract via test wallet', async () => {
    const dummyHostKey = new Uint8Array(32).fill(0xee);
    const contract = await api.deploy(testProviders, {
      role: 0,
      myVote: 0,
      witnessedEvents: []
    }, dummyHostKey, 10n);

    expect(contract.deployTxData.public.contractAddress).toBeDefined();
    
    // Verify initial ledger
    const ledgerSource = testProviders.publicDataProvider.contractStateObservable(
      contract.deployTxData.public.contractAddress,
    );
    // ... wait for ledger state emission and assert values
  }, 30000); // 30 second timeouts on ZK-proof generation assertions
});
```

### Core Testing Learnings
1. **Timeouts**: Testcontainers can easily take 20+ seconds to boot, and ZK proofs take 2-5 seconds locally! Override `beforeAll` and `it` block timeouts heavily.
2. **Dust Funding**: A new wallet generated from `generateRandomSeed()` has zero DUST tokens. The test will crash on deployment unless `registerForDustGeneration()` is explicitly run right after wallet boot.
3. **Observables**: Always wrap ledger state validations in a promise checking for specific states, as Midnight's blockchain block propagation adds variable latency!
