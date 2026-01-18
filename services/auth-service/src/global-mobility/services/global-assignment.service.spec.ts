import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GlobalAssignmentService } from './global-assignment.service';
import { PrismaService } from '../../database/prisma.service';
import { assignment_type } from '@prisma/auth-client';

describe('GlobalAssignmentService', () => {
  let service: GlobalAssignmentService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    globalAssignment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return Promise.all(callback);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalAssignmentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GlobalAssignmentService>(GlobalAssignmentService);
    _prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      adminId: 'admin-123',
      assignmentType: assignment_type.LONG_TERM,
      homeCountryCode: 'US',
      hostCountryCode: 'GB',
      startDate: new Date('2026-06-01'),
      expectedEndDate: new Date('2027-06-01'),
    };

    it('should create a new global assignment', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.globalAssignment.create.mockResolvedValue({
        id: 'assignment-1',
        ...createDto,
        status: 'PLANNED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('assignment-1');
      expect(result.status).toBe('PLANNED');
      expect(mockPrismaService.globalAssignment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if end date before start', async () => {
      const invalidDto = {
        ...createDto,
        startDate: new Date('2027-06-01'),
        expectedEndDate: new Date('2026-06-01'),
      };

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve a global assignment', async () => {
      mockPrismaService.globalAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        status: 'PLANNED',
      });

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'approver-123' });

      mockPrismaService.globalAssignment.update.mockResolvedValue({
        id: 'assignment-1',
        status: 'APPROVED',
        approvedBy: 'approver-123',
        approvedAt: new Date(),
      });

      const result = await service.approve('assignment-1', {
        approvedBy: 'approver-123',
      });

      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe('approver-123');
    });

    it('should throw BadRequestException if not in PLANNED status', async () => {
      mockPrismaService.globalAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        status: 'ACTIVE',
      });

      await expect(service.approve('assignment-1', { approvedBy: 'approver-123' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a global assignment', async () => {
      mockPrismaService.globalAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        status: 'PLANNED',
      });

      mockPrismaService.globalAssignment.delete.mockResolvedValue({});

      await service.delete('assignment-1');

      expect(mockPrismaService.globalAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
    });

    it('should throw BadRequestException if assignment is active', async () => {
      mockPrismaService.globalAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        status: 'ACTIVE',
      });

      await expect(service.delete('assignment-1')).rejects.toThrow(BadRequestException);
    });
  });
});
