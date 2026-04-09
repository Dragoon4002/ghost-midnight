# Running Commands & Project Lifecycles

Midnight Application CLIs heavily rely on orchestrating local configurations for developers to quickly test Smart Contracts without spending Preprod `tNight` testnet tokens.

A robust Node/CLI implementation maps network stages directly into `package.json` scripts, pairing local TS Node execution with Docker Compose containers representing the Indexer, local Node, and Proof Server.

## Package Scripts Best Practices

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "build": "rm -rf dist && tsc --project tsconfig.build.json",
    
    "standalone": "docker compose -f standalone.yml pull && node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm src/standalone.ts",
    
    "preprod": "node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm src/preprod.ts",
    "preprod-ps": "docker compose -f proof-server.yml pull && node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm src/preprod-start-proof-server.ts"
  }
}
```

### Explaining The Commands

1. **`build` and `typecheck`**: Always run these first. Given the complexity of Midnight compiler types, the DApp should verify no `Contracts` break constraints before booting massive Node instances.
2. **`npm run standalone`**:
   - Executes entirely locally.
   - Bootstraps `DockerComposeEnvironment` inside testcontainers locally on standard ports (`9944`, `8088`, `6300`).
   - Warning: Standalone Docker image layers are massive (often exceeding 2GB), meaning a raw `pull` step inside CI requires enormous network bandwidth.
3. **`npm run preprod` and `npm run preprod-ps`**:
   - The Preprod network runs remote Indexers and Node URLs.
   - However, Midnight does not currently run an open Proof Server URI.
   - To interact with `preprod`, a developer must first run `npm run preprod-ps` to boot the proof server mapping locally (binding to the remote node via environment flags in `proof-server.yml`), and *then* run the actual CLI interactions using `npm run preprod`.

## Resolving ESM and Node module execution

The SDK relies on deep ESM hierarchies. The standard `ts-node src/script.ts` will fail to resolve subpackage node paths.
You must always run your commands with the specific experimental resolution flags:
`node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm src/YOUR_TARGET.ts`
