import { UUIDv7, ID } from '../uuidv7.generator';

describe('UUIDv7', () => {
  describe('generate', () => {
    it('should generate valid UUIDv7 format', () => {
      const uuid = UUIDv7.generate();

      // Check format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        uuids.add(UUIDv7.generate());
      }

      expect(uuids.size).toBe(count);
    });

    it('should be time-sortable (lexicographically)', () => {
      const first = UUIDv7.generate();

      // Wait a bit to ensure different timestamp
      const waitUntil = Date.now() + 2;
      while (Date.now() < waitUntil) {
        // spin
      }

      const second = UUIDv7.generate();

      expect(first < second).toBe(true);
    });

    it('should maintain monotonic order within same millisecond', () => {
      const uuids: string[] = [];
      const startTime = Date.now();

      // Generate many UUIDs quickly to hit same millisecond
      for (let i = 0; i < 100; i++) {
        uuids.push(UUIDv7.generate());
      }

      // All should still be in ascending order
      for (let i = 1; i < uuids.length; i++) {
        expect(uuids[i - 1] < uuids[i]).toBe(true);
      }
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from UUIDv7', () => {
      const before = Date.now();
      const uuid = UUIDv7.generate();
      const after = Date.now();

      const extracted = UUIDv7.extractTimestamp(uuid);

      expect(extracted.getTime()).toBeGreaterThanOrEqual(before);
      expect(extracted.getTime()).toBeLessThanOrEqual(after);
    });

    it('should extract correct timestamp from known UUID', () => {
      // Generate with specific time
      const knownTime = new Date('2025-01-01T00:00:00.000Z');
      const uuid = UUIDv7.fromTime(knownTime);

      const extracted = UUIDv7.extractTimestamp(uuid);

      expect(extracted.getTime()).toBe(knownTime.getTime());
    });
  });

  describe('isValid', () => {
    it('should return true for valid UUIDv7', () => {
      const uuid = UUIDv7.generate();
      expect(UUIDv7.isValid(uuid)).toBe(true);
    });

    it('should return false for UUIDv4', () => {
      // UUIDv4 has version 4, not 7
      const uuidv4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(UUIDv7.isValid(uuidv4)).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(UUIDv7.isValid('not-a-uuid')).toBe(false);
      expect(UUIDv7.isValid('')).toBe(false);
      expect(UUIDv7.isValid('12345')).toBe(false);
    });

    it('should return false for wrong variant', () => {
      // Wrong variant (should be 8, 9, a, or b)
      const wrongVariant = '01935c6d-c2d0-7abc-0def-1234567890ab';
      expect(UUIDv7.isValid(wrongVariant)).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for any valid UUID version', () => {
      // UUIDv1
      expect(UUIDv7.isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      // UUIDv4
      expect(UUIDv7.isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
      // UUIDv7
      expect(UUIDv7.isValidUUID(UUIDv7.generate())).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(UUIDv7.isValidUUID('not-a-uuid')).toBe(false);
      expect(UUIDv7.isValidUUID('')).toBe(false);
    });
  });

  describe('compare', () => {
    it('should return -1 when first is earlier', () => {
      const first = UUIDv7.generate();
      // Ensure different timestamp
      const waitUntil = Date.now() + 2;
      while (Date.now() < waitUntil) {}
      const second = UUIDv7.generate();

      expect(UUIDv7.compare(first, second)).toBe(-1);
    });

    it('should return 1 when first is later', () => {
      const first = UUIDv7.generate();
      const waitUntil = Date.now() + 2;
      while (Date.now() < waitUntil) {}
      const second = UUIDv7.generate();

      expect(UUIDv7.compare(second, first)).toBe(1);
    });

    it('should return 0 when same', () => {
      const uuid = UUIDv7.generate();
      expect(UUIDv7.compare(uuid, uuid)).toBe(0);
    });
  });

  describe('fromTime', () => {
    it('should generate UUID with specific timestamp', () => {
      const specificTime = new Date('2024-06-15T12:30:45.123Z');
      const uuid = UUIDv7.fromTime(specificTime);

      expect(UUIDv7.isValid(uuid)).toBe(true);
      expect(UUIDv7.extractTimestamp(uuid).getTime()).toBe(specificTime.getTime());
    });

    it('should accept timestamp number', () => {
      const timestamp = 1718451045123;
      const uuid = UUIDv7.fromTime(timestamp);

      expect(UUIDv7.isValid(uuid)).toBe(true);
      expect(UUIDv7.extractTimestamp(uuid).getTime()).toBe(timestamp);
    });
  });

  describe('getTimestampISO', () => {
    it('should return ISO string', () => {
      const uuid = UUIDv7.generate();
      const iso = UUIDv7.getTimestampISO(uuid);

      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

describe('ID (alias)', () => {
  it('should have all expected methods', () => {
    expect(typeof ID.generate).toBe('function');
    expect(typeof ID.getTimestamp).toBe('function');
    expect(typeof ID.isValid).toBe('function');
    expect(typeof ID.compare).toBe('function');
    expect(typeof ID.fromTime).toBe('function');
    expect(typeof ID.getTimestampISO).toBe('function');
  });

  it('should generate valid UUIDv7', () => {
    const id = ID.generate();
    expect(UUIDv7.isValid(id)).toBe(true);
  });
});
