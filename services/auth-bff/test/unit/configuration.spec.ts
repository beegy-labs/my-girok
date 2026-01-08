describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Production Secret Validation', () => {
    it('should not throw in development environment with default values', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.SESSION_SECRET;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.VALKEY_PASSWORD;

      expect(() => {
        require('../../src/config/configuration');
      }).not.toThrow();
    });

    it('should throw in production with missing SESSION_SECRET', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).toThrow('SESSION_SECRET must be set to a secure value in production');
    });

    it('should throw in production with default SESSION_SECRET', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'session-secret-change-in-production';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).toThrow('SESSION_SECRET must be set to a secure value in production');
    });

    it('should throw in production with short SESSION_SECRET', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'short';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).toThrow('SESSION_SECRET must be at least 32 characters long');
    });

    it('should throw in production with missing ENCRYPTION_KEY', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      delete process.env.ENCRYPTION_KEY;
      process.env.VALKEY_PASSWORD = 'secure-password';

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).toThrow('ENCRYPTION_KEY must be set to a secure value in production');
    });

    it('should throw in production with default ENCRYPTION_KEY', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      process.env.ENCRYPTION_KEY = 'encryption-key-32-chars-change!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).toThrow('ENCRYPTION_KEY must be set to a secure value in production');
    });

    it('should throw in production with missing VALKEY_PASSWORD', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      delete process.env.VALKEY_PASSWORD;

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).toThrow('VALKEY_PASSWORD must be set in production');
    });

    it('should not throw in production with all valid secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-secure-32-character-secret-here!';
      process.env.ENCRYPTION_KEY = 'a-secure-32-character-key-here!!';
      process.env.VALKEY_PASSWORD = 'secure-password';

      expect(() => {
        jest.resetModules();
        require('../../src/config/configuration');
      }).not.toThrow();
    });

    it('should include all errors in the error message', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.VALKEY_PASSWORD;

      try {
        jest.resetModules();
        require('../../src/config/configuration');
        fail('Should have thrown an error');
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
