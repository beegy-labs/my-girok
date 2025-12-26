import { createHash } from 'crypto';

/**
 * Session subject types matching the database enum
 */
export type SessionSubjectType = 'USER' | 'ADMIN' | 'OPERATOR';

/**
 * Generate SHA256 hash of a token for secure storage
 * 2025 Best Practice: Never store plain tokens in database
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Session expiration constants
 */
export const SESSION_EXPIRY = {
  REFRESH_TOKEN_DAYS: 14,
  ACCESS_TOKEN_HOURS: 1,
} as const;

/**
 * Calculate session expiration date
 */
export function getSessionExpiresAt(days: number = SESSION_EXPIRY.REFRESH_TOKEN_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
