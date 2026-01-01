import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { ServicesService } from '../../src/services/services.service';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheManager, MockCacheManager } from '../utils/mock-cache';
import { generateTestId, resetTestCounter } from '../utils/test-factory';
import { ConsentType } from '@my-girok/types';

describe('ServicesService', () => {
  let service: ServicesService;
  let mockPrisma: MockPrismaService;
  let mockCache: MockCacheManager;
  let mockAuthService: {
    generateTokensWithServices: jest.Mock;
    saveRefreshToken: jest.Mock;
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

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    accountMode: 'SERVICE',
    countryCode: 'KR',
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();
    mockCache = createMockCacheManager();
    mockAuthService = {
      generateTokensWithServices: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }),
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({
          $executeRaw: jest.fn().mockResolvedValue(1),
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

      mockPrisma.user.findUnique.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({ $executeRaw: jest.fn().mockResolvedValue(1) });
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

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        await callback({ $executeRaw: jest.fn().mockResolvedValue(1) });
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
        await callback({ $executeRaw: jest.fn().mockResolvedValue(1) });
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
        await callback({ $executeRaw: jest.fn().mockResolvedValue(1) });
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
});
