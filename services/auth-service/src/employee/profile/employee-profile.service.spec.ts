import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EmployeeProfileService } from './employee-profile.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminProfileService } from '../../admin/services/admin-profile.service';

describe('EmployeeProfileService', () => {
  let service: EmployeeProfileService;
  let prisma: PrismaService;
  let adminProfileService: AdminProfileService;

  const mockPrismaService = {
    admins: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockAdminProfileService = {
    getAdminDetail: vi.fn(),
    mapAdminToDetailResponse: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdminProfileService, useValue: mockAdminProfileService },
      ],
    }).compile();

    service = module.get<EmployeeProfileService>(EmployeeProfileService);
    prisma = module.get<PrismaService>(PrismaService);
    adminProfileService = module.get<AdminProfileService>(AdminProfileService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return employee profile', async () => {
      const employeeId = 'employee-123';
      const mockProfile = {
        id: employeeId,
        email: 'employee@example.com',
        name: 'Test Employee',
      };

      mockAdminProfileService.getAdminDetail.mockResolvedValue(mockProfile);

      const result = await service.getMyProfile(employeeId);

      expect(result).toEqual(mockProfile);
      expect(adminProfileService.getAdminDetail).toHaveBeenCalledWith(employeeId);
    });
  });

  describe('updateMyProfile', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      const employeeId = 'non-existent';
      const dto = { displayName: 'New Name' };

      mockPrismaService.admins.findUnique.mockResolvedValue(null);

      await expect(service.updateMyProfile(employeeId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.updateMyProfile(employeeId, dto)).rejects.toThrow('Employee not found');
    });

    it('should update employee profile with allowed fields', async () => {
      const employeeId = 'employee-123';
      const dto = {
        displayName: 'Updated Name',
        nickname: 'Nick',
        preferredLanguage: 'en',
        locale: 'en-US',
        timezone: 'Asia/Seoul',
        phoneNumber: '010-1234-5678',
        emergencyContact: { name: 'Emergency Contact', phone: '010-9876-5432' },
      };

      const existingEmployee = {
        id: employeeId,
        email: 'employee@example.com',
        name: 'Test Employee',
      };

      const updatedEmployee = {
        ...existingEmployee,
        ...dto,
        roles: { id: 'role-123', name: 'employee' },
        tenants: null,
        admins: null,
      };

      const expectedResponse = {
        id: employeeId,
        email: 'employee@example.com',
        name: 'Test Employee',
        displayName: 'Updated Name',
      };

      mockPrismaService.admins.findUnique.mockResolvedValue(existingEmployee);
      mockPrismaService.admins.update.mockResolvedValue(updatedEmployee);
      mockAdminProfileService.mapAdminToDetailResponse.mockReturnValue(expectedResponse);

      const result = await service.updateMyProfile(employeeId, dto);

      expect(result).toEqual(expectedResponse);
      expect(prisma.admins.update).toHaveBeenCalledWith({
        where: { id: employeeId },
        data: {
          display_name: dto.displayName,
          nickname: dto.nickname,
          preferred_language: dto.preferredLanguage,
          locale: dto.locale,
          timezone: dto.timezone,
          profile_url: undefined,
          profile_photo_url: undefined,
          phone_number: dto.phoneNumber,
          phone_country_code: undefined,
          mobile_number: undefined,
          mobile_country_code: undefined,
          emergency_contact: dto.emergencyContact,
        },
        include: expect.any(Object),
      });
    });

    it('should not update restricted fields', async () => {
      const employeeId = 'employee-123';
      const dto = {
        displayName: 'Updated Name',
        // These fields should not be updated by employees
        // email, employeeNumber, jobTitle, etc.
      };

      const existingEmployee = {
        id: employeeId,
        email: 'employee@example.com',
        name: 'Test Employee',
        employee_number: 'EMP001',
        job_title: 'Software Engineer',
      };

      const updatedEmployee = {
        ...existingEmployee,
        display_name: 'Updated Name',
        roles: null,
        tenants: null,
        admins: null,
      };

      mockPrismaService.admins.findUnique.mockResolvedValue(existingEmployee);
      mockPrismaService.admins.update.mockResolvedValue(updatedEmployee);
      mockAdminProfileService.mapAdminToDetailResponse.mockReturnValue(updatedEmployee);

      await service.updateMyProfile(employeeId, dto);

      const updateCall = mockPrismaService.admins.update.mock.calls[0][0];

      // Verify that restricted fields are not in the update data
      expect(updateCall.data).not.toHaveProperty('email');
      expect(updateCall.data).not.toHaveProperty('employee_number');
      expect(updateCall.data).not.toHaveProperty('job_title');
      expect(updateCall.data).not.toHaveProperty('employment_status');
    });
  });
});
