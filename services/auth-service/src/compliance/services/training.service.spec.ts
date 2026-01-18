import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrainingService } from './training.service';
import { PrismaService } from '../../database/prisma.service';
import { training_status, training_type } from '../../../node_modules/.prisma/auth-client';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    adminTrainingRecord: {
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
        TrainingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
    prisma = module.get<PrismaService>(PrismaService);
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
      trainingType: training_type.SECURITY_AWARENESS,
      name: 'Security Basics',
      description: 'Basic security training',
      isMandatory: true,
      passingScore: 80,
    };

    it('should create a new training', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.adminTrainingRecord.create.mockResolvedValue({
        id: 'training-1',
        ...createDto,
        status: training_status.NOT_STARTED,
        isWaived: false,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('training-1');
      expect(result.status).toBe(training_status.NOT_STARTED);
      expect(mockPrismaService.adminTrainingRecord.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('start', () => {
    it('should start a training', async () => {
      mockPrismaService.adminTrainingRecord.findUnique.mockResolvedValue({
        id: 'training-1',
        status: training_status.NOT_STARTED,
      });

      mockPrismaService.adminTrainingRecord.update.mockResolvedValue({
        id: 'training-1',
        status: training_status.IN_PROGRESS,
        startedAt: new Date(),
      });

      const result = await service.start('training-1');

      expect(result.status).toBe(training_status.IN_PROGRESS);
    });

    it('should throw BadRequestException if already started', async () => {
      mockPrismaService.adminTrainingRecord.findUnique.mockResolvedValue({
        id: 'training-1',
        status: training_status.IN_PROGRESS,
      });

      await expect(service.start('training-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should complete a training with passing score', async () => {
      mockPrismaService.adminTrainingRecord.findUnique.mockResolvedValue({
        id: 'training-1',
        status: training_status.IN_PROGRESS,
        isWaived: false,
        passingScore: 80,
        recurrenceMonths: 12,
      });

      mockPrismaService.adminTrainingRecord.update.mockResolvedValue({
        id: 'training-1',
        status: training_status.COMPLETED,
        completedAt: new Date(),
        score: 90,
      });

      const result = await service.complete('training-1', { score: 90 });

      expect(result.status).toBe(training_status.COMPLETED);
      expect(result.score).toBe(90);
    });

    it('should fail training with failing score', async () => {
      mockPrismaService.adminTrainingRecord.findUnique.mockResolvedValue({
        id: 'training-1',
        status: training_status.IN_PROGRESS,
        isWaived: false,
        passingScore: 80,
      });

      mockPrismaService.adminTrainingRecord.update.mockResolvedValue({
        id: 'training-1',
        status: training_status.FAILED,
        completedAt: new Date(),
        score: 60,
      });

      const result = await service.complete('training-1', { score: 60 });

      expect(result.status).toBe(training_status.FAILED);
    });
  });

  describe('waive', () => {
    it('should waive a training', async () => {
      mockPrismaService.adminTrainingRecord.findUnique.mockResolvedValue({
        id: 'training-1',
        status: training_status.NOT_STARTED,
      });

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'waiver-123' });

      mockPrismaService.adminTrainingRecord.update.mockResolvedValue({
        id: 'training-1',
        status: training_status.WAIVED,
        isWaived: true,
        waivedBy: 'waiver-123',
      });

      const result = await service.waive('training-1', {
        waivedBy: 'waiver-123',
        waiverReason: 'Already certified',
      });

      expect(result.status).toBe(training_status.WAIVED);
      expect(result.isWaived).toBe(true);
    });
  });
});
