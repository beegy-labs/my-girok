import {
  generateIds,
  sortByUUID,
  filterByTimeRange,
  getCreatedAt,
  isUUID,
  isUUIDv7,
  parseUUIDv7,
} from '../uuidv7.utils';
import { UUIDv7 } from '../uuidv7.generator';

describe('UUIDv7 Utils', () => {
  describe('generateIds', () => {
    it('should generate specified number of IDs', () => {
      const ids = generateIds(5);
      expect(ids).toHaveLength(5);
    });

    it('should generate all unique IDs', () => {
      const ids = generateIds(100);
      const unique = new Set(ids);
      expect(unique.size).toBe(100);
    });

    it('should generate valid UUIDv7s', () => {
      const ids = generateIds(10);
      ids.forEach((id) => {
        expect(UUIDv7.isValid(id)).toBe(true);
      });
    });
  });

  describe('sortByUUID', () => {
    it('should sort objects by UUID field ascending', () => {
      const items = [
        { id: UUIDv7.fromTime(new Date('2025-01-03')), name: 'third' },
        { id: UUIDv7.fromTime(new Date('2025-01-01')), name: 'first' },
        { id: UUIDv7.fromTime(new Date('2025-01-02')), name: 'second' },
      ];

      const sorted = sortByUUID(items, 'id', 'asc');

      expect(sorted[0].name).toBe('first');
      expect(sorted[1].name).toBe('second');
      expect(sorted[2].name).toBe('third');
    });

    it('should sort objects by UUID field descending', () => {
      const items = [
        { id: UUIDv7.fromTime(new Date('2025-01-03')), name: 'third' },
        { id: UUIDv7.fromTime(new Date('2025-01-01')), name: 'first' },
        { id: UUIDv7.fromTime(new Date('2025-01-02')), name: 'second' },
      ];

      const sorted = sortByUUID(items, 'id', 'desc');

      expect(sorted[0].name).toBe('third');
      expect(sorted[1].name).toBe('second');
      expect(sorted[2].name).toBe('first');
    });

    it('should not mutate original array', () => {
      const items = [
        { id: UUIDv7.fromTime(new Date('2025-01-02')), name: 'second' },
        { id: UUIDv7.fromTime(new Date('2025-01-01')), name: 'first' },
      ];
      const originalOrder = [...items];

      sortByUUID(items, 'id', 'asc');

      expect(items[0].name).toBe(originalOrder[0].name);
    });
  });

  describe('filterByTimeRange', () => {
    it('should filter items within time range', () => {
      const items = [
        { id: UUIDv7.fromTime(new Date('2025-01-01')), name: 'jan1' },
        { id: UUIDv7.fromTime(new Date('2025-01-15')), name: 'jan15' },
        { id: UUIDv7.fromTime(new Date('2025-02-01')), name: 'feb1' },
        { id: UUIDv7.fromTime(new Date('2025-02-15')), name: 'feb15' },
      ];

      const filtered = filterByTimeRange(
        items,
        'id',
        new Date('2025-01-10'),
        new Date('2025-02-05'),
      );

      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('jan15');
      expect(filtered[1].name).toBe('feb1');
    });

    it('should return empty array when no items in range', () => {
      const items = [{ id: UUIDv7.fromTime(new Date('2025-01-01')), name: 'jan1' }];

      const filtered = filterByTimeRange(
        items,
        'id',
        new Date('2025-06-01'),
        new Date('2025-06-30'),
      );

      expect(filtered).toHaveLength(0);
    });

    it('should handle invalid UUIDs gracefully', () => {
      const items = [
        { id: 'not-a-valid-uuid', name: 'invalid' },
        { id: UUIDv7.fromTime(new Date('2025-01-15')), name: 'valid' },
      ];

      const filtered = filterByTimeRange(
        items,
        'id',
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('valid');
    });
  });

  describe('getCreatedAt', () => {
    it('should extract creation time from entity', () => {
      const now = new Date();
      const entity = { id: UUIDv7.fromTime(now), name: 'test' };

      const createdAt = getCreatedAt(entity);

      expect(createdAt?.getTime()).toBe(now.getTime());
    });

    it('should return null for invalid UUID', () => {
      const entity = { id: 'not-a-uuid', name: 'test' };

      const createdAt = getCreatedAt(entity);

      expect(createdAt).toBeNull();
    });
  });

  describe('isUUID', () => {
    it('should return true for valid UUID', () => {
      expect(isUUID(UUIDv7.generate())).toBe(true);
      expect(isUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('')).toBe(false);
    });
  });

  describe('isUUIDv7', () => {
    it('should return true for UUIDv7', () => {
      expect(isUUIDv7(UUIDv7.generate())).toBe(true);
    });

    it('should return false for other UUID versions', () => {
      expect(isUUIDv7('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
    });
  });

  describe('parseUUIDv7', () => {
    it('should parse UUIDv7 components', () => {
      const specificTime = new Date('2025-01-15T10:30:00.000Z');
      const uuid = UUIDv7.fromTime(specificTime);

      const parsed = parseUUIDv7(uuid);

      expect(parsed.isValid).toBe(true);
      expect(parsed.version).toBe(7);
      expect(parsed.variant).toBe('RFC 4122/9562');
      expect(parsed.timestamp.getTime()).toBe(specificTime.getTime());
    });

    it('should return invalid for malformed UUID', () => {
      const parsed = parseUUIDv7('not-a-uuid');

      expect(parsed.isValid).toBe(false);
      expect(parsed.version).toBe(0);
    });
  });
});
