import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminProfileService } from './admin-profile.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeeType, EmploymentStatus, ProbationStatus } from '@my-girok/types';

describe('AdminProfileService', () => {
  let service: AdminProfileService;
  let prismaService: Mocked<PrismaService>;

  const mockAdminId = '01935c6d-c2d0-7abc-8def-1234567890ab';
  const mockAdmin = {
    id: mockAdminId,
    email: 'admin@example.com',
    name: 'Test Admin',
    scope: 'TENANT',
    tenant_id: 'tenant-id',
    role_id: 'role-id',
    is_active: true,
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    account_mode: 'SERVICE',
    country_code: 'KR',
    username: 'testadmin',
    external_id: 'ext-123',
    display_name: 'Test Admin Display',
    given_name: 'Test',
    family_name: 'Admin',
    native_given_name: '테스트',
    native_family_name: '관리자',
    nickname: 'tester',
    preferred_language: 'ko',
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    profile_url: null,
    profile_photo_url: null,
    employee_number: 'EMP-001',
    employee_type: 'REGULAR',
    employment_status: 'ACTIVE',
    lifecycle_status: 'ACTIVE',
    job_grade_id: 'grade-1',
    job_title: 'Senior Engineer',
    job_title_en: 'Senior Engineer',
    job_code: 'SE-001',
    job_family: 'ENGINEERING',
    organization_unit_id: 'org-1',
    cost_center: 'CC-001',
    manager_admin_id: 'manager-id',
    dotted_line_manager_id: null,
    direct_reports_count: 3,
    partner_company_id: null,
    partner_employee_id: null,
    partner_contract_end_date: null,
    hire_date: new Date('2020-01-01'),
    original_hire_date: new Date('2020-01-01'),
    start_date: new Date('2020-01-15'),
    onboarding_completed_at: new Date('2020-02-01'),
    probation_end_date: new Date('2020-04-01'),
    probation_status: 'PASSED',
    last_role_change_at: new Date('2022-01-01'),
    last_promotion_date: new Date('2022-01-01'),
    last_transfer_date: null,
    termination_date: null,
    last_working_day: null,
    termination_reason: null,
    termination_type: null,
    eligible_for_rehire: null,
    exit_interview_completed: null,
    phone_number: '010-1234-5678',
    phone_country_code: '+82',
    mobile_number: '010-1234-5678',
    mobile_country_code: '+82',
    work_phone: null,
    emergency_contact: {},
    roles: {
      id: 'role-id',
      name: 'admin',
      display_name: 'Administrator',
      level: 10,
    },
    tenants: {
      id: 'tenant-id',
      name: 'Test Tenant',
      slug: 'test-tenant',
      type: 'COMMERCE',
      status: 'ACTIVE',
    },
    admins: {
      id: 'manager-id',
      name: 'Manager Name',
      email: 'manager@example.com',
      job_title: 'Engineering Manager',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockPrismaService = {
      admins: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminProfileService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<AdminProfileService>(AdminProfileService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdminDetail', () => {
    it('should return admin detail with Phase 2 fields', async () => {
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.getAdminDetail(mockAdminId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockAdminId);
      expect(result.email).toBe('admin@example.com');
      expect(result.username).toBe('testadmin');
      expect(result.employeeNumber).toBe('EMP-001');
      expect(result.jobTitle).toBe('Senior Engineer');
      expect(result.role).toBeDefined();
      expect(result.role?.name).toBe('admin');
      expect(result.tenant).toBeDefined();
      expect(result.manager).toBeDefined();
    });

    it('should throw NotFoundException if admin not found', async () => {
      prismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.getAdminDetail(mockAdminId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateScimCore', () => {
    it('should update SCIM core attributes', async () => {
      prismaService.admins.findFirst.mockResolvedValue(null); // No duplicate username
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        username: 'newusername',
        displayName: 'New Display Name',
        givenName: 'New',
        familyName: 'Name',
      };

      const result = await service.updateScimCore(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if username already taken', async () => {
      prismaService.admins.findFirst.mockResolvedValue({
        id: 'other-admin-id',
        username: 'existingusername',
      });

      const dto = { username: 'existingusername' };

      await expect(service.updateScimCore(mockAdminId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEmployeeInfo', () => {
    it('should update employee info', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        employeeNumber: 'EMP-002',
        employeeType: EmployeeType.CONTRACT,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      const result = await service.updateEmployeeInfo(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateJobOrganization', () => {
    it('should update job and organization info', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        jobTitle: 'Lead Engineer',
        jobTitleEn: 'Lead Engineer',
        organizationUnitId: 'new-org-id',
        managerAdminId: 'new-manager-id',
        directReportsCount: 5,
      };

      const result = await service.updateJobOrganization(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateJoinerInfo', () => {
    it('should update joiner lifecycle info', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        hireDate: '2023-01-01',
        startDate: '2023-01-15',
        probationEndDate: '2023-04-01',
        probationStatus: ProbationStatus.IN_PROGRESS,
      };

      const result = await service.updateJoinerInfo(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateLeaverInfo', () => {
    it('should update leaver lifecycle info', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        terminationDate: '2024-12-31',
        lastWorkingDay: '2024-12-31',
        terminationReason: 'Resignation',
        terminationType: 'VOLUNTARY',
        eligibleForRehire: true,
        exitInterviewCompleted: true,
      };

      const result = await service.updateLeaverInfo(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateContactInfo', () => {
    it('should update contact information', async () => {
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        phoneNumber: '010-9876-5432',
        phoneCountryCode: '+82',
        mobileNumber: '010-9876-5432',
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '010-1111-2222',
          relationship: 'Spouse',
        },
      };

      const result = await service.updateContactInfo(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update multiple profile sections at once', async () => {
      prismaService.admins.findFirst.mockResolvedValue(null);
      prismaService.admins.update.mockResolvedValue(mockAdmin);
      prismaService.admins.findUnique.mockResolvedValue(mockAdmin);

      const dto = {
        scim: { displayName: 'Updated Name' },
        employee: { employeeType: EmployeeType.REGULAR },
        job: { jobTitle: 'Staff Engineer' },
      };

      const result = await service.updateProfile(mockAdminId, dto);

      expect(prismaService.admins.update).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });
});
