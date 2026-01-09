/**
 * Utility functions for masking sensitive data in logs
 */

/**
 * Masks a UUID by showing only first and last segments
 * e.g., "550e8400-e29b-41d4-a716-446655440000" -> "550e8400-****-****-****-446655440000"
 */
export function maskUuid(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') {
    return '[invalid]';
  }

  const parts = uuid.split('-');
  if (parts.length !== 5) {
    // Not a standard UUID format, mask middle portion
    if (uuid.length <= 8) {
      return uuid.slice(0, 2) + '****' + uuid.slice(-2);
    }
    return uuid.slice(0, 4) + '****' + uuid.slice(-4);
  }

  return `${parts[0]}-****-****-****-${parts[4]}`;
}

/**
 * Masks a token by showing only first few characters
 * e.g., "eyJhbGciOiJIUzI1NiIs..." -> "eyJh****"
 */
export function maskToken(token: string): string {
  if (!token || typeof token !== 'string') {
    return '[invalid]';
  }

  if (token.length <= 8) {
    return '****';
  }

  return token.slice(0, 4) + '****';
}

/**
 * Masks an email address
 * e.g., "user@example.com" -> "u***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '[invalid]';
  }

  const [local, domain] = email.split('@');
  if (!domain) {
    return '****';
  }

  const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Creates a safe log context object by masking sensitive fields
 */
export function createSafeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
  ];

  const safeContext: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      safeContext[key] = '[REDACTED]';
    } else if (key.toLowerCase().includes('uuid') || key.toLowerCase() === 'id') {
      safeContext[key] = typeof value === 'string' ? maskUuid(value) : value;
    } else if (key.toLowerCase().includes('email')) {
      safeContext[key] = typeof value === 'string' ? maskEmail(value) : value;
    } else {
      safeContext[key] = value;
    }
  }

  return safeContext;
}
