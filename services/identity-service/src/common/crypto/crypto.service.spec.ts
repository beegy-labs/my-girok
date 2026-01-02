import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ENCRYPTION_KEY;
    delete process.env.NODE_ENV;

    service = new CryptoService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use development key when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      process.env.NODE_ENV = 'development';

      const testService = new CryptoService();
      expect(testService).toBeDefined();
    });

    it('should throw error in production without ENCRYPTION_KEY', () => {
      delete process.env.ENCRYPTION_KEY;
      process.env.NODE_ENV = 'production';

      expect(() => new CryptoService()).toThrow('ENCRYPTION_KEY is required in production');
    });

    it('should use provided ENCRYPTION_KEY when set', () => {
      // 32 bytes = 44 chars base64 (approx)
      process.env.ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012').toString(
        'base64',
      );
      const testService = new CryptoService();
      expect(testService).toBeDefined();
    });

    it('should throw error when ENCRYPTION_KEY has wrong length', () => {
      process.env.ENCRYPTION_KEY = Buffer.from('too-short').toString('base64');

      expect(() => new CryptoService()).toThrow('ENCRYPTION_KEY must be 32 bytes');
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Same message';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same plaintext
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '안녕하세요! 🎉';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => service.decrypt('invalid-ciphertext')).toThrow('Invalid ciphertext format');
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'tampered' + parts[2]; // Tamper with encrypted data

      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });
  });

  describe('hash', () => {
    it('should hash data with SHA-256', () => {
      const data = 'test data';
      const hash = service.hash(data);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce consistent hash for same input', () => {
      const data = 'consistent data';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = service.hash('data1');
      const hash2 = service.hash('data2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default 32 bytes', () => {
      const token = service.generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // Base64url encoded 32 bytes is about 43 chars
      expect(token.length).toBeGreaterThan(40);
    });

    it('should generate token with custom byte length', () => {
      const token16 = service.generateToken(16);
      const token64 = service.generateToken(64);

      // Larger byte count should produce longer token
      expect(token64.length).toBeGreaterThan(token16.length);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('generateTotpSecret', () => {
    it('should generate a base32 encoded TOTP secret', () => {
      const secret = service.generateTotpSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      // Base32 uses only A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate unique secrets', () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 100; i++) {
        secrets.add(service.generateTotpSecret());
      }
      expect(secrets.size).toBe(100);
    });

    it('should generate secret with correct length for TOTP', () => {
      const secret = service.generateTotpSecret();
      // 20 bytes in base32 = 32 chars (with padding)
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });
  });
});
