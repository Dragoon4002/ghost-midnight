import pino, { type Logger } from 'pino';
import pinoPretty from 'pino-pretty';
import { config } from './config.js';

// Custom levels mapped to colors. Numeric values must be distinct and between
// pino built-ins (trace=10, debug=20, info=30, warn=40, error=50, fatal=60).
// We pick values in 31-39 to sit just above info, so default level 'info'
// allows all of them through.
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
    level: config.logLevel,
    customLevels,
    useOnlyCustomLevels: false,
  },
  stream,
) as GhostLogger;
