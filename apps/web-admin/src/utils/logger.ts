// apps/web-admin/src/utils/logger.ts

const isDev = import.meta.env.DEV;

/**
 * Production-safe logger utility.
 * In development: logs full details including stack traces
 * In production: logs only messages without sensitive data
 */
export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(message, error);
    } else {
      // In production, only log the message without stack traces
      console.error(message);
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
