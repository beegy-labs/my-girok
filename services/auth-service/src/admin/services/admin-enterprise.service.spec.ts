import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminEnterpriseService } from './admin-enterprise.service';
import { AdminProfileService } from './admin-profile.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IdentityType,
  ServiceAccountType,
  NhiCredentialType,
  SecurityClearance,
  DataAccessLevel,
  VerificationMethod,
  VerificationLevel,
} from '@my-girok/types';

describe('AdminEnterpriseService', () => {
  let service: AdminEnterpriseService;
  let prismaService: Mocked<PrismaService>;
  let adminProfileService: Mocked<AdminProfileService>;

  const mockAdminId = '01935c6d-c2d0-7abc-8def-1234567890ab';
  const mockNhiId = '01935c6d-c2d0-7abc-8def-nhi123456789';
  const mockCreatedBy = '01935c6d-c2d0-7abc-8def-creator123456';

  const mockAdmin = {
    id: mockAdminId,
    email: 'admin@example.com',
    name: 'Test Admin',
    identity_type: 'HUMAN',
  };

  const mockNhi = {
    id: mockNhiId,
    email: 'nhi@example.com',
    name: 'Test NHI',
    identity_type: 'SERVICE_ACCOUNT',
    owner_admin_id: mockAdminId,
    service_account_type: 'CI_CD',
    credential_type: 'API_KEY',
  };

  const mockRole = {
    id: 'role-id',
    name: 'NHI_SERVICE_ACCOUNT',
  };

  const mockAdminDetail = {
    id: mockAdminId,
    email: 'admin@example.com',
    name: 'Test Admin',
    scope: 'TENANT',
    tenantId: null,
    roleId: 'role-id',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountMode: 'SERVICE',
    countryCode: 'KR',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockPrismaService = {
      admins: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      roles: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const mockAdminProfileService = {
      getAdminDetail: vi.fn(),
      mapAdminToDetailResponse: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminEnterpriseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdminProfileService, useValue: mockAdminProfileService },
      ],
    }).compile();

    service = module.get<AdminEnterpriseService>(AdminEnterpriseService);
    prismaService = module.get(PrismaService);
    adminProfileService = module.get(AdminProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNhi', () => {
    it('should create a new NHI', async () => {
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);
      prismaService.roles.findFirst.mockResolvedValue(mockRole);
      prismaService.admins.create.mockResolvedValue(mockNhi);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const dto = {
        email: 'nhi@example.com',
        name: 'Test NHI',
        identityType: IdentityType.SERVICE_ACCOUNT,
        ownerAdminId: mockAdminId,
        nhiPurpose: 'CI/CD Pipeline',
        serviceAccountType: ServiceAccountType.CI_CD,
        credentialType: NhiCredentialType.API_KEY,
        secretRotationDays: 90,
      };

      const result = await service.createNhi(dto, mockCreatedBy);

      expect(prismaService.admins.findUnique).toHaveBeenCalledWith({
        where: { id: mockAdminId },
      });
      expect(prismaService.admins.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if trying to create NHI with HUMAN type', async () => {
      const dto = {
        email: 'human@example.com',
        name: 'Not NHI',
        identityType: IdentityType.HUMAN,
        ownerAdminId: mockAdminId,
        nhiPurpose: 'Should fail',
      };

      await expect(service.createNhi(dto, mockCreatedBy)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if owner admin not found', async () => {
      prismaService.admins.findUnique.mockResolvedValue(null);

      const dto = {
        email: 'nhi@example.com',
        name: 'Test NHI',
        identityType: IdentityType.SERVICE_ACCOUNT,
        ownerAdminId: 'non-existent-id',
        nhiPurpose: 'Test',
      };

      await expect(service.createNhi(dto, mockCreatedBy)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNhiAttributes', () => {
    it('should update NHI attributes', async () => {
      prismaService.admins.update.mockResolvedValue(mockNhi);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const dto = {
        nhiPurpose: 'Updated Purpose',
        serviceAccountType: ServiceAccountType.MONITORING,
        secretRotationDays: 60,
      };

      const result = await service.updateNhiAttributes(mockNhiId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('rotateNhiCredentials', () => {
    it('should rotate NHI credentials', async () => {
      const nhiAdmin = { ...mockAdmin, identity_type: 'SERVICE_ACCOUNT' };
      prismaService.admins.findUnique.mockResolvedValue(nhiAdmin);
      prismaService.admins.update.mockResolvedValue(nhiAdmin);

      const result = await service.rotateNhiCredentials(mockNhiId);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result.rotatedAt).toBeDefined();
      expect(result.rotatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if admin not found', async () => {
      prismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.rotateNhiCredentials(mockNhiId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trying to rotate credentials for HUMAN', async () => {
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.rotateNhiCredentials(mockAdminId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePhysicalLocation', () => {
    it('should update physical location', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const dto = {
        legalEntityId: 'entity-1',
        primaryOfficeId: 'office-1',
        buildingId: 'building-1',
        floorId: 'floor-3',
        deskCode: 'D-301',
      };

      const result = await service.updatePhysicalLocation(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateAccessControl', () => {
    it('should update access control settings', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const dto = {
        securityClearance: SecurityClearance.CONFIDENTIAL,
        dataAccessLevel: DataAccessLevel.DEPARTMENT,
        allowedIpRanges: ['10.0.0.0/8', '192.168.1.0/24'],
      };

      const result = await service.updateAccessControl(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('verifyIdentity', () => {
    it('should verify admin identity and update verification status', async () => {
      prismaService.admins.findUnique.mockResolvedValue({
        ...mockAdmin,
        metadata: {},
      });
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const dto = {
        method: VerificationMethod.DOCUMENT,
        level: VerificationLevel.STANDARD,
        documentId: 'DOC-123',
      };

      const result = await service.verifyIdentity(mockAdminId, dto, mockCreatedBy);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateExtensions', () => {
    it('should update JSONB extension attributes', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const dto = {
        skills: [
          { name: 'TypeScript', level: 'EXPERT' as const, yearsOfExperience: 5 },
          { name: 'React', level: 'ADVANCED' as const, yearsOfExperience: 4 },
        ],
        certifications: [
          {
            name: 'AWS Solutions Architect',
            issuer: 'Amazon',
            issuedAt: '2023-01-01',
          },
        ],
      };

      const result = await service.updateExtensions(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('listAdmins', () => {
    it('should list admins with pagination', async () => {
      const mockAdmins = [mockAdmin, { ...mockAdmin, id: 'admin-2' }];
      prismaService.$transaction.mockResolvedValue([mockAdmins, 2]);
      adminProfileService.mapAdminToDetailResponse
        .mockReturnValueOnce(mockAdminDetail as any)
        .mockReturnValueOnce({ ...mockAdminDetail, id: 'admin-2' } as any);

      const query = {
        page: 1,
        limit: 20,
      };

      const result = await service.listAdmins(query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by identity type', async () => {
      const mockNhiList = [mockNhi];
      prismaService.$transaction.mockResolvedValue([mockNhiList, 1]);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const query = {
        page: 1,
        limit: 20,
        identityType: IdentityType.SERVICE_ACCOUNT,
      };

      const result = await service.listAdmins(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search by name, email, or username', async () => {
      const mockAdmins = [mockAdmin];
      prismaService.$transaction.mockResolvedValue([mockAdmins, 1]);
      adminProfileService.mapAdminToDetailResponse.mockReturnValue(mockAdminDetail as any);

      const query = {
        page: 1,
        limit: 20,
        search: 'test',
      };

      const result = await service.listAdmins(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
