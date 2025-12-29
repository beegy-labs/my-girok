// apps/web-admin/src/utils/logger.ts

import { trackError } from '../lib/otel';

const isDev = import.meta.env.DEV;

/**
 * Production-safe logger utility.
 * In development: logs full details including stack traces
 * In production: logs only messages without sensitive data, sends to OTEL
 */
export const logger = {
  error: (message: string, error?: unknown, context?: string) => {
    if (isDev) {
      console.error(message, error);
    } else {
      // In production, send to OTEL for tracking
      if (error instanceof Error) {
        trackError(error, context);
      } else if (error) {
        trackError(new Error(String(error)), context);
      }
    }
  },

  warn: (message: string, data?: unknown) => {
    if (isDev) {
      console.warn(message, data);
    }
  },

  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.info(message, data);
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.log('[DEBUG]', message, data);
    }
  },
};
