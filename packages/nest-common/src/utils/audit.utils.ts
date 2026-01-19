import * as crypto from 'crypto';

/**
 * Audit utility functions for consistent audit log formatting across services
 */

/**
 * Format timestamp for ClickHouse insertion
 * Converts ISO timestamp to ClickHouse-compatible format: YYYY-MM-DD HH:mm:ss.SSS
 *
 * @param date - Date to format
 * @returns Formatted timestamp string
 *
 * @example
 * formatAuditTimestamp(new Date('2026-01-19T12:34:56.789Z'))
 * // Returns: '2026-01-19 12:34:56.789'
 */
export function formatAuditTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

/**
 * Calculate retention date based on years from timestamp
 * Used for TTL compliance in audit logs
 *
 * @param timestamp - Base timestamp
 * @param years - Number of years to retain
 * @returns ISO date string (YYYY-MM-DD)
 *
 * @example
 * calculateAuditRetentionDate(new Date('2026-01-19'), 7)
 * // Returns: '2033-01-19'
 */
export function calculateAuditRetentionDate(timestamp: Date, years: number): string {
  const retentionDate = new Date(timestamp);
  retentionDate.setFullYear(retentionDate.getFullYear() + years);
  return retentionDate.toISOString().split('T')[0];
}

/**
 * Generate SHA-256 checksum for audit log integrity verification
 * Creates a cryptographic hash of the event data for tamper detection
 *
 * @param data - Data to hash (will be JSON stringified)
 * @returns SHA-256 hash as hex string (64 characters)
 *
 * @example
 * generateAuditChecksum({ eventId: 'evt_123', payload: {...} })
 * // Returns: 'a1b2c3d4...' (64 character hex string)
 */
export function generateAuditChecksum(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
