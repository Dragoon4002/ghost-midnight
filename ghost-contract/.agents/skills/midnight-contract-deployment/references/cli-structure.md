# Midnight Architecture & CLI Structure

Building a CLI or Application on top of the Midnight SDK `4.x` requires managing multiple concurrent layers: Node environments, Indexer synchronization, Docker composition, network configurations, and the UI/CLI Event loops.

## Repository Component Architecture

A typical Midnight project leverages `npm workspaces` to separate the compiler output from the consumer DApp.

```
project/
├── contract/
│   ├── src/                 # Contains `.compact` logic and `witnesses.ts`
│   ├── dist/                # Output of `compactc` via npm build
│   └── package.json
└── project-cli/
    ├── src/
    │   ├── api.ts           # The Midnight SDK wrapper
    │   ├── cli.ts           # The presentation layer & user input
    │   ├── common-types.ts  # Export wrappers around SDK/Compiler typings
    │   ├── config.ts        # Dynamic Network URLs configuration
    │   ├── preprod.ts       # Main Network initializer script
    │   └── standalone.ts    # Docker logic for local testnets
    └── package.json
```

## Layer Separation

### `config.ts`
This is your **Environment Configuration** layer.
- Resolves paths to compiled zk assets (`path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'game')`).
- Maintains classes representing each network environment containing four critical URIs: `logDir`, `indexer`, `indexerWS`, `node`, `proofServer`.
- Critically, this file must fire `setNetworkId('preprod')` or `setNetworkId('undeployed')` in the class constructor to prep the wallet!

### `common-types.ts`
This acts as a strict typing boundary to prevent `tsc` from getting confused by dynamic compiler outputs. 
- You should map `Contract<any>` back to simple exports.
- Define Private State structures locally so the consumer application understands them without relying on generic typings from `@project/contract`.

### `api.ts`
This is your **Adapter Layer**. It should have zero knowledge of CLI prompts.
- Responsible for wrapping `@midnight-ntwrk/midnight-js`.
- Contains the `signTransactionIntents` workaround.
- Compiles the `gameCompiledContract` pipeline.
- Exposes clean methods like `deploy(providers, state, hostKey)` and `join(providers, contractAddress)`.
- Re-casts types heavily using `as any` because Midnight `4.x` TS generation frequently conflicts with `compact 0.30.0` strict boundaries.

### `cli.ts`
This is your **Presentation Layer**.
- Listens to `stdin`.
- Exclusively uses `console.log` and `inquire` prompts.
- When an action is chosen, it delegates to `api.ts`.
- Subscribes to the `Wallet` and `Dust` state via RxJS Observables.

### `standalone.ts` & `preprod.ts`
These are your **Bootstrappers**.
- Initializes Docker networks for test environments using `testcontainers` (for `standalone`).
- Configures Midnight `Node`, `Proof Server`, and `Indexer` URLs via `config.ts`.
- Executes the `WalletFacade` builder using the specific configuration.
- Finally, injects the `WalletContext` and `Providers` into `cli.ts`.

## Docker & Proof Servers

You cannot deploy a contract without a Proof Server.
For **Standalone**: `testcontainers` orchestrates a Local Node, a Local Indexer, and a Local Proof Server automatically from within the bootstrapper typescript execution.
For **Preprod**: You must deploy your own container of the Proof Server bound to preprod URLs because Midnight does not provide an open public proof server.

```yaml
# proof-server.yml (Preprod)
services:
  proof-server:
    image: ghcr.io/midnight-ntwrk/proof-server:4.2.0
    environment:
      - NETWORK_NAME=preprod
      - NODE_URL=https://rpc.preprod.midnight.network
```
