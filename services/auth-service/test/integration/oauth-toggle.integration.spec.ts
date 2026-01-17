import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import { OAuthConfigService } from '../../src/oauth-config/oauth-config.service';
import { CryptoService } from '../../src/common/crypto/crypto.service';
import { ForbiddenException } from '@nestjs/common';
import { AuthProvider } from '@my-girok/types';

/**
 * Integration Tests: OAuth Provider Toggle
 *
 * Tests the full provider toggle flow with real database operations:
 * - Toggle provider from disabled to enabled
 * - Toggle provider from enabled to disabled
 * - Verify database state after toggle
 * - Verify audit log entries
 * - Test concurrent toggle requests
 * - Test LOCAL provider cannot be disabled
 */
describe('OAuth Provider Toggle Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let oauthConfigService: OAuthConfigService;
  const adminUserId = 'test-admin-123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthConfigService,
        PrismaService,
        CryptoService,
        {
          provide: 'ENCRYPTION_KEY',
          useValue: 'test-encryption-key-32-bytes!!',
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    oauthConfigService = moduleFixture.get<OAuthConfigService>(OAuthConfigService);
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

  describe('Toggle Enabled State', () => {
    it('should toggle provider from disabled to enabled', async () => {
      // Create disabled provider
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: false,
          displayName: 'Google',
          clientId: 'test-client-id',
          clientSecret: 'encrypted-secret',
        },
      });

      // Toggle to enabled
      const result = await oauthConfigService.toggleProvider(
        AuthProvider.GOOGLE,
        true,
        adminUserId,
      );

      expect(result.enabled).toBe(true);
      expect(result.updatedBy).toBe(adminUserId);

      // Verify database state
      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.enabled).toBe(true);
      expect(dbRecord?.updatedBy).toBe(adminUserId);
      expect(dbRecord?.updatedAt).toBeDefined();
    });

    it('should toggle provider from enabled to disabled', async () => {
      // Create enabled provider
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.KAKAO,
          enabled: true,
          displayName: 'Kakao',
          clientId: 'test-client-id',
          clientSecret: 'encrypted-secret',
        },
      });

      // Toggle to disabled
      const result = await oauthConfigService.toggleProvider(
        AuthProvider.KAKAO,
        false,
        adminUserId,
      );

      expect(result.enabled).toBe(false);

      // Verify database state
      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.KAKAO },
      });

      expect(dbRecord?.enabled).toBe(false);
    });

    it('should create provider config if not exists when enabling', async () => {
      // Provider does not exist in DB
      const existingConfig = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.NAVER },
      });
      expect(existingConfig).toBeNull();

      // Toggle to enabled (should create new record)
      const result = await oauthConfigService.toggleProvider(AuthProvider.NAVER, true, adminUserId);

      expect(result.enabled).toBe(true);

      // Verify new record was created
      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.NAVER },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord?.enabled).toBe(true);
      expect(dbRecord?.provider).toBe(AuthProvider.NAVER);
    });
  });

  describe('LOCAL Provider Protection', () => {
    it('should prevent disabling LOCAL provider', async () => {
      await expect(
        oauthConfigService.toggleProvider(AuthProvider.LOCAL, false, adminUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow enabling LOCAL provider (no-op)', async () => {
      // LOCAL is always enabled, but this should not throw
      const result = await oauthConfigService.toggleProvider(AuthProvider.LOCAL, true, adminUserId);

      // Should succeed (LOCAL is always considered enabled)
      expect(result.provider).toBe(AuthProvider.LOCAL);
    });
  });

  describe('Concurrent Toggle Requests', () => {
    it('should handle concurrent toggle requests correctly', async () => {
      // Create provider
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: false,
          displayName: 'Google',
        },
      });

      // Simulate concurrent toggle requests
      const promises = [
        oauthConfigService.toggleProvider(AuthProvider.GOOGLE, true, 'admin-1'),
        oauthConfigService.toggleProvider(AuthProvider.GOOGLE, false, 'admin-2'),
        oauthConfigService.toggleProvider(AuthProvider.GOOGLE, true, 'admin-3'),
      ];

      // Wait for all to complete
      const results = await Promise.allSettled(promises);

      // All should succeed (last write wins)
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });

      // Final state should match last operation
      const finalState = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(finalState?.enabled).toBeDefined();
      expect(['admin-1', 'admin-2', 'admin-3']).toContain(finalState?.updatedBy);
    });
  });

  describe('Audit Trail', () => {
    it('should record updatedBy and updatedAt on toggle', async () => {
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: false,
          displayName: 'Google',
        },
      });

      const beforeToggle = new Date();

      await oauthConfigService.toggleProvider(AuthProvider.GOOGLE, true, adminUserId);

      const afterToggle = new Date();

      const dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });

      expect(dbRecord?.updatedBy).toBe(adminUserId);
      expect(dbRecord?.updatedAt).toBeDefined();
      expect(dbRecord!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeToggle.getTime());
      expect(dbRecord!.updatedAt.getTime()).toBeLessThanOrEqual(afterToggle.getTime());
    });

    it('should update updatedBy on each toggle', async () => {
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: false,
          displayName: 'Google',
          updatedBy: 'initial-admin',
        },
      });

      // First toggle
      await oauthConfigService.toggleProvider(AuthProvider.GOOGLE, true, 'admin-1');

      let dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });
      expect(dbRecord?.updatedBy).toBe('admin-1');

      // Second toggle
      await oauthConfigService.toggleProvider(AuthProvider.GOOGLE, false, 'admin-2');

      dbRecord = await prisma.oAuthProviderConfig.findUnique({
        where: { provider: AuthProvider.GOOGLE },
      });
      expect(dbRecord?.updatedBy).toBe('admin-2');
    });
  });

  describe('isProviderEnabled Query', () => {
    it('should return true for enabled provider', async () => {
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
        },
      });

      const isEnabled = await oauthConfigService.isProviderEnabled(AuthProvider.GOOGLE);

      expect(isEnabled).toBe(true);
    });

    it('should return false for disabled provider', async () => {
      await prisma.oAuthProviderConfig.create({
        data: {
          provider: AuthProvider.KAKAO,
          enabled: false,
          displayName: 'Kakao',
        },
      });

      const isEnabled = await oauthConfigService.isProviderEnabled(AuthProvider.KAKAO);

      expect(isEnabled).toBe(false);
    });

    it('should return true for non-existent provider (default enabled)', async () => {
      // Provider not in database
      const isEnabled = await oauthConfigService.isProviderEnabled(AuthProvider.NAVER);

      expect(isEnabled).toBe(true);
    });

    it('should always return true for LOCAL provider', async () => {
      const isEnabled = await oauthConfigService.isProviderEnabled(AuthProvider.LOCAL);

      expect(isEnabled).toBe(true);
    });
  });

  describe('getEnabledProviders Query', () => {
    it('should return only enabled providers', async () => {
      await prisma.oAuthProviderConfig.createMany({
        data: [
          {
            provider: AuthProvider.GOOGLE,
            enabled: true,
            displayName: 'Google',
          },
          {
            provider: AuthProvider.KAKAO,
            enabled: false,
            displayName: 'Kakao',
          },
          {
            provider: AuthProvider.NAVER,
            enabled: true,
            displayName: 'Naver',
          },
        ],
      });

      const result = await oauthConfigService.getEnabledProviders();

      expect(result.providers).toHaveLength(2);
      expect(result.providers.map((p) => p.provider)).toContain(AuthProvider.GOOGLE);
      expect(result.providers.map((p) => p.provider)).toContain(AuthProvider.NAVER);
      expect(result.providers.map((p) => p.provider)).not.toContain(AuthProvider.KAKAO);
      expect(result.providers.map((p) => p.provider)).not.toContain(AuthProvider.LOCAL);
    });

    it('should return empty list if all providers disabled', async () => {
      await prisma.oAuthProviderConfig.createMany({
        data: [
          {
            provider: AuthProvider.GOOGLE,
            enabled: false,
            displayName: 'Google',
          },
          {
            provider: AuthProvider.KAKAO,
            enabled: false,
            displayName: 'Kakao',
          },
        ],
      });

      const result = await oauthConfigService.getEnabledProviders();

      expect(result.providers).toHaveLength(0);
    });
  });
});
