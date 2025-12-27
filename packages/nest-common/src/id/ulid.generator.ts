import { ulid, decodeTime } from 'ulid';

/**
 * ULID Generator utility for consistent ID generation across services
 *
 * Features:
 * - Lexicographically sortable (time-based)
 * - 1.21e+24 unique IDs per millisecond
 * - Case insensitive
 * - ClickHouse-friendly compression
 */
export const ID = {
  /**
   * Generate a new ULID
   * @returns 26-character ULID string
   */
  generate: (): string => ulid(),

  /**
   * Extract timestamp from ULID
   * @param id - ULID string
   * @returns Date object
   */
  getTimestamp: (id: string): Date => new Date(decodeTime(id)),

  /**
   * Validate ULID format
   * @param id - String to validate
   * @returns boolean
   */
  isValid: (id: string): boolean => {
    if (!id || id.length !== 26) return false;
    return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(id);
  },

  /**
   * Compare two ULIDs (for sorting)
   * @returns -1, 0, or 1
   */
  compare: (a: string, b: string): number => a.localeCompare(b),

  /**
   * Generate ULID from specific timestamp (for testing)
   * @param time - Date or timestamp
   * @returns ULID string
   */
  fromTime: (time: Date | number): string => {
    const ts = typeof time === 'number' ? time : time.getTime();
    return ulid(ts);
  },

  /**
   * Get timestamp as ISO string from ULID
   * @param id - ULID string
   * @returns ISO date string
   */
  getTimestampISO: (id: string): string => {
    return new Date(decodeTime(id)).toISOString();
  },
};
