import {
  encrypt,
  decrypt,
  generateSessionId,
  hashDeviceFingerprint,
} from '../../src/common/utils/crypto.utils';

describe('CryptoUtils', () => {
  const testKey = 'test-encryption-key-32-chars!!';

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'Hello, World!';
      const encrypted = encrypt(originalText, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const text = 'Same text';
      const encrypted1 = encrypt(text, testKey);
      const encrypted2 = encrypt(text, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('', testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe('');
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(10000);
      const encrypted = encrypt(longText, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(longText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '안녕하세요 🎉 Hello';
      const encrypted = encrypt(unicodeText, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(unicodeText);
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => decrypt('invalid', testKey)).toThrow('Invalid encrypted text format');
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encrypt('test', testKey);
      const parts = encrypted.split(':');
      parts[2] = 'tampered';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should throw error for wrong key', () => {
      const encrypted = encrypt('test', testKey);
      const wrongKey = 'wrong-key-32-chars-for-testing!!';

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });
  });

  describe('generateSessionId', () => {
    it('should generate a 64-character hex string', () => {
      const sessionId = generateSessionId();

      expect(sessionId).toHaveLength(64);
      expect(sessionId).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));

      expect(ids.size).toBe(100);
    });
  });

  describe('hashDeviceFingerprint', () => {
    it('should produce consistent hash for same components', () => {
      const components = ['Mozilla/5.0', 'en-US', 'gzip'];
      const hash1 = hashDeviceFingerprint(components);
      const hash2 = hashDeviceFingerprint(components);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different components', () => {
      const hash1 = hashDeviceFingerprint(['component1']);
      const hash2 = hashDeviceFingerprint(['component2']);

      expect(hash1).not.toBe(hash2);
    });

    it('should return a 32-character string', () => {
      const hash = hashDeviceFingerprint(['test']);

      expect(hash).toHaveLength(32);
    });

    it('should handle empty components', () => {
      const hash = hashDeviceFingerprint([]);

      expect(hash).toHaveLength(32);
    });
  });
});
