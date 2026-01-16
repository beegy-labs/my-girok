import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OfficeService } from './office.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OfficeType } from '../dto/office.dto';

describe('OfficeService', () => {
  let service: OfficeService;

  const mockPrismaService = {
    office: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    legalEntity: {
      findUnique: vi.fn(),
    },
    building: {
      findMany: vi.fn(),
    },
  };

  const mockOffice = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'SEL-HQ',
    name: 'Seoul Headquarters',
    office_type: OfficeType.HEADQUARTERS,
    legal_entity_id: 'legal-entity-id',
    country_code: 'KR',
    city: 'Seoul',
    address: '123 Main St',
    phone_number: '+82-2-1234-5678',
    description: 'Main office',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OfficeService>(OfficeService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an office successfully', async () => {
      const dto = {
        code: 'SEL-HQ',
        name: 'Seoul Headquarters',
        officeType: OfficeType.HEADQUARTERS,
        legalEntityId: 'legal-entity-id',
        countryCode: 'KR',
      };

      mockPrismaService.office.findUnique.mockResolvedValue(null);
      mockPrismaService.legalEntity.findUnique.mockResolvedValue({ id: 'legal-entity-id' });
      mockPrismaService.office.create.mockResolvedValue(mockOffice);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'SEL-HQ',
        name: 'Seoul Headquarters',
        officeType: OfficeType.HEADQUARTERS,
        legalEntityId: 'legal-entity-id',
        countryCode: 'KR',
      };

      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if legal entity not found', async () => {
      const dto = {
        code: 'SEL-HQ',
        name: 'Seoul Headquarters',
        officeType: OfficeType.HEADQUARTERS,
        legalEntityId: 'invalid-id',
        countryCode: 'KR',
      };

      mockPrismaService.office.findUnique.mockResolvedValue(null);
      mockPrismaService.legalEntity.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all offices', async () => {
      mockPrismaService.office.findMany.mockResolvedValue([mockOffice]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SEL-HQ');
    });
  });

  describe('findOne', () => {
    it('should return an office by ID', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);

      const result = await service.findOne(mockOffice.id);

      expect(result.id).toBe(mockOffice.id);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an office successfully', async () => {
      const updateDto = {
        name: 'Seoul Main Office',
      };

      const updatedOffice = {
        ...mockOffice,
        ...updateDto,
      };

      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.office.update.mockResolvedValue(updatedOffice);

      const result = await service.update(mockOffice.id, updateDto);

      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('should delete an office successfully', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.office.delete.mockResolvedValue(mockOffice);

      await service.remove(mockOffice.id);

      expect(mockPrismaService.office.delete).toHaveBeenCalledWith({
        where: { id: mockOffice.id },
      });
    });
  });
});
