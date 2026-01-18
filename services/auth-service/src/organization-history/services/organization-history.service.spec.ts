import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationHistoryService } from './organization-history.service';
import { PrismaService } from '../../database/prisma.service';

describe('OrganizationHistoryService', () => {
  let service: OrganizationHistoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    adminOrganizationHistory: {
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
        OrganizationHistoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrganizationHistoryService>(OrganizationHistoryService);
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
      changeType: 'PROMOTION',
      previousJobTitle: 'Software Engineer',
      newJobTitle: 'Senior Software Engineer',
      effectiveDate: new Date('2026-03-01'),
      reason: 'Performance excellence',
    };

    it('should create a new organization history record', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.adminOrganizationHistory.create.mockResolvedValue({
        id: 'history-1',
        ...createDto,
        createdAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('history-1');
      expect(result.changeType).toBe('PROMOTION');
      expect(mockPrismaService.adminOrganizationHistory.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate requester if provided', async () => {
      const dtoWithRequester = {
        ...createDto,
        requestedBy: 'requester-123',
      };

      mockPrismaService.admins.findUnique
        .mockResolvedValueOnce({ id: 'admin-123' })
        .mockResolvedValueOnce(null);

      await expect(service.create(dtoWithRequester)).rejects.toThrow(NotFoundException);
    });

    it('should validate new manager if provided', async () => {
      const dtoWithManager = {
        ...createDto,
        newManagerId: 'manager-123',
      };

      mockPrismaService.admins.findUnique
        .mockResolvedValueOnce({ id: 'admin-123' })
        .mockResolvedValueOnce(null);

      await expect(service.create(dtoWithManager)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve an organization history record', async () => {
      mockPrismaService.adminOrganizationHistory.findUnique.mockResolvedValue({
        id: 'history-1',
        approvedBy: null,
      });

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'approver-123' });

      mockPrismaService.adminOrganizationHistory.update.mockResolvedValue({
        id: 'history-1',
        approvedBy: 'approver-123',
        approvedAt: new Date(),
      });

      const result = await service.approve('history-1', {
        approvedBy: 'approver-123',
      });

      expect(result.approvedBy).toBe('approver-123');
    });

    it('should throw BadRequestException if already approved', async () => {
      mockPrismaService.adminOrganizationHistory.findUnique.mockResolvedValue({
        id: 'history-1',
        approvedBy: 'existing-approver',
      });

      await expect(service.approve('history-1', { approvedBy: 'approver-123' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete organization history record', async () => {
      mockPrismaService.adminOrganizationHistory.findUnique.mockResolvedValue({
        id: 'history-1',
        approvedBy: null,
      });

      mockPrismaService.adminOrganizationHistory.delete.mockResolvedValue({});

      await service.delete('history-1');

      expect(mockPrismaService.adminOrganizationHistory.delete).toHaveBeenCalledWith({
        where: { id: 'history-1' },
      });
    });

    it('should throw BadRequestException if approved', async () => {
      mockPrismaService.adminOrganizationHistory.findUnique.mockResolvedValue({
        id: 'history-1',
        approvedBy: 'approver-123',
      });

      await expect(service.delete('history-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAdminHistory', () => {
    it('should return all history for an admin', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.adminOrganizationHistory.findMany.mockResolvedValue([
        {
          id: 'history-1',
          adminId: 'admin-123',
          changeType: 'PROMOTION',
          effectiveDate: new Date('2026-03-01'),
          createdAt: new Date(),
        },
        {
          id: 'history-2',
          adminId: 'admin-123',
          changeType: 'TRANSFER',
          effectiveDate: new Date('2025-01-01'),
          createdAt: new Date(),
        },
      ]);

      const result = await service.getAdminHistory('admin-123');

      expect(result).toHaveLength(2);
      expect(result[0].changeType).toBe('PROMOTION');
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.getAdminHistory('admin-999')).rejects.toThrow(NotFoundException);
    });
  });
});
