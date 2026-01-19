import * as crypto from 'crypto';

/**
 * Base62 character set (URL-safe: 0-9, A-Z, a-z)
 * Ordered for lexicographic sorting: numbers first, then uppercase, then lowercase
 * This ensures string sorting matches numeric sorting
 */
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Epoch timestamp (2025-01-01 00:00:00 UTC)
 * Used as reference point for time-based ID generation
 */
const EPOCH_MS = new Date('2025-01-01T00:00:00Z').getTime();

/**
 * Maximum retry attempts for collision avoidance
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Encode a number to Base62 string
 * @param num - Number to encode
 * @returns Base62 encoded string
 */
export function base62Encode(num: number): string {
  if (num === 0) return BASE62_CHARS[0];

  let result = '';
  let n = num;

  while (n > 0) {
    result = BASE62_CHARS[n % 62] + result;
    n = Math.floor(n / 62);
  }

  return result;
}

/**
 * Decode a Base62 string to number
 * @param str - Base62 string to decode
 * @returns Decoded number
 */
export function base62Decode(str: string): number {
  let result = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62_CHARS.indexOf(char);

    if (value === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }

    result = result * 62 + value;
  }

  return result;
}

/**
 * Generate a random Base62 string
 * @param length - Length of the random string
 * @returns Random Base62 string
 */
export function generateRandomBase62(length: number): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((byte) => BASE62_CHARS[byte % 62])
    .join('');
}

/**
 * Generate a time-based external ID with random suffix
 * Format: [8-char timestamp] + [2-char random] = 10 characters
 *
 * @returns 10-character external ID (e.g., "k7Bx9mPq2A")
 *
 * Structure:
 * - First 8 characters: Base62-encoded milliseconds since epoch (2025-01-01 UTC)
 * - Last 2 characters: Random Base62 characters for collision avoidance
 *
 * Features:
 * - Sortable by creation time (chronological order)
 * - URL-safe (no special characters)
 * - Collision-resistant (3,844 combinations per millisecond)
 * - Compact (10 characters)
 * - Supports 100+ years and 10 billion users
 * - **All timestamps are in UTC** (consistent with database timezone)
 *
 * @remarks
 * Date.now() returns UTC milliseconds since Unix epoch.
 * This is timezone-independent and safe for distributed systems.
 */
export function generateExternalId(): string {
  // Calculate milliseconds since epoch (UTC)
  // Date.now() always returns UTC milliseconds, regardless of server timezone
  const now = Date.now();
  const timeSinceEpoch = now - EPOCH_MS;

  // Encode time part as 8-character Base62 string
  // Pad with '0' (Base62 value 0) for lexicographic sorting
  const timePart = base62Encode(timeSinceEpoch).padStart(8, '0');

  // Generate 2-character random suffix for collision avoidance
  const randomPart = generateRandomBase62(2);

  return timePart + randomPart;
}

/**
 * Generate external ID with collision checking
 * Retries up to MAX_RETRY_ATTEMPTS times if collision is detected
 *
 * @param checkUniqueness - Async function to check if ID already exists
 * @returns Unique external ID
 * @throws Error if unable to generate unique ID after MAX_RETRY_ATTEMPTS
 */
export async function generateUniqueExternalId(
  checkUniqueness: (id: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const externalId = generateExternalId();

    // Check if ID already exists
    const isUnique = await checkUniqueness(externalId);

    if (isUnique) {
      return externalId;
    }

    // Log collision (rare event, worth monitoring)
    console.warn(
      `External ID collision detected: ${externalId} (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`,
    );
  }

  // This should be extremely rare (probability: 1 in 3,844 per millisecond)
  throw new Error(
    `Failed to generate unique external ID after ${MAX_RETRY_ATTEMPTS} attempts. This indicates a serious system issue.`,
  );
}

/**
 * Extract timestamp from external ID
 * @param externalId - External ID to parse
 * @returns Date object representing creation time (UTC)
 *
 * @remarks
 * The returned Date object represents a UTC timestamp.
 * When displaying to users, convert to their local timezone.
 */
export function extractTimestampFromExternalId(externalId: string): Date {
  if (externalId.length !== 10) {
    throw new Error('Invalid external ID format');
  }

  // Extract time part (first 8 characters)
  const timePart = externalId.substring(0, 8);

  // Decode Base62 to milliseconds since epoch
  const timeSinceEpoch = base62Decode(timePart);

  // Convert to absolute timestamp (UTC)
  return new Date(EPOCH_MS + timeSinceEpoch);
}

/**
 * Validate external ID format
 * @param externalId - ID to validate
 * @returns true if valid format
 */
export function isValidExternalId(externalId: string): boolean {
  if (typeof externalId !== 'string') return false;
  if (externalId.length !== 10) return false;

  // Check if all characters are in Base62 charset
  return externalId.split('').every((char) => BASE62_CHARS.includes(char));
}
