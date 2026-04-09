# Logging Guidelines

Midnight CLI interactions and background process synchronizations (like Indexer sync and Wallet sync) produce a huge amount of trace information that must be persisted to a file while keeping the CLI console clean for user interaction.

## Tooling Strategy

Use the `pino` and `pino-pretty` libraries to handle multi-stream output:
- **`pino`**: The core logger, exceptionally fast and formatted in easily parsable JSON for backend file logs.
- **`pino-pretty`**: Formats the console `stdout` layer into a colorful, human-readable format, preventing JSON blobs from polluting the end user's CLI prompt.

## Implementation Pattern

```typescript
// logger-utils.ts
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { createWriteStream } from 'node:fs';

export const createLogger = async (logPath: string): Promise<pino.Logger> => {
  // 1. Ensure the logging directory (e.g., ./logs/preprod/) actually exists beforehand
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  
  // 2. Configure the pretty stream for the terminal output
  const pretty: pinoPretty.PrettyStream = pinoPretty({
    colorize: true,
    sync: true,  // Important: Sync ensures CLI prompts aren't overwritten unpredictably
  });
  
  // 3. Fallback on environment variables for debugging
  const level = process.env.DEBUG_LEVEL || 'info';

  // 4. Pipe logs dynamically to both destinations
  return pino(
    { level, depthLimit: 20 },
    pino.multistream([
      { stream: pretty, level },
      { stream: createWriteStream(logPath), level },
    ]),
  );
};
```

## How to use Contextual Logging

Pass the logger instance from your bootstrappers (`standalone.ts` or `preprod.ts`) into the top-level functions instead of relying on a global singletons, as environment variables and network log paths vary locally!

```typescript
const logger = await createLogger(config.logDir);

logger.info(`Deployed contract at address: ${gameContract.deployTxData.public.contractAddress}`);
logger.warn('Preproof transaction identified. Executing workaround override...');
```
