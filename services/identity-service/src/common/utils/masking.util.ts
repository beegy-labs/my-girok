/**
 * Masking utilities for sensitive data in logs
 * Prevents PII exposure in logs while maintaining debugging capability
 *
 * GDPR/CCPA Compliance:
 * - IP addresses are anonymized per GDPR Article 5 (data minimization)
 * - IPv6 masks last 80 bits (per GDPR Working Party 29 guidelines)
 * - Personal identifiers are redacted to prevent PII exposure
 */

/**
 * Sensitive field names that should always be masked
 * Used by maskSensitiveData function
 */
export const SENSITIVE_KEYS = [
  // Authentication
  'password',
  'tempPassword',
  'currentPassword',
  'newPassword',
  'passwordHash',
  'password_hash',
  // Tokens
  'token',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'tokenHash',
  'token_hash',
  'pushToken',
  'push_token',
  'pushTokenHash',
  'push_token_hash',
  // Secrets
  'secret',
  'mfaSecret',
  'mfa_secret',
  'totpSecret',
  'totp_secret',
  'apiKey',
  'api_key',
  'privateKey',
  'private_key',
  // Session
  'sessionId',
  'session_id',
  'jti',
  // Personal info
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'credit_card',
  'cvv',
  // Backup codes
  'backupCode',
  'backup_code',
  'backupCodes',
  'backup_codes',
] as const;

/**
 * Mask a UUID for logging
 * Shows first 8 chars and last 4 chars, masks the middle
 * Example: 550e8400-e29b-41d4-a716-446655440000 → 550e8400-****-****-****-********0000
 */
export function maskUuid(uuid: string): string {
  if (!uuid || uuid.length < 12) {
    return '****';
  }
  const first = uuid.substring(0, 8);
  const last = uuid.substring(uuid.length - 4);
  return `${first}-****-****-****-********${last}`;
}

/**
 * Mask an email address for logging
 * Shows first 2 chars and domain, masks the rest
 * Example: user@example.com → us***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***@***';
  }
  const [localPart, domain] = email.split('@');
  const maskedLocal =
    localPart.length <= 2 ? '*'.repeat(localPart.length) : localPart.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask an IP address for logging (GDPR compliant)
 *
 * IPv4: Masks last 2 octets (16 bits)
 * Example: 192.168.1.100 → 192.168.0.0
 *
 * IPv6: Masks last 80 bits (per GDPR WP29 Opinion 4/2007)
 * Shows first 48 bits (3 hextets), zeros rest
 * Example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 → 2001:db8:85a3::
 *
 * @param ip - IP address to mask
 * @returns Anonymized IP address for logging
 */
export function maskIpAddress(ip: string): string {
  if (!ip) {
    return '0.0.0.0';
  }

  // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    const ipv4Part = ip.substring(7);
    return `::ffff:${maskIpv4(ipv4Part)}`;
  }

  // IPv6
  if (ip.includes(':')) {
    return maskIpv6(ip);
  }

  // IPv4
  return maskIpv4(ip);
}

/**
 * Mask IPv4 address (last 2 octets)
 */
function maskIpv4(ip: string): string {
  const parts = ip.split('.');
  if (parts.length !== 4) return '0.0.0.0';
  return `${parts[0]}.${parts[1]}.0.0`;
}

/**
 * Mask IPv6 address (last 80 bits per GDPR WP29)
 * Keeps first 48 bits (3 hextets)
 */
function maskIpv6(ip: string): string {
  // Expand :: notation for consistent processing
  const fullIp = expandIpv6(ip);
  const parts = fullIp.split(':');

  if (parts.length !== 8) return '::';

  // Keep first 3 hextets (48 bits), zero the rest
  const masked = parts.slice(0, 3).map((p) => p.replace(/^0+/, '') || '0');
  return `${masked.join(':')}::`;
}

/**
 * Expand IPv6 :: notation to full form
 */
function expandIpv6(ip: string): string {
  if (!ip.includes('::')) {
    return ip;
  }

  const [left, right] = ip.split('::');
  const leftParts = left ? left.split(':') : [];
  const rightParts = right ? right.split(':') : [];
  const missingCount = 8 - leftParts.length - rightParts.length;
  const middle = Array(missingCount).fill('0000');

  return [...leftParts, ...middle, ...rightParts].join(':');
}

/**
 * Mask a token for logging
 * Shows first 8 chars only
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) {
    return '********';
  }
  return `${token.substring(0, 8)}...`;
}

/**
 * Mask sensitive fields in an object for logging
 * Returns a new object with sensitive fields replaced with '[REDACTED]'
 *
 * Uses SENSITIVE_KEYS by default, but additional fields can be passed.
 * Performs case-insensitive matching for field names.
 *
 * @param data - Object containing potentially sensitive data
 * @param additionalFields - Additional field names to mask (beyond SENSITIVE_KEYS)
 * @returns New object with sensitive fields masked
 */
export function maskSensitiveData(
  data: Record<string, unknown>,
  additionalFields: string[] = [],
): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const masked: Record<string, unknown> = {};
  const sensitiveSet = new Set([
    ...SENSITIVE_KEYS.map((k) => k.toLowerCase()),
    ...additionalFields.map((k) => k.toLowerCase()),
  ]);

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveSet.has(lowerKey)) {
      masked[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively mask nested objects
      masked[key] = maskSensitiveData(value as Record<string, unknown>, additionalFields);
    } else if (Array.isArray(value)) {
      // Handle arrays of objects
      masked[key] = value.map((item) =>
        item !== null && typeof item === 'object'
          ? maskSensitiveData(item as Record<string, unknown>, additionalFields)
          : item,
      );
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Create a safe log context from request data
 * Masks common sensitive fields and IP addresses
 */
export function createSafeLogContext(data: {
  accountId?: string;
  email?: string;
  ipAddress?: string;
  [key: string]: unknown;
}): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  if (data.accountId) {
    context.accountId = maskUuid(data.accountId);
  }

  if (data.email) {
    context.email = maskEmail(data.email);
  }

  if (data.ipAddress) {
    context.ipAddress = maskIpAddress(data.ipAddress);
  }

  // Copy other non-sensitive fields
  for (const [key, value] of Object.entries(data)) {
    if (!['accountId', 'email', 'ipAddress'].includes(key)) {
      const lowerKey = key.toLowerCase();
      if (!SENSITIVE_KEYS.map((k) => k.toLowerCase()).includes(lowerKey)) {
        context[key] = value;
      }
    }
  }

  return context;
}
