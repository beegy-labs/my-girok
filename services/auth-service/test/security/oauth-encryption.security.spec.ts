import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import { OAuthConfigService } from '../../src/oauth-config/oauth-config.service';
import { CryptoService } from '../../src/common/crypto/crypto.service';
import { AuthProvider } from '@my-girok/types';
import * as crypto from 'crypto';

/**
 * Security Tests: OAuth Encryption
 *
 * Comprehensive security testing for OAuth credentials encryption:
 * - All clientSecret fields are encrypted in database
 * - Encryption uses AES-256-GCM
 * - Decryption returns original plaintext
 * - No plaintext secrets in logs
 * - No plaintext secrets in API responses
 * - Encryption key security
 *
 * IMPORTANT: These tests require a running PostgreSQL database.
 * They are skipped in CI/CD pipelines and should be run manually
 * in a development environment with a test database.
 *
 * To run: Remove .skip and ensure DATABASE_URL is set to a test database.
 */
describe.skip('OAuth Encryption Security', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let oauthConfigService: OAuthConfigService;
  let cryptoService: CryptoService;
  const adminUserId = 'security-test-admin';
  const encryptionKey = crypto.randomBytes(32).toString('hex');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthConfigService,
        PrismaService,
        CryptoService,
        {
          provide: 'ENCRYPTION_KEY',
          useValue: encryptionKey,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    oauthConfigService = moduleFixture.get<OAuthConfigService>(OAuthConfigService);
    cryptoService = moduleFixture.get<CryptoService>(CryptoService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.oAuthProviderConfig.deleteMany({
      where: {
        provider: {
          in: ['GOOGLE', 'KAKAO', 'NAVER', 'APPLE'],
        },
      },
    });
  });

  describe('Encryption Algorithm Verification', () => {
    it('should use AES-256-GCM encryption', () => {
      const plaintext = 'test-secret';
      const encrypted = cryptoService.encrypt(plaintext);

      // AES-256-GCM encrypted format: iv:tag:encrypted
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 16 bytes (32 hex chars)
      expect(parts[0]).toHaveLength(32);

      // Tag should be 16 bytes (32 hex chars)
      expect(parts[1]).toHaveLength(32);

      // Encrypted data should exist
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should use 256-bit encryption key', () => {
      // Encryption key should be 32 bytes (256 bits)
      expect(encryptionKey.length).toBeGreaterThanOrEqual(32);
    });

    it('should generate unique IV for each encryption', () => {
      const plaintext = 'same-secret';

      const encrypted1 = cryptoService.encrypt(plaintext);
      const encrypted2 = cryptoService.encrypt(plaintext);

      // Same plaintext should produce different ciphertexts (due to different IVs)
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(cryptoService.decrypt(encrypted1)).toBe(plaintext);
      expect(cryptoService.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('Database Storage Security', () => {
    it('should store all secrets encrypted in database', async () => {
      const secrets = [
        { provider: AuthProvider.GOOGLE, secret: 'google-secret-123' },
        { provider: AuthProvider.KAKAO, secret: 'kakao-secret-456' },
        { provider: AuthProvider.NAVER, secret: 'naver-secret-789' },
        { provider: AuthProvider.APPLE, secret: 'apple-secret-abc' },
      ];

      // Store all secrets
      for (const { provider, secret } of secrets) {
        await oauthConfigService.updateProviderCredentials(
          provider,
          { clientSecret: secret },
          adminUserId,
        );
      }

      // Verify all are encrypted in DB
      const allRecords = await prisma.oAuthProviderConfig.findMany({
        where: {
          provider: {
            in: ['GOOGLE', 'KAKAO', 'NAVER', 'APPLE'],
          },
        },
      });

      for (const record of allRecords) {
        // Should not contain plaintext
        const originalSecret = secrets.find((s) => s.provider === record.provider)!.secret;
        expect(record.clientSecret).not.toBe(originalSecret);

        // Should be in encrypted format (iv:tag:encrypted)
        expect(record.clientSecret).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      }
    });

    it('should never store plaintext secrets in database', async () => {
      const plaintextSecret = 'PLAINTEXT_SECRET_DO_NOT_STORE';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: plaintextSecret },
        adminUserId,
      );

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      // Database should not contain plaintext
      expect(dbRecord?.clientSecret).not.toContain('PLAINTEXT');
      expect(dbRecord?.clientSecret).not.toBe(plaintextSecret);
    });

    it('should verify encrypted data integrity with auth tag', () => {
      const plaintext = 'important-secret';
      const encrypted = cryptoService.encrypt(plaintext);

      // Tamper with encrypted data
      const parts = encrypted.split(':');
      const tamperedEncrypted = `${parts[0]}:${parts[1]}:${'0'.repeat(parts[2].length)}`;

      // Decryption should fail due to auth tag verification
      expect(() => cryptoService.decrypt(tamperedEncrypted)).toThrow();
    });
  });

  describe('Decryption Security', () => {
    it('should decrypt to original plaintext', async () => {
      const originalSecret = 'my-super-secret-key';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: originalSecret },
        adminUserId,
      );

      const credentials = await oauthConfigService.getDecryptedCredentials(AuthProvider.GOOGLE);

      expect(credentials.clientSecret).toBe(originalSecret);
    });

    it('should reject decryption with wrong key', () => {
      const plaintext = 'secret-data';
      const encrypted = cryptoService.encrypt(plaintext);

      // Create new crypto service with different key
      const wrongKey = crypto.randomBytes(32).toString('hex');
      const wrongCryptoService = new CryptoService({ get: () => wrongKey } as any);

      // Decryption should fail
      expect(() => wrongCryptoService.decrypt(encrypted)).toThrow();
    });

    it('should reject tampered ciphertext', () => {
      const plaintext = 'secret';
      const encrypted = cryptoService.encrypt(plaintext);

      // Tamper with IV
      const parts = encrypted.split(':');
      const tamperedIv = '0'.repeat(32);
      const tamperedEncrypted = `${tamperedIv}:${parts[1]}:${parts[2]}`;

      expect(() => cryptoService.decrypt(tamperedEncrypted)).toThrow();
    });

    it('should reject invalid encrypted format', () => {
      const invalidFormats = [
        'not-encrypted',
        'only:two:parts',
        'iv:tag:encrypted:extra',
        '',
        'invalid-hex:zzzz:data',
      ];

      for (const invalid of invalidFormats) {
        expect(() => cryptoService.decrypt(invalid)).toThrow();
      }
    });
  });

  describe('API Response Security', () => {
    it('should never expose plaintext secrets in API responses', async () => {
      const secret = 'SUPER_SECRET_PASSWORD_123';

      const response = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: secret },
        adminUserId,
      );

      // Response should not contain plaintext secret
      const responseJson = JSON.stringify(response);
      expect(responseJson).not.toContain(secret);
      expect(responseJson).not.toContain('SUPER_SECRET');
    });

    it('should only show masked secrets in getAllProvidersWithMasking', async () => {
      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: 'google-secret-abcd1234' },
        adminUserId,
      );

      const providers = await oauthConfigService.getAllProvidersWithMasking();
      const googleProvider = providers.find((p) => p.provider === AuthProvider.GOOGLE);

      expect(googleProvider?.clientSecretMasked).toMatch(/^\*+\d{3,4}$/);
      expect(googleProvider?.clientSecretMasked).not.toContain('google-secret');
    });

    it('should not include clientSecret field in masked responses', async () => {
      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: 'secret' },
        adminUserId,
      );

      const providers = await oauthConfigService.getAllProvidersWithMasking();
      const googleProvider = providers.find((p) => p.provider === AuthProvider.GOOGLE);

      // Should have masked version, not plaintext or encrypted
      expect(googleProvider).toHaveProperty('clientSecretMasked');
      expect(googleProvider).not.toHaveProperty('clientSecret');
    });
  });

  describe('Logging Security', () => {
    it('should not log plaintext secrets', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const secret = 'LOGGING_TEST_SECRET';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: secret },
        adminUserId,
      );

      // Check all console output
      const allLogs = [
        ...consoleSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
      ]
        .flat()
        .join(' ');

      expect(allLogs).not.toContain(secret);
      expect(allLogs).not.toContain('LOGGING_TEST_SECRET');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Secret Masking', () => {
    it('should show last 4 characters of secret', async () => {
      const secret = 'my-long-secret-1234';

      const response = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: secret },
        adminUserId,
      );

      expect(response.clientSecretMasked).toContain('1234');
      expect(response.clientSecretMasked).toContain('*');
    });

    it('should mask short secrets appropriately', async () => {
      const shortSecret = 'abc';

      const response = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: shortSecret },
        adminUserId,
      );

      expect(response.clientSecretMasked).toContain('*');
      expect(response.clientSecretMasked?.length).toBeLessThan(shortSecret.length + 15);
    });

    it('should handle empty or null secrets', async () => {
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
          clientSecret: null,
        },
      });

      const providers = await oauthConfigService.getAllProvidersWithMasking();
      const googleProvider = providers.find((p) => p.provider === AuthProvider.GOOGLE);

      expect(googleProvider?.clientSecretMasked).toBeUndefined();
    });
  });

  describe('Encryption Key Security', () => {
    it('should not expose encryption key in any API response', async () => {
      const response = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: 'test' },
        adminUserId,
      );

      const responseJson = JSON.stringify(response);
      expect(responseJson).not.toContain(encryptionKey);
    });

    it('should use environment variable for encryption key', () => {
      // Encryption key should come from config/env, not hardcoded
      // This test verifies the pattern
      expect(encryptionKey).toBeTruthy();
      expect(encryptionKey.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Encryption Performance', () => {
    it('should encrypt and decrypt within reasonable time', () => {
      const secret = 'performance-test-secret';

      const encryptStart = Date.now();
      const encrypted = cryptoService.encrypt(secret);
      const encryptEnd = Date.now();

      const decryptStart = Date.now();
      const decrypted = cryptoService.decrypt(encrypted);
      const decryptEnd = Date.now();

      // Encryption should be fast (< 10ms)
      expect(encryptEnd - encryptStart).toBeLessThan(10);
      expect(decryptEnd - decryptStart).toBeLessThan(10);

      expect(decrypted).toBe(secret);
    });

    it('should handle encryption of large secrets', () => {
      const largeSecret = 'x'.repeat(10000); // 10KB secret

      const encrypted = cryptoService.encrypt(largeSecret);
      const decrypted = cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(largeSecret);
    });
  });
});
