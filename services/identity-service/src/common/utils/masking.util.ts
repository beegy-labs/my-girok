/**
 * Masking utilities for sensitive data in logs
 * Prevents PII exposure in logs while maintaining debugging capability
 */

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
 * Mask an IP address for logging
 * For IPv4: Shows first two octets, masks the rest
 * For IPv6: Shows first block, masks the rest
 * Example: 192.168.1.100 → 192.168.*.*
 */
export function maskIpAddress(ip: string): string {
  if (!ip) {
    return '*.*.*.*';
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length < 2) return '****:****';
    return `${parts[0]}:${parts[1]}:****:****`;
  }

  // IPv4
  const parts = ip.split('.');
  if (parts.length !== 4) return '*.*.*.*';
  return `${parts[0]}.${parts[1]}.*.*`;
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
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'mfaSecret', 'refreshToken'],
): T {
  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (field in masked && masked[field]) {
      masked[field] = '[REDACTED]' as unknown as T[keyof T];
    }
  }

  return masked;
}
