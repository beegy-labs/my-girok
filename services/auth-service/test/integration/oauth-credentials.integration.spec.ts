import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import { OAuthConfigService } from '../../src/oauth-config/oauth-config.service';
import { CryptoService } from '../../src/common/crypto/crypto.service';
import { AuthProvider } from '@my-girok/types';

/**
 * Integration Tests: OAuth Credentials Update
 *
 * Tests the full credentials update flow with encryption:
 * - Update credentials with encryption
 * - Verify encrypted secret in database
 * - Verify decryption returns original secret
 * - Partial updates (clientId only, secret only, callbackUrl only)
 * - Audit trail verification
 * - Callback URL validation
 */
describe('OAuth Credentials Update Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let oauthConfigService: OAuthConfigService;
  let cryptoService: CryptoService;
  const adminUserId = 'test-admin-456';
  const encryptionKey = 'test-encryption-key-32-bytes!!';

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
    // Clean up test data
    await prisma.oAuthProviderConfig.deleteMany({
      where: {
        provider: {
          in: ['GOOGLE', 'KAKAO', 'NAVER', 'APPLE'],
        },
      },
    });
  });

  describe('Full Credentials Update', () => {
    it('should update all credentials with encryption', async () => {
      const plainSecret = 'my-super-secret-key-123';
      const dto = {
        clientId: 'new-client-id',
        clientSecret: plainSecret,
        callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
      };

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        dto,
        adminUserId,
      );

      expect(result.clientId).toBe('new-client-id');
      expect(result.clientSecretMasked).toContain('*');
      expect(result.clientSecretMasked).toContain('123'); // Last 3-4 chars
      expect(result.callbackUrl).toBe('https://auth-bff.girok.dev/oauth/google/callback');

      // Verify database has encrypted secret
      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.clientSecret).not.toBe(plainSecret);
      expect(dbRecord?.clientSecret).toBeTruthy();

      // Verify decryption works
      const decrypted = cryptoService.decrypt(dbRecord!.clientSecret!);
      expect(decrypted).toBe(plainSecret);
    });

    it('should verify encrypted secret is not plaintext in database', async () => {
      const plainSecret = 'ultra-secret-password-456';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.KAKAO,
        {
          clientSecret: plainSecret,
        },
        adminUserId,
      );

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.KAKAO },
      });

      // Secret in DB should be encrypted, not plaintext
      expect(dbRecord?.clientSecret).not.toBe(plainSecret);
      expect(dbRecord?.clientSecret).toContain(':'); // Encrypted format: iv:tag:encrypted
    });

    it('should decrypt and return original secret', async () => {
      const originalSecret = 'test-secret-789';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.NAVER,
        { clientSecret: originalSecret },
        adminUserId,
      );

      // Get decrypted credentials
      const credentials = await oauthConfigService.getDecryptedCredentials(AuthProvider.NAVER);

      expect(credentials.clientSecret).toBe(originalSecret);
    });
  });

  describe('Partial Updates', () => {
    beforeEach(async () => {
      // Create initial config
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
          clientId: 'old-client-id',
          clientSecret: cryptoService.encrypt('old-secret'),
          callbackUrl: 'https://old-url.com/callback',
        },
      });
    });

    it('should update only clientId without changing secret', async () => {
      const newClientId = 'updated-client-id';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientId: newClientId },
        adminUserId,
      );

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.clientId).toBe(newClientId);

      // Secret should remain unchanged
      const decryptedSecret = cryptoService.decrypt(dbRecord!.clientSecret!);
      expect(decryptedSecret).toBe('old-secret');
    });

    it('should update only clientSecret without changing clientId', async () => {
      const newSecret = 'brand-new-secret';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: newSecret },
        adminUserId,
      );

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.clientId).toBe('old-client-id');

      // Secret should be updated
      const decryptedSecret = cryptoService.decrypt(dbRecord!.clientSecret!);
      expect(decryptedSecret).toBe(newSecret);
    });

    it('should update only callbackUrl without changing credentials', async () => {
      const newCallbackUrl = 'https://auth-bff.girok.dev/oauth/google/callback';

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { callbackUrl: newCallbackUrl },
        adminUserId,
      );

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.callbackUrl).toBe(newCallbackUrl);
      expect(dbRecord?.clientId).toBe('old-client-id');

      // Secret should remain unchanged
      const decryptedSecret = cryptoService.decrypt(dbRecord!.clientSecret!);
      expect(decryptedSecret).toBe('old-secret');
    });
  });

  describe('Callback URL Validation', () => {
    it('should reject external domain callback URLs', async () => {
      const invalidUrls = [
        'https://evil.com/callback',
        'https://malicious-site.com/oauth/callback',
        'http://attacker.net/steal-tokens',
      ];

      for (const url of invalidUrls) {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should accept localhost callback URLs', async () => {
      const validLocalhostUrls = [
        'http://localhost:4005/oauth/google/callback',
        'http://localhost:3000/auth/callback',
        'http://127.0.0.1:4005/oauth/callback',
      ];

      for (const url of validLocalhostUrls) {
        // Clean up between tests
        await prisma.oAuthProviderConfig.deleteMany({
          where: { provider: AuthProvider.GOOGLE },
        });

        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        expect(result.callbackUrl).toBe(url);
      }
    });

    it('should accept girok.dev domain callback URLs', async () => {
      const validGirokUrls = [
        'https://girok.dev/oauth/google/callback',
        'https://auth.girok.dev/oauth/google/callback',
        'https://auth-bff.girok.dev/oauth/google/callback',
        'https://api.girok.dev/v1/oauth/google/callback',
      ];

      for (const url of validGirokUrls) {
        await prisma.oAuthProviderConfig.deleteMany({
          where: { provider: AuthProvider.GOOGLE },
        });

        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        expect(result.callbackUrl).toBe(url);
      }
    });

    it('should reject protocol-relative URLs', async () => {
      const protocolRelativeUrl = '//evil.com/callback';

      await expect(
        oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: protocolRelativeUrl },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Audit Trail', () => {
    it('should record updatedBy and updatedAt on credential update', async () => {
      const beforeUpdate = new Date();

      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        {
          clientId: 'new-id',
          clientSecret: 'new-secret',
        },
        adminUserId,
      );

      const afterUpdate = new Date();

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.updatedBy).toBe(adminUserId);
      expect(dbRecord?.updatedAt).toBeDefined();
      expect(dbRecord!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(dbRecord!.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it('should track different admin users updating credentials', async () => {
      // First admin updates
      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientId: 'id-v1' },
        'admin-1',
      );

      let dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });
      expect(dbRecord?.updatedBy).toBe('admin-1');

      // Second admin updates
      await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientId: 'id-v2' },
        'admin-2',
      );

      dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });
      expect(dbRecord?.updatedBy).toBe('admin-2');
    });
  });

  describe('Secret Masking', () => {
    it('should return masked secret in response', async () => {
      const secret = 'my-long-secret-key-1234567890';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: secret },
        adminUserId,
      );

      expect(result.clientSecretMasked).toMatch(/^\*+\d{3,4}$/);
      expect(result.clientSecretMasked).toContain('7890');
    });

    it('should mask short secrets correctly', async () => {
      const shortSecret = 'abc';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: shortSecret },
        adminUserId,
      );

      expect(result.clientSecretMasked).toContain('*');
      expect(result.clientSecretMasked).toContain('abc');
    });

    it('should not expose plaintext secret in API responses', async () => {
      const plainSecret = 'super-secret-password';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { clientSecret: plainSecret },
        adminUserId,
      );

      // Response should not contain plaintext secret
      expect(JSON.stringify(result)).not.toContain(plainSecret);
      expect(result.clientSecretMasked).toBeDefined();
      expect(result.clientSecretMasked).not.toBe(plainSecret);
    });
  });

  describe('Create vs Update', () => {
    it('should create new provider config if not exists', async () => {
      // Ensure provider does not exist
      const before = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.APPLE },
      });
      expect(before).toBeNull();

      // Update credentials (should create new record)
      await oauthConfigService.updateProviderCredentials(
        AuthProvider.APPLE,
        {
          clientId: 'apple-client-id',
          clientSecret: 'apple-secret',
        },
        adminUserId,
      );

      // Verify record was created
      const after = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.APPLE },
      });

      expect(after).toBeDefined();
      expect(after?.clientId).toBe('apple-client-id');
    });

    it('should update existing provider config', async () => {
      // Create initial config
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.KAKAO,
          enabled: true,
          displayName: 'Kakao',
          clientId: 'old-kakao-id',
          clientSecret: cryptoService.encrypt('old-secret'),
        },
      });

      // Update existing config
      await oauthConfigService.updateProviderCredentials(
        AuthProvider.KAKAO,
        {
          clientId: 'new-kakao-id',
          clientSecret: 'new-secret',
        },
        adminUserId,
      );

      // Should have updated, not created new
      const count = await prisma.oAuthProviderConfig.count({
        where: { provider: AuthProvider.KAKAO },
      });
      expect(count).toBe(1);

      const record = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.KAKAO },
      });
      expect(record?.clientId).toBe('new-kakao-id');
    });
  });

  describe('Encryption Key Rotation', () => {
    it('should handle decryption failure gracefully', async () => {
      // Manually insert a record with invalid encrypted secret
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
          clientId: 'test-id',
          clientSecret: 'invalid-encrypted-format',
        },
      });

      // getDecryptedCredentials should handle this gracefully
      const credentials = await oauthConfigService.getDecryptedCredentials(AuthProvider.GOOGLE);

      expect(credentials.clientId).toBe('test-id');
      expect(credentials.clientSecret).toBeNull(); // Failed decryption returns null
    });
  });
});
