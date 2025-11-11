import {
  base62Encode,
  base62Decode,
  generateRandomBase62,
  generateExternalId,
  generateUniqueExternalId,
  extractTimestampFromExternalId,
  isValidExternalId,
} from './id-generator';

describe('ID Generator', () => {
  describe('base62Encode', () => {
    it('should encode 0', () => {
      expect(base62Encode(0)).toBe('A');
    });

    it('should encode small numbers', () => {
      expect(base62Encode(61)).toBe('9');
      expect(base62Encode(62)).toBe('BA');
    });

    it('should encode large numbers', () => {
      const largeNum = 3155760000000; // ~100 years in ms
      const encoded = base62Encode(largeNum);
      expect(encoded.length).toBeLessThanOrEqual(8);
    });

    it('should be reversible', () => {
      const numbers = [0, 1, 61, 62, 123, 1000, 999999, 10000000];
      numbers.forEach(num => {
        const encoded = base62Encode(num);
        const decoded = base62Decode(encoded);
        expect(decoded).toBe(num);
      });
    });
  });

  describe('base62Decode', () => {
    it('should decode single character', () => {
      expect(base62Decode('A')).toBe(0);
      expect(base62Decode('B')).toBe(1);
      expect(base62Decode('9')).toBe(61);
    });

    it('should decode multi-character strings', () => {
      expect(base62Decode('BA')).toBe(62);
      expect(base62Decode('CA')).toBe(124);
    });

    it('should throw on invalid characters', () => {
      expect(() => base62Decode('!')).toThrow('Invalid Base62 character');
      expect(() => base62Decode('@')).toThrow('Invalid Base62 character');
    });
  });

  describe('generateRandomBase62', () => {
    it('should generate string of correct length', () => {
      expect(generateRandomBase62(1).length).toBe(1);
      expect(generateRandomBase62(2).length).toBe(2);
      expect(generateRandomBase62(10).length).toBe(10);
    });

    it('should only contain Base62 characters', () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const random = generateRandomBase62(100);

      for (const char of random) {
        expect(chars.includes(char)).toBe(true);
      }
    });

    it('should generate different values', () => {
      const id1 = generateRandomBase62(10);
      const id2 = generateRandomBase62(10);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateExternalId', () => {
    it('should generate 10-character ID', () => {
      const id = generateExternalId();
      expect(id.length).toBe(10);
    });

    it('should be URL-safe (Base62)', () => {
      const id = generateExternalId();
      expect(isValidExternalId(id)).toBe(true);
    });

    it('should generate different IDs', () => {
      const id1 = generateExternalId();
      const id2 = generateExternalId();
      expect(id1).not.toBe(id2);
    });

    it('should be sortable by time', async () => {
      const id1 = generateExternalId();

      // Wait 10ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const id2 = generateExternalId();

      // Time parts should be sortable
      expect(id1.substring(0, 8) < id2.substring(0, 8)).toBe(true);
    });
  });

  describe('generateUniqueExternalId', () => {
    it('should return ID if unique', async () => {
      const checkUniqueness = jest.fn().mockResolvedValue(true);

      const id = await generateUniqueExternalId(checkUniqueness);

      expect(id.length).toBe(10);
      expect(checkUniqueness).toHaveBeenCalledWith(id);
      expect(checkUniqueness).toHaveBeenCalledTimes(1);
    });

    it('should retry on collision', async () => {
      let attempt = 0;
      const checkUniqueness = jest.fn().mockImplementation(async () => {
        attempt++;
        return attempt > 1; // First attempt fails, second succeeds
      });

      const id = await generateUniqueExternalId(checkUniqueness);

      expect(id.length).toBe(10);
      expect(checkUniqueness).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const checkUniqueness = jest.fn().mockResolvedValue(false); // Always collision

      await expect(generateUniqueExternalId(checkUniqueness)).rejects.toThrow(
        'Failed to generate unique external ID after 3 attempts'
      );

      expect(checkUniqueness).toHaveBeenCalledTimes(3);
    });
  });

  describe('extractTimestampFromExternalId', () => {
    it('should extract timestamp from ID', () => {
      const id = generateExternalId();

      const extractedDate = extractTimestampFromExternalId(id);
      const extractedTime = extractedDate.getTime();

      // Should be within reasonable range (allowing for execution time)
      // Since we're testing with current time and the epoch is 2025-01-01,
      // the extracted time should be close to now
      const timeDiff = Math.abs(extractedTime - Date.now());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should throw on invalid format', () => {
      expect(() => extractTimestampFromExternalId('short')).toThrow('Invalid external ID format');
      expect(() => extractTimestampFromExternalId('toolongid123')).toThrow('Invalid external ID format');
    });
  });

  describe('isValidExternalId', () => {
    it('should validate correct format', () => {
      const id = generateExternalId();
      expect(isValidExternalId(id)).toBe(true);
    });

    it('should reject wrong length', () => {
      expect(isValidExternalId('short')).toBe(false);
      expect(isValidExternalId('toolongid123')).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(isValidExternalId('ABC123!@#$')).toBe(false);
      expect(isValidExternalId('abc123-xyz')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(isValidExternalId(null as any)).toBe(false);
      expect(isValidExternalId(undefined as any)).toBe(false);
      expect(isValidExternalId(123 as any)).toBe(false);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should generate unique IDs with collision handling', async () => {
      const generatedIds = new Set<string>();
      let collisionCount = 0;

      const checkUniqueness = async (id: string) => {
        if (generatedIds.has(id)) {
          collisionCount++;
          return false;
        }
        return true;
      };

      // Generate 1000 IDs
      for (let i = 0; i < 1000; i++) {
        const id = await generateUniqueExternalId(checkUniqueness);
        generatedIds.add(id);
      }

      expect(generatedIds.size).toBe(1000);
      // Collisions are possible but should be rare (< 1% with 2-char random suffix)
      expect(collisionCount).toBeLessThan(50);
    });

    it('should maintain time ordering', async () => {
      const ids: string[] = [];

      for (let i = 0; i < 10; i++) {
        const id = generateExternalId();
        ids.push(id);
        await new Promise(resolve => setTimeout(resolve, 5)); // Wait 5ms
      }

      // Sort IDs and check if order matches generation order
      const sortedIds = [...ids].sort();
      expect(sortedIds).toEqual(ids);
    });
  });
});
