import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PartnerCompanyService } from './partner-company.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PartnerType } from '../dto/partner-company.dto';

describe('PartnerCompanyService', () => {
  let service: PartnerCompanyService;

  const mockPrismaService = {
    partnerCompany: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    partnerServiceAgreement: {
      findMany: vi.fn(),
    },
  };

  const mockPartnerCompany = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'ACME',
    name: 'ACME Corporation',
    partner_type: PartnerType.VENDOR,
    contact_email: 'contact@acme.com',
    contact_phone: '+1-555-1234',
    contact_person: 'John Doe',
    tax_id: '123-45-67890',
    address: '123 Partner St',
    description: 'Primary vendor',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerCompanyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PartnerCompanyService>(PartnerCompanyService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a partner company successfully', async () => {
      const dto = {
        code: 'ACME',
        name: 'ACME Corporation',
        partnerType: PartnerType.VENDOR,
      };

      mockPrismaService.partnerCompany.findUnique.mockResolvedValue(null);
      mockPrismaService.partnerCompany.create.mockResolvedValue(mockPartnerCompany);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'ACME',
        name: 'ACME Corporation',
        partnerType: PartnerType.VENDOR,
      };

      mockPrismaService.partnerCompany.findUnique.mockResolvedValue(mockPartnerCompany);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all partner companies', async () => {
      mockPrismaService.partnerCompany.findMany.mockResolvedValue([mockPartnerCompany]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ACME');
    });

    it('should filter by partner type', async () => {
      mockPrismaService.partnerCompany.findMany.mockResolvedValue([mockPartnerCompany]);

      const result = await service.findAll({ partnerType: PartnerType.VENDOR });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.partnerCompany.findMany).toHaveBeenCalledWith({
        where: { partner_type: PartnerType.VENDOR },
        orderBy: [{ name: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a partner company by ID', async () => {
      mockPrismaService.partnerCompany.findUnique.mockResolvedValue(mockPartnerCompany);

      const result = await service.findOne(mockPartnerCompany.id);

      expect(result.id).toBe(mockPartnerCompany.id);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.partnerCompany.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a partner company successfully', async () => {
      const updateDto = {
        name: 'ACME Corp Updated',
      };

      const updatedPartnerCompany = {
        ...mockPartnerCompany,
        ...updateDto,
      };

      mockPrismaService.partnerCompany.findUnique.mockResolvedValue(mockPartnerCompany);
      mockPrismaService.partnerCompany.update.mockResolvedValue(updatedPartnerCompany);

      const result = await service.update(mockPartnerCompany.id, updateDto);

      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('should delete a partner company successfully', async () => {
      mockPrismaService.partnerCompany.findUnique.mockResolvedValue(mockPartnerCompany);
      mockPrismaService.partnerCompany.delete.mockResolvedValue(mockPartnerCompany);

      await service.remove(mockPartnerCompany.id);

      expect(mockPrismaService.partnerCompany.delete).toHaveBeenCalledWith({
        where: { id: mockPartnerCompany.id },
      });
    });
  });
});
