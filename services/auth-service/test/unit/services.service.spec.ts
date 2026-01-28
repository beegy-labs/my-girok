import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { ServicesService } from '../../src/services/services.service';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/database/prisma.service';
import { IdentityGrpcClient } from '@my-girok/nest-common';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheManager, MockCacheManager } from '../utils/mock-cache';
import { generateTestId, resetTestCounter } from '../utils/test-factory';
import { ConsentType } from '@my-girok/types';

describe('ServicesService', () => {
  let service: ServicesService;
  let mockPrisma: MockPrismaService;
  let mockCache: MockCacheManager;
  let mockAuthService: {
    generateTokensWithServices: Mock;
    saveRefreshToken: Mock;
  };
  let mockIdentityClient: {
    getAccount: Mock;
    getProfile: Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';
  const serviceId = '00000000-0000-7000-0000-000000000002';
  const serviceSlug = 'my-girok';
  const countryCode = 'KR';

  const mockService = {
    id: serviceId,
    slug: serviceSlug,
    name: 'My Girok',
    requiredConsents: {},
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();
    mockCache = createMockCacheManager();
    mockAuthService = {
      generateTokensWithServices: vi.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }),
      saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    };
    mockIdentityClient = {
      getAccount: vi.fn().mockResolvedValue({
        account: {
          id: userId,
          email: 'test@example.com',
          username: 'testuser',
        },
      }),
      getProfile: vi.fn().mockResolvedValue({
        profile: {
          account_id: userId,
          country_code: 'KR',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: AuthService, useValue: mockAuthService },
        { provide: IdentityGrpcClient, useValue: mockIdentityClient },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getConsentRequirements', () => {
    it('should return consent requirements for a service and country', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceBySlug
        .mockResolvedValueOnce([
          {
            id: generateTestId(),
            serviceId,
            consentType: 'TERMS_OF_SERVICE',
            countryCode,
            isRequired: true,
            documentType: 'TERMS',
            displayOrder: 1,
            labelKey: 'consent.terms',
            descriptionKey: 'consent.terms.desc',
          },
          {
            id: generateTestId(),
            serviceId,
            consentType: 'MARKETING',
            countryCode,
            isRequired: false,
            documentType: 'MARKETING',
            displayOrder: 2,
            labelKey: 'consent.marketing',
            descriptionKey: 'consent.marketing.desc',
          },
        ]);

      // Act
      const result = await service.getConsentRequirements(serviceSlug, countryCode);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('TERMS_OF_SERVICE');
      expect(result[0].isRequired).toBe(true);
      expect(result[1].type).toBe('MARKETING');
      expect(result[1].isRequired).toBe(false);
    });

    it('should use cached service when available', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(mockService);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      await service.getConsentRequirements(serviceSlug, countryCode);

      // Assert
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1); // Only consent requirements query
    });

    it('should throw NotFoundException when service not found', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getConsentRequirements('nonexistent', countryCode)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('joinService', () => {
    const consents = [
      { type: ConsentType.TERMS_OF_SERVICE, agreed: true },
      { type: ConsentType.PRIVACY_POLICY, agreed: true },
    ];

    it('should successfully join a service with consents', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceBySlug
        .mockResolvedValueOnce([]) // check existing join
        .mockResolvedValueOnce([]) // validateRequiredConsents - requirements
        .mockResolvedValueOnce([{ status: 'ACTIVE', countryCode: 'KR', serviceSlug }]); // getUserServices

      // User lookup via gRPC
      mockIdentityClient.getAccount.mockResolvedValue({
        account: {
          id: userId,
          email: 'test@example.com',
          username: 'testuser',
        },
      });
      mockIdentityClient.getProfile.mockResolvedValue({
        profile: {
          account_id: userId,
          country_code: 'KR',
        },
      });

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({
          $executeRaw: vi.fn().mockResolvedValue(1),
        });
      });

      // Act
      const result = await service.joinService(
        userId,
        serviceSlug,
        countryCode,
        consents,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      // Assert
      expect(result.userService.serviceSlug).toBe(serviceSlug);
      expect(result.userService.countryCode).toBe(countryCode);
      expect(result.userService.status).toBe('ACTIVE');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockAuthService.generateTokensWithServices).toHaveBeenCalled();
      expect(mockAuthService.saveRefreshToken).toHaveBeenCalled();
    });

    it('should throw ConflictException when already joined', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([{ id: generateTestId() }]); // existing join

      // Act & Assert
      await expect(
        service.joinService(userId, serviceSlug, countryCode, consents, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when required consent missing', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { consentType: 'TERMS_OF_SERVICE', isRequired: true },
          { consentType: 'AGE_VERIFICATION', isRequired: true }, // Not in consents
        ]);

      const incompleteConsents = [{ type: ConsentType.TERMS_OF_SERVICE, agreed: true }];

      // Act & Assert
      await expect(
        service.joinService(
          userId,
          serviceSlug,
          countryCode,
          incompleteConsents,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when required consent not agreed', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ consentType: 'TERMS_OF_SERVICE', isRequired: true }]);

      const disagreeConsents = [{ type: ConsentType.TERMS_OF_SERVICE, agreed: false }];

      // Act & Assert
      await expect(
        service.joinService(
          userId,
          serviceSlug,
          countryCode,
          disagreeConsents,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // User lookup via gRPC now returns null account
      mockIdentityClient.getAccount.mockResolvedValue({ account: null });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({ $executeRaw: vi.fn().mockResolvedValue(1) });
      });

      // Act & Assert
      await expect(
        service.joinService(userId, serviceSlug, countryCode, consents, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCountryConsent', () => {
    const consents = [{ type: ConsentType.TERMS_OF_SERVICE, agreed: true }];
    const newCountryCode = 'JP';

    it('should add consent for a new country', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([{ id: generateTestId() }]) // existing join (any country)
        .mockResolvedValueOnce([]) // no existing for new country
        .mockResolvedValueOnce([]) // validateRequiredConsents
        .mockResolvedValueOnce([
          { status: 'ACTIVE', countryCode: 'KR', serviceSlug },
          { status: 'ACTIVE', countryCode: 'JP', serviceSlug },
        ]);

      // User lookup via gRPC
      mockIdentityClient.getAccount.mockResolvedValue({
        account: {
          id: userId,
          email: 'test@example.com',
          username: 'testuser',
        },
      });
      mockIdentityClient.getProfile.mockResolvedValue({
        profile: {
          account_id: userId,
          country_code: 'KR',
        },
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({ $executeRaw: vi.fn().mockResolvedValue(1) });
      });

      // Act
      const result = await service.addCountryConsent(
        userId,
        serviceSlug,
        newCountryCode,
        consents,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      // Assert
      expect(result.countryCode).toBe(newCountryCode);
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should throw BadRequestException when not joined to service', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockService]).mockResolvedValueOnce([]); // no existing join

      // Act & Assert
      await expect(
        service.addCountryConsent(
          userId,
          serviceSlug,
          newCountryCode,
          consents,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when already have consent for country', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([{ id: generateTestId() }])
        .mockResolvedValueOnce([{ id: generateTestId() }]); // existing for country

      // Act & Assert
      await expect(
        service.addCountryConsent(
          userId,
          serviceSlug,
          newCountryCode,
          consents,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyConsents', () => {
    it('should return all consents for a service', async () => {
      // Arrange
      const mockConsents = [
        {
          id: generateTestId(),
          userId,
          serviceId,
          consentType: 'TERMS_OF_SERVICE',
          countryCode: 'KR',
          documentId: null,
          agreed: true,
          agreedAt: new Date(),
          withdrawnAt: null,
        },
        {
          id: generateTestId(),
          userId,
          serviceId,
          consentType: 'MARKETING',
          countryCode: 'KR',
          documentId: null,
          agreed: false,
          agreedAt: null,
          withdrawnAt: new Date(),
        },
      ];

      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockService]).mockResolvedValueOnce(mockConsents);

      // Act
      const result = await service.getMyConsents(userId, serviceSlug);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].consentType).toBe('TERMS_OF_SERVICE');
      expect(result[0].agreed).toBe(true);
      expect(result[1].agreed).toBe(false);
    });

    it('should filter by country code when provided', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockService]).mockResolvedValueOnce([]);

      // Act
      await service.getMyConsents(userId, serviceSlug, 'KR');

      // Assert
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateConsent', () => {
    it('should update a consent successfully', async () => {
      // Arrange
      const consentId = generateTestId();
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([{ id: consentId, agreed: true }]) // existing consent
        .mockResolvedValueOnce([]) // not required
        .mockResolvedValueOnce([
          {
            id: consentId,
            consentType: 'MARKETING',
            countryCode: 'KR',
            documentId: null,
            agreed: false,
            agreedAt: null,
            withdrawnAt: new Date(),
          },
        ]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateConsent(
        userId,
        serviceSlug,
        ConsentType.MARKETING_EMAIL,
        'KR',
        false,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      // Assert
      expect(result.consent.agreed).toBe(false);
      expect(result.consent.withdrawnAt).toBeDefined();
    });

    it('should throw NotFoundException when consent not found', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockService]).mockResolvedValueOnce([]); // no consent

      // Act & Assert
      await expect(
        service.updateConsent(
          userId,
          serviceSlug,
          ConsentType.MARKETING_EMAIL,
          'KR',
          false,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when withdrawing required consent', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([{ id: generateTestId(), agreed: true }])
        .mockResolvedValueOnce([{ isRequired: true }]); // required consent

      // Act & Assert
      await expect(
        service.updateConsent(
          userId,
          serviceSlug,
          ConsentType.TERMS_OF_SERVICE,
          'KR',
          false,
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdrawService', () => {
    it('should withdraw from entire service', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockService]);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({ $executeRaw: vi.fn().mockResolvedValue(1) });
      });

      // Act
      await service.withdrawService(userId, serviceSlug, undefined, 'No longer needed');

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should withdraw from specific country only', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockService]);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({ $executeRaw: vi.fn().mockResolvedValue(1) });
      });

      // Act
      await service.withdrawService(userId, serviceSlug, 'KR', 'Moving out');

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('invalidateServiceCache', () => {
    it('should delete cache for a service', async () => {
      // Act
      await service.invalidateServiceCache(serviceSlug);

      // Assert
      expect(mockCache.del).toHaveBeenCalled();
    });
  });

  describe('verifyServiceDomain', () => {
    const validServiceId = '00000000-0000-7000-0000-000000000003';
    const mockServiceConfig = {
      id: validServiceId,
      slug: 'my-girok',
      name: 'My Girok',
      domains: ['my-girok.com', 'localhost:3000'],
      domainValidation: true,
      jwtValidation: true,
      rateLimitEnabled: true,
    };

    describe('UUID validation', () => {
      it('should reject invalid UUID format', async () => {
        // Arrange
        const invalidId = 'not-a-valid-uuid';

        // Act
        const result = await service.verifyServiceDomain(invalidId);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Invalid service ID format');
        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      });

      it('should accept valid UUID format', async () => {
        // Arrange
        mockCache.get.mockResolvedValue(mockServiceConfig);

        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com');

        // Assert
        expect(mockCache.get).toHaveBeenCalled();
        expect(result.valid).toBe(true);
      });
    });

    describe('cache behavior', () => {
      it('should return cached config when available', async () => {
        // Arrange
        mockCache.get.mockResolvedValue(mockServiceConfig);

        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com');

        // Assert
        expect(mockCache.get).toHaveBeenCalledTimes(1);
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
        expect(result.valid).toBe(true);
        expect(result.service?.slug).toBe('my-girok');
      });

      it('should query DB and cache result on cache miss', async () => {
        // Arrange
        mockCache.get.mockResolvedValue(undefined);
        mockPrisma.$queryRaw.mockResolvedValue([mockServiceConfig]);

        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com');

        // Assert
        expect(mockCache.get).toHaveBeenCalled();
        expect(mockPrisma.$queryRaw).toHaveBeenCalled();
        expect(mockCache.set).toHaveBeenCalledWith(
          expect.stringContaining(validServiceId),
          mockServiceConfig,
          3600,
        );
        expect(result.valid).toBe(true);
      });

      it('should return failure when service not found in DB', async () => {
        // Arrange
        mockCache.get.mockResolvedValue(undefined);
        mockPrisma.$queryRaw.mockResolvedValue([]);

        // Act
        const result = await service.verifyServiceDomain(validServiceId);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Service not found');
        expect(mockCache.set).not.toHaveBeenCalled();
      });
    });

    describe('domain validation disabled', () => {
      it('should allow any domain when domainValidation is false', async () => {
        // Arrange
        const configWithoutDomainValidation = {
          ...mockServiceConfig,
          domainValidation: false,
        };
        mockCache.get.mockResolvedValue(configWithoutDomainValidation);

        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'any-domain.com');

        // Assert
        expect(result.valid).toBe(true);
        expect(result.service?.domainValidation).toBe(false);
      });

      it('should succeed without domain when domainValidation is false', async () => {
        // Arrange
        const configWithoutDomainValidation = {
          ...mockServiceConfig,
          domainValidation: false,
        };
        mockCache.get.mockResolvedValue(configWithoutDomainValidation);

        // Act
        const result = await service.verifyServiceDomain(validServiceId);

        // Assert
        expect(result.valid).toBe(true);
      });
    });

    describe('domain validation enabled', () => {
      beforeEach(() => {
        mockCache.get.mockResolvedValue(mockServiceConfig);
      });

      it('should reject when domain is missing', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Missing domain (domain validation enabled)');
      });

      it('should accept exact domain match', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com');

        // Assert
        expect(result.valid).toBe(true);
        expect(result.service).toBeDefined();
      });

      it('should accept domain with port match', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'localhost:3000');

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should strip https:// prefix and match', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'https://my-girok.com');

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should strip http:// prefix and match', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'http://my-girok.com');

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should strip trailing slash and match', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com/');

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should match domain without port when allowed domain has no port', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com:443');

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should reject non-whitelisted domain', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'evil.com');

        // Assert
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not allowed');
      });

      it('should reject subdomain when not in whitelist', async () => {
        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'sub.my-girok.com');

        // Assert
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not allowed');
      });
    });

    describe('edge cases', () => {
      it('should handle empty domains array', async () => {
        // Arrange
        const configWithNoDomains = {
          ...mockServiceConfig,
          domains: [],
        };
        mockCache.get.mockResolvedValue(configWithNoDomains);

        // Act
        const result = await service.verifyServiceDomain(validServiceId, 'my-girok.com');

        // Assert
        expect(result.valid).toBe(false);
      });

      it('should handle uppercase UUID', async () => {
        // Arrange
        const uppercaseId = validServiceId.toUpperCase();
        mockCache.get.mockResolvedValue(mockServiceConfig);

        // Act
        const result = await service.verifyServiceDomain(uppercaseId);

        // Assert
        expect(mockCache.get).toHaveBeenCalled();
      });
    });
  });
});
