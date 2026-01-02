import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LawRegistryService } from '../../src/law-registry/law-registry.service';
import { PrismaService } from '../../src/database/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { createMockPrisma, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheService } from '../utils/mock-cache';
import {
  createMockLawRegistry,
  createGdprLawRegistry,
  createCcpaLawRegistry,
  createPipaLawRegistry,
  createLawRegistryDto,
} from '../utils/test-factory';

describe('LawRegistryService', () => {
  let service: LawRegistryService;
  let prisma: MockPrismaService;
  let cacheService: ReturnType<typeof createMockCacheService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    cacheService = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LawRegistryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<LawRegistryService>(LawRegistryService);
  });

  describe('create', () => {
    it('should create a new law registry entry', async () => {
      const dto = createLawRegistryDto();
      const mockLaw = createMockLawRegistry();

      prisma.lawRegistry.findUnique.mockResolvedValue(null);
      prisma.lawRegistry.create.mockResolvedValue(mockLaw as never);

      const result = await service.create(dto as never);

      expect(result).toBeDefined();
      expect(result.code).toBe(mockLaw.code);
      expect(result.isActive).toBe(true);
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = createLawRegistryDto();
      const existingLaw = createMockLawRegistry();

      prisma.lawRegistry.findUnique.mockResolvedValue(existingLaw as never);

      await expect(service.create(dto as never)).rejects.toThrow(ConflictException);
    });

    it('should default isActive to true', async () => {
      const dto = createLawRegistryDto({ isActive: undefined });
      const mockLaw = createMockLawRegistry({ isActive: true });

      prisma.lawRegistry.findUnique.mockResolvedValue(null);
      prisma.lawRegistry.create.mockResolvedValue(mockLaw as never);

      const result = await service.create(dto as never);

      expect(result.isActive).toBe(true);
    });

    it('should invalidate cache after creation', async () => {
      const dto = createLawRegistryDto();
      const mockLaw = createMockLawRegistry();

      prisma.lawRegistry.findUnique.mockResolvedValue(null);
      prisma.lawRegistry.create.mockResolvedValue(mockLaw as never);

      await service.create(dto as never);

      expect(cacheService.invalidateLaw).toHaveBeenCalled();
    });

    it('should create GDPR law registry entry', async () => {
      const dto = createLawRegistryDto({
        code: 'GDPR',
        name: 'General Data Protection Regulation',
        countryCode: 'EU',
        effectiveDate: new Date('2018-05-25'),
      });
      const mockLaw = createGdprLawRegistry();

      prisma.lawRegistry.findUnique.mockResolvedValue(null);
      prisma.lawRegistry.create.mockResolvedValue(mockLaw as never);

      const result = await service.create(dto as never);

      expect(result.code).toBe('GDPR');
    });

    it('should create CCPA law registry entry', async () => {
      const dto = createLawRegistryDto({
        code: 'CCPA',
        name: 'California Consumer Privacy Act',
        countryCode: 'US',
        effectiveDate: new Date('2020-01-01'),
      });
      const mockLaw = createCcpaLawRegistry();

      prisma.lawRegistry.findUnique.mockResolvedValue(null);
      prisma.lawRegistry.create.mockResolvedValue(mockLaw as never);

      const result = await service.create(dto as never);

      expect(result.code).toBe('CCPA');
    });

    it('should create PIPA law registry entry', async () => {
      const dto = createLawRegistryDto({
        code: 'PIPA',
        name: 'Personal Information Protection Act',
        countryCode: 'KR',
        effectiveDate: new Date('2011-09-30'),
      });
      const mockLaw = createPipaLawRegistry();

      prisma.lawRegistry.findUnique.mockResolvedValue(null);
      prisma.lawRegistry.create.mockResolvedValue(mockLaw as never);

      const result = await service.create(dto as never);

      expect(result.code).toBe('PIPA');
    });
  });

  describe('findAll', () => {
    it('should return all law registry entries', async () => {
      const mockLaws = [createGdprLawRegistry(), createCcpaLawRegistry(), createPipaLawRegistry()];
      prisma.lawRegistry.findMany.mockResolvedValue(mockLaws as never);

      const result = await service.findAll({});

      expect(result).toHaveLength(3);
    });

    it('should filter by countryCode', async () => {
      const mockLaws = [createPipaLawRegistry()];
      prisma.lawRegistry.findMany.mockResolvedValue(mockLaws as never);

      const result = await service.findAll({ countryCode: 'KR' });

      expect(result).toHaveLength(1);
      expect(prisma.lawRegistry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ countryCode: 'KR' }),
        }),
      );
    });

    it('should filter by isActive', async () => {
      const mockLaws = [createMockLawRegistry({ isActive: true })];
      prisma.lawRegistry.findMany.mockResolvedValue(mockLaws as never);

      await service.findAll({ isActive: true });

      expect(prisma.lawRegistry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should order by code ascending', async () => {
      prisma.lawRegistry.findMany.mockResolvedValue([]);

      await service.findAll({});

      expect(prisma.lawRegistry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { code: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return cached law when available', async () => {
      const cachedLaw = {
        id: 'law-123',
        code: 'GDPR',
        name: 'GDPR',
      };
      cacheService.getLawById.mockResolvedValue(cachedLaw);

      const result = await service.findOne('law-123');

      expect(result).toEqual(cachedLaw);
      expect(prisma.lawRegistry.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      const mockLaw = createMockLawRegistry();
      cacheService.getLawById.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);

      const result = await service.findOne('law-123');

      expect(result.id).toBe(mockLaw.id);
      expect(cacheService.setLawById).toHaveBeenCalled();
    });

    it('should throw NotFoundException when law not found', async () => {
      cacheService.getLawById.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return cached law when available', async () => {
      const cachedLaw = {
        id: 'law-123',
        code: 'GDPR',
        name: 'GDPR',
      };
      cacheService.getLawByCode.mockResolvedValue(cachedLaw);

      const result = await service.findByCode('GDPR');

      expect(result).toEqual(cachedLaw);
      expect(prisma.lawRegistry.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      const mockLaw = createGdprLawRegistry();
      cacheService.getLawByCode.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);

      const result = await service.findByCode('GDPR');

      expect(result.code).toBe('GDPR');
      expect(cacheService.setLawByCode).toHaveBeenCalled();
    });

    it('should throw NotFoundException when law not found', async () => {
      cacheService.getLawByCode.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('NONEXISTENT')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update law registry entry', async () => {
      const mockLaw = createMockLawRegistry();
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue({
        ...mockLaw,
        name: 'Updated Name',
      } as never);

      const result = await service.update('law-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should update description', async () => {
      const mockLaw = createMockLawRegistry();
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue({
        ...mockLaw,
        description: 'New description',
      } as never);

      await service.update('law-123', { description: 'New description' });

      expect(prisma.lawRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'New description',
          }),
        }),
      );
    });

    it('should update effective date', async () => {
      const mockLaw = createMockLawRegistry();
      const newDate = new Date('2025-01-01');

      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue({
        ...mockLaw,
        effectiveDate: newDate,
      } as never);

      await service.update('law-123', { effectiveDate: newDate });

      expect(prisma.lawRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            effectiveDate: newDate,
          }),
        }),
      );
    });

    it('should update isActive flag', async () => {
      const mockLaw = createMockLawRegistry({ isActive: true });
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue({
        ...mockLaw,
        isActive: false,
      } as never);

      await service.update('law-123', { isActive: false });

      expect(prisma.lawRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it('should invalidate cache after update', async () => {
      const mockLaw = createMockLawRegistry();
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue(mockLaw as never);

      await service.update('law-123', { name: 'Updated' });

      expect(cacheService.invalidateLaw).toHaveBeenCalledWith('law-123', mockLaw.code);
    });

    it('should throw NotFoundException when law not found', async () => {
      prisma.lawRegistry.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete by setting isActive to false', async () => {
      const mockLaw = createMockLawRegistry({ isActive: true });
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue({
        ...mockLaw,
        isActive: false,
      } as never);

      await service.remove('law-123');

      expect(prisma.lawRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'law-123' },
          data: { isActive: false },
        }),
      );
    });

    it('should invalidate cache after removal', async () => {
      const mockLaw = createMockLawRegistry();
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);
      prisma.lawRegistry.update.mockResolvedValue({
        ...mockLaw,
        isActive: false,
      } as never);

      await service.remove('law-123');

      expect(cacheService.invalidateLaw).toHaveBeenCalledWith('law-123', mockLaw.code);
    });

    it('should throw NotFoundException when law not found', async () => {
      prisma.lawRegistry.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Major Privacy Laws', () => {
    it('should handle GDPR (EU)', async () => {
      const mockLaw = createGdprLawRegistry();
      cacheService.getLawByCode.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);

      const result = await service.findByCode('GDPR');

      expect(result.code).toBe('GDPR');
      expect(result.countryCode).toBe('EU');
    });

    it('should handle CCPA (US)', async () => {
      const mockLaw = createCcpaLawRegistry();
      cacheService.getLawByCode.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);

      const result = await service.findByCode('CCPA');

      expect(result.code).toBe('CCPA');
      expect(result.countryCode).toBe('US');
    });

    it('should handle PIPA (KR)', async () => {
      const mockLaw = createPipaLawRegistry();
      cacheService.getLawByCode.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);

      const result = await service.findByCode('PIPA');

      expect(result.code).toBe('PIPA');
      expect(result.countryCode).toBe('KR');
    });
  });

  describe('Response DTO Transformation', () => {
    it('should transform law registry to response DTO correctly', async () => {
      const mockLaw = createMockLawRegistry({
        id: 'law-123',
        code: 'GDPR',
        name: 'General Data Protection Regulation',
        description: 'EU data protection regulation',
        countryCode: 'EU',
        effectiveDate: new Date('2018-05-25'),
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      cacheService.getLawById.mockResolvedValue(undefined);
      prisma.lawRegistry.findUnique.mockResolvedValue(mockLaw as never);

      const result = await service.findOne('law-123');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'law-123',
          code: 'GDPR',
          name: 'General Data Protection Regulation',
          description: 'EU data protection regulation',
          countryCode: 'EU',
          isActive: true,
        }),
      );
    });
  });
});
