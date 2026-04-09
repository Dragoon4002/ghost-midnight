import pino, { type Logger } from 'pino';
import pinoPretty from 'pino-pretty';

/**
 * Shared color-coded logger for ghost-cli.
 *
 * Custom levels slot between pino built-ins (info=30, warn=40).
 * Level thresholds: using level 'lendIntent' will also emit info/debug/trace,
 * but since default level is 'info' (30), everything 30+ passes through.
 */
export const customLevels = {
  lendIntent: 31,
  borrowIntent: 32,
  match: 33,
  transfer: 34,
  loanActive: 35,
  success: 36,
} as const;

const customColors = [
  'fatal:red',
  'error:red',
  'warn:yellow',
  'info:gray',
  'debug:gray',
  'trace:gray',
  'lendIntent:yellow',
  'borrowIntent:green',
  'match:cyan',
  'transfer:blue',
  'loanActive:magenta',
  'success:bgGreen',
].join(',');

const stream = pinoPretty({
  colorize: true,
  translateTime: 'HH:MM:ss.l',
  ignore: 'pid,hostname',
  singleLine: false,
  customColors,
  customLevels: Object.entries(customLevels)
    .map(([k, v]) => `${k}:${v}`)
    .join(','),
  useOnlyCustomProps: false,
});

export type GhostLogger = Logger<keyof typeof customLevels>;

export const logger: GhostLogger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    customLevels,
    useOnlyCustomLevels: false,
  },
  stream,
) as GhostLogger;
