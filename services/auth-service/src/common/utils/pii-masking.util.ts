/**
 * PII Masking Utilities for auth-service (#463)
 *
 * Provides functions to mask Personally Identifiable Information (PII)
 * in logs and audit trails to comply with privacy regulations.
 *
 * Masking patterns:
 * - Email: test@example.com -> t***@e***.com
 * - Phone: 010-1234-5678 -> 010-****-5678
 * - IP: 192.168.1.100 -> 192.168.***
 */

/**
 * Mask an email address.
 *
 * @param email - The email address to mask
 * @returns Masked email (e.g., t***@e***.com)
 *
 * @example
 * maskEmail('john.doe@example.com') // 'j***@e***.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '***';

  const atIndex = email.indexOf('@');
  if (atIndex === -1) return '***';

  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex + 1);

  // Get first character of local part
  const maskedLocal = localPart.length > 0 ? `${localPart[0]}***` : '***';

  // Get first character of domain (before first dot)
  const domainDotIndex = domainPart.indexOf('.');
  const domainName = domainDotIndex > 0 ? domainPart.substring(0, domainDotIndex) : domainPart;
  const domainExt = domainDotIndex > 0 ? domainPart.substring(domainDotIndex) : '';
  const maskedDomain =
    domainName.length > 0 ? `${domainName[0]}***${domainExt}` : `***${domainExt}`;

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask a phone number.
 *
 * @param phone - The phone number to mask
 * @returns Masked phone (e.g., 010-****-5678)
 *
 * @example
 * maskPhone('010-1234-5678') // '010-****-5678'
 * maskPhone('+82-10-1234-5678') // '+82-10-****-5678'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '***';

  // Remove all non-digit characters except + and -
  const cleaned = phone.replace(/[^\d+-]/g, '');

  if (cleaned.length < 4) return '***';

  // Keep first 3 digits (or country code part) and last 4 digits
  const parts = phone.split(/[-\s]/);

  if (parts.length >= 3) {
    // Format: 010-1234-5678 or +82-10-1234-5678
    const lastPart = parts[parts.length - 1];
    const middleParts = parts.slice(1, -1).map(() => '****');
    return [parts[0], ...middleParts, lastPart].join('-');
  }

  // No separators - mask middle portion
  if (cleaned.length > 7) {
    const prefix = cleaned.substring(0, 3);
    const suffix = cleaned.substring(cleaned.length - 4);
    return `${prefix}****${suffix}`;
  }

  return '***';
}

/**
 * Mask an IP address.
 *
 * @param ip - The IP address to mask
 * @returns Masked IP (e.g., 192.168.*** for IPv4)
 *
 * @example
 * maskIpAddress('192.168.1.100') // '192.168.***'
 * maskIpAddress('10.0.0.1') // '10.0.***'
 */
export function maskIpAddress(ip: string | null | undefined): string {
  if (!ip) return '***';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***`;
    }
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:***`;
    }
  }

  return '***';
}

/**
 * Mask a name (first name or full name).
 *
 * @param name - The name to mask
 * @returns Masked name (e.g., J*** D***)
 *
 * @example
 * maskName('John Doe') // 'J*** D***'
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '***';

  const parts = name.split(/\s+/);
  return parts.map((part) => (part.length > 0 ? `${part[0]}***` : '***')).join(' ');
}

/**
 * Mask an object's PII fields in-place for logging.
 *
 * @param obj - The object to mask
 * @param fields - Optional list of field names to mask
 * @returns A new object with masked PII fields
 */
export function maskPiiFields<T extends Record<string, unknown>>(obj: T, fields?: string[]): T {
  const defaultFields = [
    'email',
    'phone',
    'phoneNumber',
    'phone_number',
    'ip',
    'ipAddress',
    'ip_address',
    'name',
  ];
  const fieldsToMask = fields ?? defaultFields;

  const result = { ...obj };

  for (const field of fieldsToMask) {
    if (field in result && typeof result[field] === 'string') {
      const value = result[field] as string;

      if (field.toLowerCase().includes('email')) {
        (result as Record<string, unknown>)[field] = maskEmail(value);
      } else if (field.toLowerCase().includes('phone')) {
        (result as Record<string, unknown>)[field] = maskPhone(value);
      } else if (field.toLowerCase().includes('ip')) {
        (result as Record<string, unknown>)[field] = maskIpAddress(value);
      } else if (field.toLowerCase().includes('name')) {
        (result as Record<string, unknown>)[field] = maskName(value);
      }
    }
  }

  return result;
}

/**
 * Configuration for PII masking interceptor.
 */
export interface PiiMaskingConfig {
  bodyFields?: string[];
  queryFields?: string[];
  paramFields?: string[];
  autoDetect?: boolean;
}

/**
 * Default PII masking configuration.
 */
export const DEFAULT_PII_MASKING_CONFIG: PiiMaskingConfig = {
  bodyFields: ['email', 'phone', 'phoneNumber', 'name', 'ipAddress'],
  queryFields: ['email', 'phone'],
  paramFields: [],
  autoDetect: true,
};
