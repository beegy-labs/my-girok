/**
 * Logging utilities for consistent log formatting across services
 * SSOT for ID masking and sensitive data handling in logs
 */

/**
 * Mask an ID for logging purposes
 * Shows only the first N characters followed by '...'
 *
 * @param id - The ID to mask
 * @param visibleChars - Number of characters to show (default: 8)
 * @returns Masked ID string
 *
 * @example
 * maskId('01935c6d-c2d0-7abc-8def-1234567890ab') // '01935c6d...'
 * maskId('01935c6d-c2d0-7abc-8def-1234567890ab', 4) // '0193...'
 */
export function maskId(id: string | null | undefined, visibleChars: number = 8): string {
  if (!id) return '[empty]';
  if (id.length <= visibleChars) return id;
  return `${id.slice(0, visibleChars)}...`;
}

/**
 * Mask an email for logging purposes
 * Shows first 2 characters, then '***', then domain
 *
 * @param email - The email to mask
 * @returns Masked email string
 *
 * @example
 * maskEmail('user@example.com') // 'us***@example.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '[empty]';
  return email.replace(/(.{2}).*(@.*)/, '$1***$2');
}

/**
 * Mask an IP address for logging purposes
 * Shows only the first two octets
 *
 * @param ip - The IP address to mask
 * @returns Masked IP string
 *
 * @example
 * maskIp('192.168.1.100') // '192.168.x.x'
 */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) return '[empty]';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  // For IPv6 or other formats, show first part only
  return ip.split(':')[0] + ':...';
}
