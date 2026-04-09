# Midnight Contract Deployment Skill

An AI agent skill for deploying Midnight smart contracts using Midnight SDK 4.x and Compact compiler 0.30.0. This skill provides battle-tested workarounds, CLI scaffolding patterns, and environment configurations for building production-ready Midnight DApps.

## What This Skill Does

This skill teaches AI agents how to:

- Deploy Midnight smart contracts to standalone and preprod networks
- Compile Compact 0.30.0 code with proper pragma and disclosure patterns
- Debug common Midnight SDK 4.x errors and type constraints
- Write integration tests using Vitest and testcontainers
- Set up CLI tools to interact with Midnight blockchain networks
- Implement critical workarounds for wallet signing bugs and type-checking issues

## When to Use This Skill

Use this skill when you need to:

- Deploy a Midnight smart contract
- Compile Compact code (especially version 0.30.0)
- Debug Midnight SDK errors or type mismatches
- Write integration tests for Midnight DApps
- Set up a CLI to interact with standalone or preprod networks
- Troubleshoot transaction signing or witness-related issues

## Installation

Install this skill using the Vercel Skills CLI:

```bash
npx skills add https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
```

Or install locally for development:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
npx skills add ./midnight-contract-deployment
```

## What's Included

### Core Documentation

- **SKILL.md** - Complete deployment guide with step-by-step checklist and common error solutions

### Reference Guides

- **cli-structure.md** - Architecture patterns for Midnight DApp CLI applications
- **commands.md** - Package script setup and Node execution flags
- **logging.md** - Pino logging configuration for clean CLI output
- **tests.md** - Vitest and testcontainers setup for isolated testing

### Code Templates

- **template-api.ts** - SDK wrapper with signTransactionIntents workaround
- **template-config.ts** - Network configuration boilerplate for standalone and preprod

## Key Features

### Critical Workarounds

This skill includes solutions for known issues in Midnight SDK 4.x:

1. **signTransactionIntents Bug** - Wallet SDK transaction signing workaround
2. **Contract Generic Type Constraints** - TypeScript compilation fixes
3. **Witness Function Validation** - Proper witness implementation patterns
4. **Constructor Argument Mismatches** - Deployment initialization fixes

### Environment Support

- **Standalone** - Local testnet using Docker and testcontainers
- **Preprod** - Testnet deployment with custom proof server setup

### Technology Stack

- Compact CLI (Compiler): 0.30.0
- Midnight SDK: 4.x (@midnight-ntwrk/midnight-js: ^4.0.4)
- Node Execution: ESM with ts-node loader
- Testing: Vitest with testcontainers
- Logging: Pino with pretty formatting

## Quick Start Example

After installing the skill, your AI agent can help you:

```typescript
// 1. Set up network configuration
const config = new StandaloneConfig();

// 2. Deploy a contract with proper witnesses
const contract = await deployContract(providers, {
  args: [creatorBytes], // Match constructor signature
  witnesses: actualWitnesses, // Never use vacant witnesses
});

// 3. Sign transactions with the workaround
const signedTx = await signTransactionIntentsWorkaround(
  wallet,
  transactionIntents
);
```

## Common Issues Solved

- ✅ "Contract state constructor: expected X arguments, received Y"
- ✅ "first (witnesses) argument does not contain a function-valued field"
- ✅ "Type 'Contract' is not generic" TypeScript errors
- ✅ Transactions stuck indefinitely or rejected by Node
- ✅ "potential witness-value disclosure" compile errors

## Requirements

- Node.js with ESM support
- Docker (for standalone network)
- TypeScript 4.x+
- Midnight SDK 4.x
- Compact compiler 0.30.0

## Project Structure

This skill follows the recommended Midnight DApp architecture:

```
project/
├── contract/              # Compact smart contract code
│   ├── src/
│   └── dist/
└── project-cli/          # CLI application
    ├── src/
    │   ├── api.ts        # SDK wrapper layer
    │   ├── cli.ts        # Presentation layer
    │   ├── config.ts     # Network configuration
    │   ├── standalone.ts # Local testnet bootstrapper
    │   └── preprod.ts    # Preprod network bootstrapper
    └── package.json
```

## Contributing

Contributions are welcome! If you discover new workarounds or improvements:

1. Fork the repository
2. Create a feature branch
3. Update the relevant reference documentation
4. Submit a pull request

## License

[Your License Here - e.g., MIT]

## Support

For issues or questions:

- Open an issue on GitHub
- Check the reference guides in the `references/` directory
- Review the code templates in the `assets/` directory

## Version History

- **1.0.0** - Initial release with Midnight SDK 4.x and Compact 0.30.0 support

---

Built for the Midnight blockchain ecosystem. This skill is maintained independently and is not officially affiliated with Midnight Network.
