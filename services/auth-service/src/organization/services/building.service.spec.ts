import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BuildingService } from './building.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('BuildingService', () => {
  let service: BuildingService;

  const mockPrismaService = {
    building: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    office: {
      findUnique: vi.fn(),
    },
    floor: {
      findMany: vi.fn(),
    },
  };

  const mockBuilding = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'SEL-A',
    name: 'Building A',
    office_id: 'office-id',
    address: '123 Main St',
    total_floors: 10,
    description: 'Main building',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BuildingService>(BuildingService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a building successfully', async () => {
      const dto = {
        code: 'SEL-A',
        name: 'Building A',
        officeId: 'office-id',
        totalFloors: 10,
      };

      mockPrismaService.building.findUnique.mockResolvedValue(null);
      mockPrismaService.office.findUnique.mockResolvedValue({ id: 'office-id' });
      mockPrismaService.building.create.mockResolvedValue(mockBuilding);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'SEL-A',
        name: 'Building A',
        officeId: 'office-id',
      };

      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if office not found', async () => {
      const dto = {
        code: 'SEL-A',
        name: 'Building A',
        officeId: 'invalid-id',
      };

      mockPrismaService.building.findUnique.mockResolvedValue(null);
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all buildings', async () => {
      mockPrismaService.building.findMany.mockResolvedValue([mockBuilding]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SEL-A');
    });
  });

  describe('findOne', () => {
    it('should return a building by ID', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);

      const result = await service.findOne(mockBuilding.id);

      expect(result.id).toBe(mockBuilding.id);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
