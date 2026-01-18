import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkAuthorizationService } from './work-authorization.service';
import { PrismaService } from '../../database/prisma.service';
import { work_permit_type, visa_status } from '@prisma/auth-client';

describe('WorkAuthorizationService', () => {
  let service: WorkAuthorizationService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    globalAssignment: {
      findUnique: vi.fn(),
    },
    workAuthorization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
        WorkAuthorizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkAuthorizationService>(WorkAuthorizationService);
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
      countryCode: 'GB',
      authorizationType: work_permit_type.WORK_VISA,
      visaType: 'Tier 2',
      startDate: new Date('2026-06-01'),
      expiryDate: new Date('2029-06-01'),
      allowedActivities: ['software development'],
    };

    it('should create a new work authorization', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.workAuthorization.create.mockResolvedValue({
        id: 'workauth-1',
        ...createDto,
        status: visa_status.PENDING,
        employerRestricted: true,
        renewable: true,
        renewalLeadDays: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('workauth-1');
      expect(result.status).toBe(visa_status.PENDING);
      expect(mockPrismaService.workAuthorization.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if expiry before start', async () => {
      const invalidDto = {
        ...createDto,
        startDate: new Date('2029-06-01'),
        expiryDate: new Date('2026-06-01'),
      };

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate global assignment exists if provided', async () => {
      const dtoWithAssignment = {
        ...createDto,
        globalAssignmentId: 'assignment-123',
      };

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });
      mockPrismaService.globalAssignment.findUnique.mockResolvedValue(null);

      await expect(service.create(dtoWithAssignment)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateExpiredAuthorizations', () => {
    it('should update expired authorizations', async () => {
      mockPrismaService.workAuthorization.updateMany.mockResolvedValue({
        count: 2,
      });

      const count = await service.updateExpiredAuthorizations();

      expect(count).toBe(2);
    });
  });

  describe('markExpiringSoon', () => {
    it('should mark authorizations expiring soon', async () => {
      mockPrismaService.workAuthorization.updateMany.mockResolvedValue({
        count: 3,
      });

      const count = await service.markExpiringSoon(90);

      expect(count).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete work authorization', async () => {
      mockPrismaService.workAuthorization.findUnique.mockResolvedValue({
        id: 'workauth-1',
        status: visa_status.PENDING,
      });

      mockPrismaService.workAuthorization.delete.mockResolvedValue({});

      await service.delete('workauth-1');

      expect(mockPrismaService.workAuthorization.delete).toHaveBeenCalledWith({
        where: { id: 'workauth-1' },
      });
    });

    it('should throw BadRequestException if authorization is active', async () => {
      mockPrismaService.workAuthorization.findUnique.mockResolvedValue({
        id: 'workauth-1',
        status: visa_status.ACTIVE,
      });

      await expect(service.delete('workauth-1')).rejects.toThrow(BadRequestException);
    });
  });
});
