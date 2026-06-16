import { pino } from 'pino';
import { config } from '../config/index.js';
import { captureException } from './sentry.js';

const isDev = config.nodeEnv === 'development';
const isTest = config.nodeEnv === 'test' || !!process.env.VITEST;

// Structured JSON logger. Pretty-printed in dev, silent under test, JSON in prod.
export const logger = pino({
  level: isTest ? 'silent' : config.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[redacted]',
  },
  transport: isDev && !isTest ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
});

// console-compatible facade so existing `log.error('msg', err)` call-sites keep
// their shape while emitting structured logs (and forwarding real Errors to Sentry).
export const log = {
  info: (msg: string, ...rest: unknown[]): void => {
    if (rest.length) logger.info({ details: rest }, msg);
    else logger.info(msg);
  },
  warn: (msg: string, ...rest: unknown[]): void => {
    if (rest.length) logger.warn({ details: rest }, msg);
    else logger.warn(msg);
  },
  error: (msg: string, ...rest: unknown[]): void => {
    const err = rest.find((r) => r instanceof Error) as Error | undefined;
    if (rest.length) logger.error({ err, details: rest }, msg);
    else logger.error(msg);
    if (err) captureException(err);
  },
};
