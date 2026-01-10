import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LawRegistryController } from './law-registry.controller';
import { LawRegistryService } from '../services/law-registry.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  CreateLawDto,
  UpdateLawDto,
  LawQueryDto,
  LawResponse,
  LawListResponse,
  ConsentRequirementResponse,
  LawRequirements,
} from '../dto/law-registry.dto';

describe('LawRegistryController', () => {
  let controller: LawRegistryController;
  let mockLawRegistryService: {
    findAll: Mock;
    findByCode: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
    getConsentRequirements: Mock;
    seedDefaultLaws: Mock;
  };

  const mockRequirements: LawRequirements = {
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'] as any[],
    optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH'] as any[],
    specialRequirements: {
      nightTimePush: { start: 21, end: 8 },
      dataRetention: { maxDays: 365 },
      minAge: 14,
    },
  };

  const mockLaw: LawResponse = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    code: 'PIPL-KR',
    countryCode: 'KR',
    name: 'Personal Information Protection Act (Korea)',
    requirements: mockRequirements,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockLawRegistryService = {
      findAll: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getConsentRequirements: vi.fn(),
      seedDefaultLaws: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LawRegistryController],
      providers: [
        { provide: LawRegistryService, useValue: mockLawRegistryService },
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LawRegistryController>(LawRegistryController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return list of laws', async () => {
      const query: LawQueryDto = { page: 1, limit: 10 };
      const expectedResponse: LawListResponse = {
        data: [mockLaw],
        meta: { total: 1, page: 1, limit: 10 },
      };
      mockLawRegistryService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResponse);
      expect(mockLawRegistryService.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by country code', async () => {
      const query: LawQueryDto = { countryCode: 'KR' };
      mockLawRegistryService.findAll.mockResolvedValue({
        data: [mockLaw],
        meta: { total: 1, page: 1, limit: 20 },
      });

      await controller.findAll(query);

      expect(mockLawRegistryService.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by active status', async () => {
      const query: LawQueryDto = { isActive: true };
      mockLawRegistryService.findAll.mockResolvedValue({
        data: [mockLaw],
        meta: { total: 1, page: 1, limit: 20 },
      });

      await controller.findAll(query);

      expect(mockLawRegistryService.findAll).toHaveBeenCalledWith(query);
    });

    it('should return empty list when no laws match', async () => {
      const query: LawQueryDto = { countryCode: 'XX' };
      mockLawRegistryService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      });

      const result = await controller.findAll(query);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findByCode', () => {
    it('should return a law by code', async () => {
      mockLawRegistryService.findByCode.mockResolvedValue(mockLaw);

      const result = await controller.findByCode('PIPL-KR');

      expect(result).toEqual(mockLaw);
      expect(mockLawRegistryService.findByCode).toHaveBeenCalledWith('PIPL-KR');
    });
  });

  describe('create', () => {
    it('should create a new law', async () => {
      const dto: CreateLawDto = {
        code: 'GDPR',
        countryCode: 'EU',
        name: 'General Data Protection Regulation',
        requirements: {
          requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'] as any[],
          optionalConsents: ['MARKETING_EMAIL'] as any[],
          specialRequirements: {
            dataRetention: { maxDays: 730 },
            crossBorderTransfer: { requireExplicit: true },
          },
        },
        isActive: true,
      };
      const newLaw = {
        ...mockLaw,
        id: '550e8400-e29b-41d4-a716-446655440099',
        code: 'GDPR',
        countryCode: 'EU',
        name: 'General Data Protection Regulation',
      };
      mockLawRegistryService.create.mockResolvedValue(newLaw);

      const result = await controller.create(dto);

      expect(result.code).toBe('GDPR');
      expect(mockLawRegistryService.create).toHaveBeenCalledWith(dto);
    });

    it('should create law with minimal requirements', async () => {
      const dto: CreateLawDto = {
        code: 'SIMPLE-LAW',
        countryCode: 'US',
        name: 'Simple Privacy Law',
        requirements: {
          requiredConsents: ['TERMS_OF_SERVICE'] as any[],
          optionalConsents: [],
        },
      };
      const newLaw = { ...mockLaw, ...dto };
      mockLawRegistryService.create.mockResolvedValue(newLaw);

      await controller.create(dto);

      expect(mockLawRegistryService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a law', async () => {
      const dto: UpdateLawDto = {
        name: 'Updated PIPL',
        isActive: false,
      };
      const updatedLaw = { ...mockLaw, name: 'Updated PIPL', isActive: false };
      mockLawRegistryService.update.mockResolvedValue(updatedLaw);

      const result = await controller.update('PIPL-KR', dto);

      expect(result.name).toBe('Updated PIPL');
      expect(result.isActive).toBe(false);
      expect(mockLawRegistryService.update).toHaveBeenCalledWith('PIPL-KR', dto);
    });

    it('should update law requirements', async () => {
      const dto: UpdateLawDto = {
        requirements: {
          requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'PERSONALIZED_ADS'] as any[],
          optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH', 'MARKETING_SMS'] as any[],
          specialRequirements: {
            nightTimePush: { start: 22, end: 7 },
            minAge: 16,
          },
        },
      };
      const updatedLaw = { ...mockLaw, requirements: dto.requirements };
      mockLawRegistryService.update.mockResolvedValue(updatedLaw);

      const result = await controller.update('PIPL-KR', dto);

      expect(result.requirements.requiredConsents).toContain('PERSONALIZED_ADS');
    });
  });

  describe('delete', () => {
    it('should delete a law', async () => {
      mockLawRegistryService.delete.mockResolvedValue(undefined);

      await controller.delete('PIPL-KR');

      expect(mockLawRegistryService.delete).toHaveBeenCalledWith('PIPL-KR');
    });
  });

  describe('getConsentRequirements', () => {
    it('should return consent requirements for a law', async () => {
      const requirements: ConsentRequirementResponse[] = [
        {
          consentType: 'TERMS_OF_SERVICE' as any,
          isRequired: true,
          source: 'LAW',
          lawCode: 'PIPL-KR',
        },
        {
          consentType: 'PRIVACY_POLICY' as any,
          isRequired: true,
          source: 'LAW',
          lawCode: 'PIPL-KR',
        },
        {
          consentType: 'MARKETING_EMAIL' as any,
          isRequired: false,
          source: 'LAW',
          lawCode: 'PIPL-KR',
        },
      ];
      mockLawRegistryService.getConsentRequirements.mockResolvedValue(requirements);

      const result = await controller.getConsentRequirements('PIPL-KR');

      expect(result).toEqual(requirements);
      expect(result).toHaveLength(3);
      expect(mockLawRegistryService.getConsentRequirements).toHaveBeenCalledWith('PIPL-KR');
    });

    it('should distinguish required and optional consents', async () => {
      const requirements: ConsentRequirementResponse[] = [
        {
          consentType: 'TERMS_OF_SERVICE' as any,
          isRequired: true,
          source: 'LAW',
          lawCode: 'GDPR',
        },
        {
          consentType: 'MARKETING_EMAIL' as any,
          isRequired: false,
          source: 'LAW',
          lawCode: 'GDPR',
        },
      ];
      mockLawRegistryService.getConsentRequirements.mockResolvedValue(requirements);

      const result = await controller.getConsentRequirements('GDPR');

      const required = result.filter((r) => r.isRequired);
      const optional = result.filter((r) => !r.isRequired);
      expect(required).toHaveLength(1);
      expect(optional).toHaveLength(1);
    });
  });

  describe('seedDefaultLaws', () => {
    it('should seed default laws', async () => {
      mockLawRegistryService.seedDefaultLaws.mockResolvedValue(undefined);

      await controller.seedDefaultLaws();

      expect(mockLawRegistryService.seedDefaultLaws).toHaveBeenCalled();
    });
  });
});
