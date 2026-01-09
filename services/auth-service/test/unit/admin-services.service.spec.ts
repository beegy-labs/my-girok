import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { AdminServicesService } from '../../src/admin/services/admin-services.service';
import { PrismaService } from '../../src/database/prisma.service';

describe('AdminServicesService', () => {
  let service: AdminServicesService;
  let mockPrismaService: { $queryRaw: Mock; $executeRaw: Mock };

  const mockService = {
    id: 'service-123',
    slug: 'resume',
    name: 'Resume Service',
    description: 'Resume management service',
    isActive: true,
    settings: { feature: true },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConsentRequirement = {
    id: 'consent-123',
    serviceId: 'service-123',
    countryCode: 'KR',
    consentType: 'TERMS_OF_SERVICE',
    isRequired: true,
    documentType: 'TERMS',
    displayOrder: 1,
    labelKey: 'consent.tos.label',
    descriptionKey: 'consent.tos.description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockServiceCountry = {
    id: 'sc-123',
    serviceId: 'service-123',
    countryCode: 'KR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockServiceLocale = {
    id: 'sl-123',
    serviceId: 'service-123',
    locale: 'ko-KR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminServicesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<AdminServicesService>(AdminServicesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listServices', () => {
    it('should return paginated services', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockService]);

      // Act
      const result = await service.listServices({ page: 1, limit: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].slug).toBe('resume');
      expect(result.meta.total).toBe(1);
    });

    it('should filter by isActive', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockService]);

      // Act
      const result = await service.listServices({ isActive: true });

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('should use default pagination values', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.listServices({});

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('getServiceBySlug', () => {
    it('should return service by slug', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockService]);

      // Act
      const result = await service.getServiceBySlug('resume');

      // Assert
      expect(result.slug).toBe('resume');
      expect(result.name).toBe('Resume Service');
    });

    it('should throw NotFoundException for non-existent service', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getServiceBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listConsentRequirements', () => {
    it('should return consent requirements for service', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockConsentRequirement]);

      // Act
      const result = await service.listConsentRequirements('service-123', {});

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].consentType).toBe('TERMS_OF_SERVICE');
    });

    it('should filter by countryCode', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockConsentRequirement]);

      // Act
      const result = await service.listConsentRequirements('service-123', {
        countryCode: 'KR',
      });

      // Assert
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getConsentRequirement', () => {
    it('should return consent requirement by id', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockConsentRequirement]);

      // Act
      const result = await service.getConsentRequirement('service-123', 'consent-123');

      // Assert
      expect(result.id).toBe('consent-123');
    });

    it('should throw NotFoundException for non-existent requirement', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getConsentRequirement('service-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createConsentRequirement', () => {
    it('should create a new consent requirement', async () => {
      // Arrange
      const dto = {
        countryCode: 'US',
        consentType: 'PRIVACY_POLICY' as any,
        isRequired: true,
        documentType: 'PRIVACY' as any,
        displayOrder: 1,
        labelKey: 'consent.privacy.label',
        descriptionKey: 'consent.privacy.desc',
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceById
        .mockResolvedValueOnce([]) // No existing
        .mockResolvedValueOnce([{ ...mockConsentRequirement, ...dto }]); // Insert

      // Act
      const result = await service.createConsentRequirement('service-123', dto);

      // Assert
      expect(result.consentType).toBe('PRIVACY_POLICY');
    });

    it('should throw ConflictException if duplicate exists', async () => {
      // Arrange
      const dto = {
        countryCode: 'KR',
        consentType: 'TERMS_OF_SERVICE' as any,
        isRequired: true,
        documentType: 'TERMS' as any,
        displayOrder: 1,
        labelKey: 'label',
        descriptionKey: 'desc',
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceById
        .mockResolvedValueOnce([{ id: 'existing' }]); // Duplicate exists

      // Act & Assert
      await expect(service.createConsentRequirement('service-123', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateConsentRequirement', () => {
    it('should update consent requirement', async () => {
      // Arrange
      const dto = { isRequired: false };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockConsentRequirement])
        .mockResolvedValueOnce([{ ...mockConsentRequirement, isRequired: false }]);

      // Act
      const result = await service.updateConsentRequirement('service-123', 'consent-123', dto);

      // Assert
      expect(result.isRequired).toBe(false);
    });
  });

  describe('deleteConsentRequirement', () => {
    it('should delete consent requirement', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockConsentRequirement]); // getConsentRequirement
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1); // delete

      // Act
      await service.deleteConsentRequirement('service-123', 'consent-123');

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkUpdateConsentRequirements', () => {
    it('should bulk update consent requirements', async () => {
      // Arrange
      const dto = {
        countryCode: 'KR',
        requirements: [
          {
            consentType: 'TERMS_OF_SERVICE' as any,
            isRequired: true,
            documentType: 'TERMS' as any,
            displayOrder: 1,
            labelKey: 'consent.tos.label',
            descriptionKey: 'consent.tos.desc',
          },
        ],
      };
      // getServiceById returns service
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockService]);
      // executeRaw for upsert
      mockPrismaService.$executeRaw.mockResolvedValue(1);
      // listConsentRequirements -> getServiceById
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockService]);
      // listConsentRequirements query
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockConsentRequirement]);

      // Act
      const result = await service.bulkUpdateConsentRequirements('service-123', dto);

      // Assert
      expect(result.data).toBeDefined();
    });
  });

  describe('listServiceCountries', () => {
    it('should return service countries', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceById
        .mockResolvedValueOnce([mockServiceCountry]); // listServiceCountries

      // Act
      const result = await service.listServiceCountries('service-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].countryCode).toBe('KR');
    });
  });

  describe('addServiceCountry', () => {
    it('should add a new service country', async () => {
      // Arrange
      const dto = { countryCode: 'US' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceById
        .mockResolvedValueOnce([{ ...mockServiceCountry, countryCode: 'US' }]); // upsert result

      // Act
      const result = await service.addServiceCountry('service-123', dto);

      // Assert
      expect(result.countryCode).toBe('US');
    });
  });

  describe('removeServiceCountry', () => {
    it('should remove service country', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockService]); // getServiceById
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1); // soft delete

      // Act
      await service.removeServiceCountry('service-123', 'KR');

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('listServiceLocales', () => {
    it('should return service locales', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceById
        .mockResolvedValueOnce([mockServiceLocale]); // listServiceLocales

      // Act
      const result = await service.listServiceLocales('service-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].locale).toBe('ko-KR');
    });
  });

  describe('addServiceLocale', () => {
    it('should add a new service locale', async () => {
      // Arrange
      const dto = { locale: 'en-US' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getServiceById
        .mockResolvedValueOnce([{ ...mockServiceLocale, locale: 'en-US' }]); // upsert result

      // Act
      const result = await service.addServiceLocale('service-123', dto);

      // Assert
      expect(result.locale).toBe('en-US');
    });
  });

  describe('removeServiceLocale', () => {
    it('should remove service locale', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockService]); // getServiceById
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1); // soft delete

      // Act
      await service.removeServiceLocale('service-123', 'ko-KR');

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
