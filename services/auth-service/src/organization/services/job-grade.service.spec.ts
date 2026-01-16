import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JobGradeService } from './job-grade.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { JobFamily } from '../dto/job-grade.dto';

describe('JobGradeService', () => {
  let service: JobGradeService;

  const mockPrismaService = {
    jobGrade: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const mockJobGrade = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'IC5',
    name: 'Senior Engineer',
    job_family: JobFamily.ENGINEERING,
    level: 5,
    track: 'IC',
    description: 'Senior level individual contributor',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobGradeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<JobGradeService>(JobGradeService);

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a job grade successfully', async () => {
      const dto = {
        code: 'IC5',
        name: 'Senior Engineer',
        jobFamily: JobFamily.ENGINEERING,
        level: 5,
        track: 'IC',
        description: 'Senior level individual contributor',
      };

      mockPrismaService.jobGrade.findUnique.mockResolvedValue(null);
      mockPrismaService.jobGrade.create.mockResolvedValue(mockJobGrade);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
      expect(result.jobFamily).toBe(dto.jobFamily);
      expect(result.level).toBe(dto.level);
      expect(mockPrismaService.jobGrade.findUnique).toHaveBeenCalledWith({
        where: { code: dto.code },
      });
      expect(mockPrismaService.jobGrade.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'IC5',
        name: 'Senior Engineer',
        jobFamily: JobFamily.ENGINEERING,
        level: 5,
        track: 'IC',
      };

      mockPrismaService.jobGrade.findUnique.mockResolvedValue(mockJobGrade);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.jobGrade.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all job grades', async () => {
      const mockJobGrades = [mockJobGrade];
      mockPrismaService.jobGrade.findMany.mockResolvedValue(mockJobGrades);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('IC5');
      expect(mockPrismaService.jobGrade.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ level: 'asc' }, { track: 'asc' }],
      });
    });

    it('should filter by job family', async () => {
      const mockJobGrades = [mockJobGrade];
      mockPrismaService.jobGrade.findMany.mockResolvedValue(mockJobGrades);

      const result = await service.findAll({ jobFamily: JobFamily.ENGINEERING });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.jobGrade.findMany).toHaveBeenCalledWith({
        where: { job_family: JobFamily.ENGINEERING },
        orderBy: [{ level: 'asc' }, { track: 'asc' }],
      });
    });

    it('should filter by track', async () => {
      const mockJobGrades = [mockJobGrade];
      mockPrismaService.jobGrade.findMany.mockResolvedValue(mockJobGrades);

      const result = await service.findAll({ track: 'IC' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.jobGrade.findMany).toHaveBeenCalledWith({
        where: { track: 'IC' },
        orderBy: [{ level: 'asc' }, { track: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a job grade by ID', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(mockJobGrade);

      const result = await service.findOne(mockJobGrade.id);

      expect(result.id).toBe(mockJobGrade.id);
      expect(result.code).toBe('IC5');
      expect(mockPrismaService.jobGrade.findUnique).toHaveBeenCalledWith({
        where: { id: mockJobGrade.id },
      });
    });

    it('should throw NotFoundException if job grade not found', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return a job grade by code', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(mockJobGrade);

      const result = await service.findByCode('IC5');

      expect(result.code).toBe('IC5');
      expect(mockPrismaService.jobGrade.findUnique).toHaveBeenCalledWith({
        where: { code: 'IC5' },
      });
    });

    it('should throw NotFoundException if job grade not found', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job grade successfully', async () => {
      const updateDto = {
        name: 'Principal Engineer',
        description: 'Principal level IC',
      };

      const updatedJobGrade = {
        ...mockJobGrade,
        ...updateDto,
      };

      mockPrismaService.jobGrade.findUnique.mockResolvedValue(mockJobGrade);
      mockPrismaService.jobGrade.update.mockResolvedValue(updatedJobGrade);

      const result = await service.update(mockJobGrade.id, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(mockPrismaService.jobGrade.update).toHaveBeenCalledWith({
        where: { id: mockJobGrade.id },
        data: {
          name: updateDto.name,
          description: updateDto.description,
          is_active: undefined,
        },
      });
    });

    it('should throw NotFoundException if job grade not found', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.jobGrade.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a job grade successfully', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(mockJobGrade);
      mockPrismaService.jobGrade.delete.mockResolvedValue(mockJobGrade);

      await service.remove(mockJobGrade.id);

      expect(mockPrismaService.jobGrade.delete).toHaveBeenCalledWith({
        where: { id: mockJobGrade.id },
      });
    });

    it('should throw NotFoundException if job grade not found', async () => {
      mockPrismaService.jobGrade.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.jobGrade.delete).not.toHaveBeenCalled();
    });
  });
});
