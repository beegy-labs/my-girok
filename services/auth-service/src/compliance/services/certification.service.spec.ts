import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CertificationService } from './certification.service';
import { PrismaService } from '../../database/prisma.service';
import { certification_status } from '../../../node_modules/.prisma/auth-client';

describe('CertificationService', () => {
  let service: CertificationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
    },
    adminCertification: {
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
        CertificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CertificationService>(CertificationService);
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
      name: 'AWS Solutions Architect',
      issuingOrganization: 'Amazon Web Services',
      issueDate: new Date('2025-01-01'),
      expiryDate: new Date('2027-01-01'),
    };

    it('should create a new certification', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      mockPrismaService.adminCertification.create.mockResolvedValue({
        id: 'cert-1',
        ...createDto,
        status: certification_status.ACTIVE,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('cert-1');
      expect(result.status).toBe(certification_status.ACTIVE);
      expect(mockPrismaService.adminCertification.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if expiry before issue', async () => {
      const invalidDto = {
        ...createDto,
        issueDate: new Date('2027-01-01'),
        expiryDate: new Date('2025-01-01'),
      };

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'admin-123' });

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verify', () => {
    it('should verify a certification', async () => {
      mockPrismaService.adminCertification.findUnique.mockResolvedValue({
        id: 'cert-1',
        isVerified: false,
      });

      mockPrismaService.admins.findUnique.mockResolvedValue({ id: 'verifier-123' });

      mockPrismaService.adminCertification.update.mockResolvedValue({
        id: 'cert-1',
        isVerified: true,
        verifiedBy: 'verifier-123',
        verifiedAt: new Date(),
      });

      const result = await service.verify('cert-1', {
        verifiedBy: 'verifier-123',
      });

      expect(result.isVerified).toBe(true);
    });

    it('should throw BadRequestException if already verified', async () => {
      mockPrismaService.adminCertification.findUnique.mockResolvedValue({
        id: 'cert-1',
        isVerified: true,
      });

      await expect(service.verify('cert-1', { verifiedBy: 'verifier-123' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateExpiredCertifications', () => {
    it('should update expired certifications', async () => {
      mockPrismaService.adminCertification.updateMany.mockResolvedValue({
        count: 3,
      });

      const count = await service.updateExpiredCertifications();

      expect(count).toBe(3);
    });
  });
});
