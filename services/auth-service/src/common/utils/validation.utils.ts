/**
 * Validation utilities for input validation across services
 * SSOT for common validation patterns
 */

/**
 * UUID v7 regex pattern
 * Matches standard UUID format with version 1-7
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email regex pattern
 * Basic validation - not comprehensive but catches most invalid formats
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate UUID format
 *
 * @param id - The string to validate
 * @returns true if valid UUID format
 *
 * @example
 * isValidUuid('01935c6d-c2d0-7abc-8def-1234567890ab') // true
 * isValidUuid('not-a-uuid') // false
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

/**
 * Validate email format
 *
 * @param email - The string to validate
 * @returns true if valid email format
 *
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Validate country code format (ISO 3166-1 alpha-2)
 *
 * @param code - The country code to validate
 * @returns true if valid 2-letter country code
 *
 * @example
 * isValidCountryCode('KR') // true
 * isValidCountryCode('USA') // false
 */
export function isValidCountryCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^[A-Z]{2}$/.test(code);
}

/**
 * Validate TOTP code format (6 digits)
 *
 * @param code - The TOTP code to validate
 * @returns true if valid 6-digit code
 *
 * @example
 * isValidTotpCode('123456') // true
 * isValidTotpCode('12345') // false
 */
export function isValidTotpCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^\d{6}$/.test(code);
}

/**
 * Validate backup code format (XXXX-XXXX)
 *
 * @param code - The backup code to validate
 * @returns true if valid backup code format
 *
 * @example
 * isValidBackupCode('ABCD-1234') // true
 * isValidBackupCode('ABC-123') // false
 */
export function isValidBackupCode(code: string | null | undefined): boolean {
  if (!code) return false;
  // Allow with or without dash
  return /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(code);
}
