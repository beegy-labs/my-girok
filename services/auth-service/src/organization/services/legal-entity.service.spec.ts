import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LegalEntityService } from './legal-entity.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('LegalEntityService', () => {
  let service: LegalEntityService;

  const mockPrismaService = {
    legal_entities: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const mockLegalEntity = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'BEEGY-KR',
    name: 'Beegy Korea Inc.',
    legal_name: 'Beegy Korea Inc.',
    country_code: 'KR',
    tax_id: '123-45-67890',
    registered_address: '123 Main St, Seoul, South Korea',
    description: 'Primary operating entity in Korea',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalEntityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LegalEntityService>(LegalEntityService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a legal entity successfully', async () => {
      const dto = {
        code: 'BEEGY-KR',
        name: 'Beegy Korea Inc.',
        legalName: 'Beegy Korea Inc.',
        countryCode: 'KR',
        taxId: '123-45-67890',
      };

      mockPrismaService.legal_entities.findUnique.mockResolvedValue(null);
      mockPrismaService.legal_entities.create.mockResolvedValue(mockLegalEntity);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
      expect(mockPrismaService.legal_entities.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'BEEGY-KR',
        name: 'Beegy Korea Inc.',
        legalName: 'Beegy Korea Inc.',
        countryCode: 'KR',
      };

      mockPrismaService.legal_entities.findUnique.mockResolvedValue(mockLegalEntity);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.legal_entities.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all legal entities', async () => {
      mockPrismaService.legal_entities.findMany.mockResolvedValue([mockLegalEntity]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('BEEGY-KR');
    });

    it('should filter by country code', async () => {
      mockPrismaService.legal_entities.findMany.mockResolvedValue([mockLegalEntity]);

      const result = await service.findAll({ countryCode: 'KR' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.legal_entities.findMany).toHaveBeenCalledWith({
        where: { country_code: 'KR' },
        orderBy: [{ name: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a legal entity by ID', async () => {
      mockPrismaService.legal_entities.findUnique.mockResolvedValue(mockLegalEntity);

      const result = await service.findOne(mockLegalEntity.id);

      expect(result.id).toBe(mockLegalEntity.id);
      expect(result.code).toBe('BEEGY-KR');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.legal_entities.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a legal entity successfully', async () => {
      const updateDto = {
        name: 'Beegy Korea Limited',
        description: 'Updated description',
      };

      const updatedLegalEntity = {
        ...mockLegalEntity,
        ...updateDto,
      };

      mockPrismaService.legal_entities.findUnique.mockResolvedValue(mockLegalEntity);
      mockPrismaService.legal_entities.update.mockResolvedValue(updatedLegalEntity);

      const result = await service.update(mockLegalEntity.id, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.legal_entities.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.legal_entities.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a legal entity successfully', async () => {
      mockPrismaService.legal_entities.findUnique.mockResolvedValue(mockLegalEntity);
      mockPrismaService.legal_entities.delete.mockResolvedValue(mockLegalEntity);

      await service.remove(mockLegalEntity.id);

      expect(mockPrismaService.legal_entities.delete).toHaveBeenCalledWith({
        where: { id: mockLegalEntity.id },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.legal_entities.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.legal_entities.delete).not.toHaveBeenCalled();
    });
  });
});
