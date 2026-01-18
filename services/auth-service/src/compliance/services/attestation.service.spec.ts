import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { PrismaService } from '../../database/prisma.service';
import { attestation_status, attestation_type } from '../../../node_modules/.prisma/auth-client';

describe('AttestationService', () => {
  let service: AttestationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    adminAttestation: {
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
        AttestationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AttestationService>(AttestationService);
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
      attestationType: attestation_type.CODE_OF_CONDUCT,
      documentVersion: '1.0',
      dueDate: new Date('2026-03-01'),
      recurrenceMonths: 12,
    };

    it('should create a new attestation', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.adminAttestation.create.mockResolvedValue({
        id: 'attestation-1',
        ...createDto,
        status: attestation_status.PENDING,
        isWaived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('attestation-1');
      expect(result.status).toBe(attestation_status.PENDING);
      expect(mockPrismaService.adminAttestation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('complete', () => {
    it('should complete an attestation', async () => {
      mockPrismaService.adminAttestation.findUnique.mockResolvedValue({
        id: 'attestation-1',
        status: attestation_status.PENDING,
        isWaived: false,
        recurrenceMonths: 12,
      });

      mockPrismaService.adminAttestation.update.mockResolvedValue({
        id: 'attestation-1',
        status: attestation_status.COMPLETED,
        completedAt: new Date(),
      });

      const result = await service.complete('attestation-1', {
        ipAddress: '127.0.0.1',
      });

      expect(result.status).toBe(attestation_status.COMPLETED);
    });

    it('should throw BadRequestException if already completed', async () => {
      mockPrismaService.adminAttestation.findUnique.mockResolvedValue({
        id: 'attestation-1',
        status: attestation_status.COMPLETED,
      });

      await expect(service.complete('attestation-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('waive', () => {
    it('should waive an attestation', async () => {
      mockPrismaService.adminAttestation.findUnique.mockResolvedValue({
        id: 'attestation-1',
        status: attestation_status.PENDING,
      });

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'waiver-123' });

      mockPrismaService.adminAttestation.update.mockResolvedValue({
        id: 'attestation-1',
        status: attestation_status.WAIVED,
        isWaived: true,
        waivedBy: 'waiver-123',
      });

      const result = await service.waive('attestation-1', {
        waivedBy: 'waiver-123',
        waiverReason: 'Test waiver',
      });

      expect(result.status).toBe(attestation_status.WAIVED);
      expect(result.isWaived).toBe(true);
    });
  });

  describe('updateExpiredAttestations', () => {
    it('should update expired attestations', async () => {
      mockPrismaService.adminAttestation.updateMany.mockResolvedValue({
        count: 5,
      });

      const count = await service.updateExpiredAttestations();

      expect(count).toBe(5);
    });
  });
});
