import { describe, it, expect } from 'vitest';
import {
  formatAuditTimestamp,
  calculateAuditRetentionDate,
  generateAuditChecksum,
} from '../audit.utils';

describe('Audit Utils', () => {
  describe('formatAuditTimestamp', () => {
    it('should format ISO timestamp to ClickHouse format', () => {
      const date = new Date('2026-01-19T12:34:56.789Z');
      const result = formatAuditTimestamp(date);

      expect(result).toBe('2026-01-19 12:34:56.789');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const result = formatAuditTimestamp(date);

      expect(result).toBe('2026-01-01 00:00:00.000');
    });

    it('should preserve milliseconds', () => {
      const date = new Date('2026-06-15T15:30:45.123Z');
      const result = formatAuditTimestamp(date);

      expect(result).toContain('.123');
    });
  });

  describe('calculateAuditRetentionDate', () => {
    it('should calculate retention date correctly for 7 years', () => {
      const timestamp = new Date('2026-01-19T00:00:00.000Z');
      const result = calculateAuditRetentionDate(timestamp, 7);

      expect(result).toBe('2033-01-19');
    });

    it('should handle leap years correctly', () => {
      const timestamp = new Date('2024-02-29T00:00:00.000Z');
      const result = calculateAuditRetentionDate(timestamp, 4);

      expect(result).toBe('2028-02-29');
    });

    it('should return ISO date format', () => {
      const timestamp = new Date('2026-06-15T12:34:56.789Z');
      const result = calculateAuditRetentionDate(timestamp, 5);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe('2031-06-15');
    });

    it('should handle different retention periods', () => {
      const timestamp = new Date('2026-01-01T00:00:00.000Z');

      expect(calculateAuditRetentionDate(timestamp, 1)).toBe('2027-01-01');
      expect(calculateAuditRetentionDate(timestamp, 3)).toBe('2029-01-01');
      expect(calculateAuditRetentionDate(timestamp, 10)).toBe('2036-01-01');
    });
  });

  describe('generateAuditChecksum', () => {
    it('should generate SHA-256 checksum', () => {
      const data = { eventId: 'evt_123', payload: { test: 'data' } };
      const result = generateAuditChecksum(data);

      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate consistent checksum for same data', () => {
      const data = { eventId: 'evt_123', payload: { test: 'data' } };

      const checksum1 = generateAuditChecksum(data);
      const checksum2 = generateAuditChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different data', () => {
      const data1 = { eventId: 'evt_123' };
      const data2 = { eventId: 'evt_456' };

      const checksum1 = generateAuditChecksum(data1);
      const checksum2 = generateAuditChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle complex nested objects', () => {
      const data = {
        eventId: 'evt_123',
        nested: {
          deeply: {
            nested: {
              value: 'test',
              array: [1, 2, 3],
            },
          },
        },
      };

      const result = generateAuditChecksum(data);

      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be sensitive to property order', () => {
      const data1 = { a: 1, b: 2 };
      const data2 = { b: 2, a: 1 };

      const checksum1 = generateAuditChecksum(data1);
      const checksum2 = generateAuditChecksum(data2);

      // JSON.stringify preserves insertion order
      expect(checksum1).not.toBe(checksum2);
    });
  });
});
