import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Production Secret Validation', () => {
    it('should not throw in development environment with default values', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.SESSION_SECRET;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.VALKEY_PASSWORD;

      await expect(import('../../src/config/configuration')).resolves.toBeDefined();
    });

    it('should throw in production with missing SESSION_SECRET', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      vi.resetModules();
      await expect(import('../../src/config/configuration')).rejects.toThrow(
        'SESSION_SECRET must be set to a secure value in production',
      );
    });

    it('should throw in production with default SESSION_SECRET', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'session-secret-change-in-production';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      vi.resetModules();
      await expect(import('../../src/config/configuration')).rejects.toThrow(
        'SESSION_SECRET must be set to a secure value in production',
      );
    });

    it('should throw in production with short SESSION_SECRET', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'short';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      vi.resetModules();
      await expect(import('../../src/config/configuration')).rejects.toThrow(
        'SESSION_SECRET must be at least 32 characters long',
      );
    });

    it('should throw in production with missing ENCRYPTION_KEY', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      delete process.env.ENCRYPTION_KEY;
      process.env.VALKEY_PASSWORD = 'secure-password';

      vi.resetModules();
      await expect(import('../../src/config/configuration')).rejects.toThrow(
        'ENCRYPTION_KEY must be set to a secure value in production',
      );
    });

    it('should throw in production with default ENCRYPTION_KEY', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      process.env.ENCRYPTION_KEY = 'encryption-key-32-chars-change!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      vi.resetModules();
      await expect(import('../../src/config/configuration')).rejects.toThrow(
        'ENCRYPTION_KEY must be set to a secure value in production',
      );
    });

    it('should throw in production with missing VALKEY_PASSWORD', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      delete process.env.VALKEY_PASSWORD;

      vi.resetModules();
      await expect(import('../../src/config/configuration')).rejects.toThrow(
        'VALKEY_PASSWORD must be set in production',
      );
    });

    it('should not throw in production with all valid secrets', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      vi.resetModules();
      await expect(import('../../src/config/configuration')).resolves.toBeDefined();
    });

    it('should include all errors in the error message', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.VALKEY_PASSWORD;

      vi.resetModules();
      try {
        await import('../../src/config/configuration');
        expect.fail('Should have thrown an error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('SESSION_SECRET');
        expect(message).toContain('ENCRYPTION_KEY');
        expect(message).toContain('VALKEY_PASSWORD');
        expect(message).toContain('CRITICAL SECURITY ERROR');
      }
    });
  });
});
