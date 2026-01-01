/**
 * PII Masking Utilities
 *
 * Utilities for masking Personally Identifiable Information (PII)
 * for logging, audit trails, and data anonymization.
 *
 * Supports:
 * - Email addresses
 * - Phone numbers (international formats)
 * - Names (including Korean names)
 * - UUIDs
 * - IP addresses
 * - Credit card numbers
 * - Birth dates
 * - Addresses
 * - Generic text
 * - Recursive object masking
 */

/**
 * Mask pattern configuration
 */
export interface MaskingOptions {
  /** Character to use for masking (default: '*') */
  maskChar?: string;
  /** Number of characters to show at start */
  showStart?: number;
  /** Number of characters to show at end */
  showEnd?: number;
}

/**
 * Object masking configuration
 */
export interface ObjectMaskingOptions {
  /** Fields to mask (case-insensitive) */
  fieldsToMask?: string[];
  /** Custom masking function per field */
  customMaskers?: Record<string, (value: unknown) => string>;
  /** Mask all string values (default: false) */
  maskAllStrings?: boolean;
  /** Maximum depth for nested object traversal (default: 10) */
  maxDepth?: number;
}

/**
 * Default fields to mask when processing objects
 */
export const DEFAULT_PII_FIELDS = [
  'email',
  'emailAddress',
  'mail',
  'phone',
  'phoneNumber',
  'mobile',
  'tel',
  'telephone',
  'name',
  'firstName',
  'lastName',
  'fullName',
  'displayName',
  'username',
  'password',
  'ssn',
  'socialSecurityNumber',
  'birthDate',
  'dateOfBirth',
  'dob',
  'birthday',
  'address',
  'streetAddress',
  'homeAddress',
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'ipAddress',
  'ip',
];

/**
 * Mask an email address
 * Shows first character and domain
 *
 * @param email - Email address to mask
 * @returns Masked email (e.g., "u***@example.com")
 *
 * @example
 * maskEmail('user@example.com') // "u***@example.com"
 * maskEmail('john.doe@company.org') // "j***@company.org"
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const atIndex = email.indexOf('@');
  if (atIndex <= 0) {
    return maskText(email);
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (localPart.length === 1) {
    return `${localPart}***${domain}`;
  }

  return `${localPart[0]}***${domain}`;
}

/**
 * Mask a phone number
 * Shows country code and last 4 digits
 *
 * @param phone - Phone number to mask
 * @returns Masked phone (e.g., "+820***5678")
 *
 * @example
 * maskPhone('+821012345678') // "+820***5678"
 * maskPhone('010-1234-5678') // "010-***-5678"
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except +
  const digitsOnly = phone.replace(/[^\d+]/g, '');

  // Very short numbers: fully mask (no meaningful info to show)
  if (digitsOnly.length <= 4) {
    return '****';
  }

  // International format with + (e.g., +821012345678)
  if (digitsOnly.startsWith('+')) {
    const countryCode = digitsOnly.slice(0, 3); // +82 or +1 etc
    const last4 = digitsOnly.slice(-4);
    return `${countryCode}0***${last4}`;
  }

  // Domestic format (e.g., 01012345678)
  if (digitsOnly.length >= 8) {
    const first3 = digitsOnly.slice(0, 3);
    const last4 = digitsOnly.slice(-4);
    return `${first3}-***-${last4}`;
  }

  // Short number (5-7 digits): show last 4, mask rest
  return `***${digitsOnly.slice(-4)}`;
}

/**
 * Mask a name
 * Shows first character of each word/name part
 * Supports Western and Korean names
 *
 * @param name - Name to mask
 * @returns Masked name (e.g., "J*** D***" or "김**")
 *
 * @example
 * maskName('John Doe') // "J*** D***"
 * maskName('김철수') // "김**"
 * maskName('홍길동') // "홍**"
 */
export function maskName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  const trimmedName = name.trim();

  // Check if Korean name (contains Korean characters)
  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(trimmedName)) {
    // Korean name: show first character, mask rest
    if (trimmedName.length <= 1) {
      return trimmedName;
    }
    const maskLength = trimmedName.length - 1;
    return `${trimmedName[0]}${'*'.repeat(maskLength)}`;
  }

  // Western name: show first char of each word
  const words = trimmedName.split(/\s+/);
  return words
    .map((word) => {
      if (word.length === 0) return '';
      if (word.length === 1) return `${word}***`;
      return `${word[0]}***`;
    })
    .join(' ');
}

/**
 * Mask a UUID
 * Shows first 4 and last 4 characters
 *
 * @param uuid - UUID to mask
 * @returns Masked UUID (e.g., "0193****890a")
 *
 * @example
 * maskUuid('01935c6d-c2d0-7abc-8def-1234567890ab') // "0193****890a"
 */
export function maskUuid(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') {
    return '';
  }

  // Remove hyphens for consistent masking
  const clean = uuid.replace(/-/g, '');

  if (clean.length < 8) {
    return '****';
  }

  const first4 = clean.slice(0, 4);
  const last4 = clean.slice(-4);
  return `${first4}****${last4}`;
}

/**
 * Mask an IP address
 * Shows first two octets, masks last two
 *
 * @param ip - IP address to mask
 * @returns Masked IP (e.g., "192.168.x.x")
 *
 * @example
 * maskIpAddress('192.168.1.100') // "192.168.x.x"
 * maskIpAddress('10.0.0.1') // "10.0.x.x"
 */
export function maskIpAddress(ip: string): string {
  if (!ip || typeof ip !== 'string') {
    return '';
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:****:****`;
    }
    return '****:****:****:****';
  }

  // IPv4
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return 'x.x.x.x';
  }

  return `${parts[0]}.${parts[1]}.x.x`;
}

/**
 * Mask a credit card number
 * Shows first 4 and last 4 digits (PCI-DSS compliant)
 *
 * @param cardNumber - Credit card number to mask
 * @returns Masked card number (e.g., "4111-****-****-1111")
 *
 * @example
 * maskCreditCard('4111111111111111') // "4111-****-****-1111"
 * maskCreditCard('4111-1111-1111-1111') // "4111-****-****-1111"
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return '';
  }

  // Remove all non-digit characters
  const digitsOnly = cardNumber.replace(/\D/g, '');

  if (digitsOnly.length < 8) {
    return '****-****-****-****';
  }

  const first4 = digitsOnly.slice(0, 4);
  const last4 = digitsOnly.slice(-4);
  return `${first4}-****-****-${last4}`;
}

/**
 * Mask a birth date
 * Shows year, masks month and day
 *
 * @param birthDate - Birth date string to mask (YYYY-MM-DD format)
 * @returns Masked date (e.g., "1990-**-**")
 *
 * @example
 * maskBirthDate('1990-05-15') // "1990-**-**"
 * maskBirthDate('2000/12/25') // "2000-**-**"
 */
export function maskBirthDate(birthDate: string): string {
  if (!birthDate || typeof birthDate !== 'string') {
    return '';
  }

  // Handle Date objects passed as string
  const dateStr = birthDate.toString();

  // Match various date formats
  const isoMatch = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-**-**`;
  }

  // Try to extract year from common formats
  const yearMatch = dateStr.match(/\d{4}/);
  if (yearMatch) {
    return `${yearMatch[0]}-**-**`;
  }

  return '****-**-**';
}

/**
 * Mask an address
 * Shows first part (city/state), masks specific address details
 *
 * @param address - Address string to mask
 * @returns Masked address (e.g., "Seoul, ***")
 *
 * @example
 * maskAddress('123 Main St, Seoul, Korea') // "123 ***, Seoul, Korea"
 * maskAddress('서울시 강남구 역삼동 123-45') // "서울시 ***"
 */
export function maskAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    return '';
  }

  const trimmed = address.trim();

  // Korean address: show city/district, mask rest
  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(trimmed)) {
    // Split by spaces and show first 1-2 parts
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) {
      return `${parts[0]} ***`;
    }
    // Show city and district (first 2 parts)
    return `${parts[0]} ${parts[1]} ***`;
  }

  // Western address: mask street number and name, show city/state
  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    // Mask first part (street address), keep rest
    return `*** ${parts.slice(1).join(', ')}`;
  }

  // Single part: show first word, mask rest
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return `${words[0]} ***`;
  }

  return `${trimmed.slice(0, 3)}***`;
}

/**
 * Generic text masking
 * Shows configurable start and end characters
 *
 * @param text - Text to mask
 * @param options - Masking options
 * @returns Masked text
 *
 * @example
 * maskText('sensitive data') // "s************a"
 * maskText('hello', { showStart: 2, showEnd: 1 }) // "he**o"
 */
export function maskText(text: string, options?: MaskingOptions): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const { maskChar = '*', showStart = 1, showEnd = 1 } = options || {};

  if (text.length <= showStart + showEnd) {
    return maskChar.repeat(text.length);
  }

  const start = text.slice(0, showStart);
  const end = text.slice(-showEnd);
  const middleLength = text.length - showStart - showEnd;

  return `${start}${maskChar.repeat(middleLength)}${end}`;
}

/**
 * Recursively mask PII fields in an object
 * Traverses nested objects and arrays
 * Handles circular references safely
 *
 * @param obj - Object to mask
 * @param options - Masking options
 * @returns New object with masked values
 *
 * @example
 * const user = { email: 'user@example.com', name: 'John Doe' };
 * maskObject(user) // { email: 'u***@example.com', name: 'J*** D***' }
 *
 * // Handles circular references:
 * const circular: any = { name: 'Test' };
 * circular.self = circular;
 * maskObject(circular) // { name: 'T***', self: '[Circular Reference]' }
 */
export function maskObject<T extends Record<string, unknown>>(
  obj: T,
  options?: ObjectMaskingOptions,
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const {
    fieldsToMask = DEFAULT_PII_FIELDS,
    customMaskers = {},
    maskAllStrings = false,
    maxDepth = 10,
  } = options || {};

  // Use WeakSet to track visited objects for circular reference detection
  const visited = new WeakSet<object>();

  return maskObjectRecursive(
    obj,
    fieldsToMask,
    customMaskers,
    maskAllStrings,
    maxDepth,
    0,
    visited,
  ) as T;
}

/**
 * Circular reference placeholder
 */
const CIRCULAR_REF_PLACEHOLDER = '[Circular Reference]';

/**
 * Internal recursive object masking with circular reference detection
 */
function maskObjectRecursive(
  value: unknown,
  fieldsToMask: string[],
  customMaskers: Record<string, (value: unknown) => string>,
  maskAllStrings: boolean,
  maxDepth: number,
  currentDepth: number,
  visited: WeakSet<object>,
): unknown {
  // Prevent infinite recursion by depth
  if (currentDepth >= maxDepth) {
    if (typeof value === 'object' && value !== null) {
      return '[Max Depth Exceeded]';
    }
    return value;
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitive types
  if (typeof value !== 'object') {
    return value;
  }

  // Handle Date objects (before circular reference check)
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  // Handle Buffer, Map, Set, and other built-in objects
  if (
    value instanceof Map ||
    value instanceof Set ||
    value instanceof WeakMap ||
    value instanceof WeakSet
  ) {
    return '[Complex Object]';
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return '[Buffer]';
  }

  // Check for circular references
  if (visited.has(value)) {
    return CIRCULAR_REF_PLACEHOLDER;
  }

  // Mark as visited
  visited.add(value);

  try {
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) =>
        maskObjectRecursive(
          item,
          fieldsToMask,
          customMaskers,
          maskAllStrings,
          maxDepth,
          currentDepth + 1,
          visited,
        ),
      );
    }

    // Handle regular objects
    const result: Record<string, unknown> = {};

    // Get all enumerable own properties including symbols
    const keys = Object.keys(value as Record<string, unknown>);

    for (const key of keys) {
      const val = (value as Record<string, unknown>)[key];
      const lowerKey = key.toLowerCase();

      // Skip functions
      if (typeof val === 'function') {
        continue;
      }

      // Check for custom masker
      if (customMaskers[key]) {
        try {
          result[key] = customMaskers[key](val);
        } catch {
          result[key] = '[Masking Error]';
        }
        continue;
      }

      // Check if field should be masked
      const shouldMask = fieldsToMask.some((field) => field.toLowerCase() === lowerKey);

      if (shouldMask && typeof val === 'string') {
        result[key] = detectAndMask(key, val);
      } else if (typeof val === 'object' && val !== null) {
        result[key] = maskObjectRecursive(
          val,
          fieldsToMask,
          customMaskers,
          maskAllStrings,
          maxDepth,
          currentDepth + 1,
          visited,
        );
      } else if (maskAllStrings && typeof val === 'string') {
        result[key] = maskText(val);
      } else {
        result[key] = val;
      }
    }

    return result;
  } finally {
    // Note: We don't remove from visited to prevent issues with objects
    // referenced multiple times (which would be masked the same way anyway)
  }
}

/**
 * Detect PII type from field name and apply appropriate masking
 */
function detectAndMask(fieldName: string, value: string): string {
  const lowerField = fieldName.toLowerCase();

  // Email fields
  if (lowerField.includes('email') || lowerField.includes('mail')) {
    return maskEmail(value);
  }

  // Phone fields
  if (lowerField.includes('phone') || lowerField.includes('mobile') || lowerField.includes('tel')) {
    return maskPhone(value);
  }

  // Name fields
  if (
    lowerField.includes('name') ||
    lowerField === 'firstname' ||
    lowerField === 'lastname' ||
    lowerField === 'username'
  ) {
    return maskName(value);
  }

  // Birth date fields
  if (lowerField.includes('birth') || lowerField === 'dob' || lowerField.includes('dateofbirth')) {
    return maskBirthDate(value);
  }

  // Address fields
  if (lowerField.includes('address')) {
    return maskAddress(value);
  }

  // IP address fields
  if (lowerField === 'ip' || lowerField === 'ipaddress') {
    return maskIpAddress(value);
  }

  // Credit card fields
  if (
    lowerField.includes('card') ||
    lowerField === 'creditcard' ||
    lowerField.includes('cardnumber')
  ) {
    return maskCreditCard(value);
  }

  // Password and sensitive fields - fully mask
  if (
    lowerField.includes('password') ||
    lowerField.includes('secret') ||
    lowerField.includes('token') ||
    lowerField.includes('ssn')
  ) {
    return '********';
  }

  // Default: generic text masking
  return maskText(value);
}

/**
 * User log data interface
 */
export interface UserLogData {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Create masked user log data for audit/logging purposes
 *
 * @param userData - Raw user data
 * @returns Masked user data safe for logging
 *
 * @example
 * const log = createMaskedUserLog({
 *   id: '01935c6d-c2d0-7abc-8def-1234567890ab',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   phone: '+821012345678',
 *   ipAddress: '192.168.1.100'
 * });
 * // Returns:
 * // {
 * //   id: '0193****890a',
 * //   email: 'u***@example.com',
 * //   name: 'J*** D***',
 * //   phone: '+820***5678',
 * //   ipAddress: '192.168.x.x'
 * // }
 */
export function createMaskedUserLog(userData: UserLogData): UserLogData {
  const result: UserLogData = {};

  if (userData.id) {
    result.id = maskUuid(userData.id);
  }

  if (userData.email) {
    result.email = maskEmail(userData.email);
  }

  if (userData.name) {
    result.name = maskName(userData.name);
  }

  if (userData.phone) {
    result.phone = maskPhone(userData.phone);
  }

  if (userData.ipAddress) {
    result.ipAddress = maskIpAddress(userData.ipAddress);
  }

  if (userData.userAgent) {
    // User agent is generally not PII, but truncate if too long
    result.userAgent =
      userData.userAgent.length > 100
        ? `${userData.userAgent.slice(0, 100)}...`
        : userData.userAgent;
  }

  // Copy other fields through maskObject
  const otherFields = { ...userData };
  delete otherFields.id;
  delete otherFields.email;
  delete otherFields.name;
  delete otherFields.phone;
  delete otherFields.ipAddress;
  delete otherFields.userAgent;

  const maskedOthers = maskObject(otherFields as Record<string, unknown>);
  return { ...result, ...maskedOthers };
}
