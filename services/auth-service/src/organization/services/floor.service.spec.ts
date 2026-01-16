import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FloorService } from './floor.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('FloorService', () => {
  let service: FloorService;

  const mockPrismaService = {
    floor: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    building: {
      findUnique: vi.fn(),
    },
  };

  const mockFloor = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'SEL-A-5F',
    name: '5th Floor',
    building_id: 'building-id',
    floor_number: 5,
    floor_area: 1000,
    description: 'Engineering team floor',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FloorService>(FloorService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a floor successfully', async () => {
      const dto = {
        code: 'SEL-A-5F',
        name: '5th Floor',
        buildingId: 'building-id',
        floorNumber: 5,
      };

      mockPrismaService.floor.findUnique.mockResolvedValue(null);
      mockPrismaService.building.findUnique.mockResolvedValue({ id: 'building-id' });
      mockPrismaService.floor.create.mockResolvedValue(mockFloor);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'SEL-A-5F',
        name: '5th Floor',
        buildingId: 'building-id',
        floorNumber: 5,
      };

      mockPrismaService.floor.findUnique.mockResolvedValue(mockFloor);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if building not found', async () => {
      const dto = {
        code: 'SEL-A-5F',
        name: '5th Floor',
        buildingId: 'invalid-id',
        floorNumber: 5,
      };

      mockPrismaService.floor.findUnique.mockResolvedValue(null);
      mockPrismaService.building.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all floors', async () => {
      mockPrismaService.floor.findMany.mockResolvedValue([mockFloor]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SEL-A-5F');
    });
  });

  describe('findOne', () => {
    it('should return a floor by ID', async () => {
      mockPrismaService.floor.findUnique.mockResolvedValue(mockFloor);

      const result = await service.findOne(mockFloor.id);

      expect(result.id).toBe(mockFloor.id);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.floor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
