import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { config } from './config.js';
import { logger } from './logger.js';
import { initStore } from './store.js';
import { routes } from './routes.js';
import { startMatchingEngine } from './matching.js';

async function main() {
  logger.info('booting ghost-server');
  initStore(config.dataFile);
  logger.info({ dataFile: config.dataFile }, 'store initialized');

  const app = new Hono();
  app.route('/', routes);

  const ticker = startMatchingEngine();

  const server = serve(
    {
      fetch: app.fetch,
      port: config.port,
    },
    (info) => {
      logger.success(
        { port: info.port, epochMs: config.epochMs },
        `ghost-server listening on :${info.port}`,
      );
    },
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    clearInterval(ticker);
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, 'fatal startup error');
  process.exit(1);
});
