import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceTesterController } from './service-tester.controller';
import { ServiceTesterService } from '../services/service-tester.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  CreateTesterUserDto,
  UpdateTesterUserDto,
  DeleteTesterDto,
  CreateTesterAdminDto,
  ListTesterUsersQueryDto,
  TesterUserResponseDto,
  TesterAdminResponseDto,
  TesterUserListResponseDto,
  TesterAdminListResponseDto,
} from '../dto/service-tester.dto';
import { AdminPayload } from '../types/admin.types';

describe('ServiceTesterController', () => {
  let controller: ServiceTesterController;
  let mockTesterService: {
    listUserTesters: Mock;
    getUserTester: Mock;
    createUserTester: Mock;
    updateUserTester: Mock;
    deleteUserTester: Mock;
    listAdminTesters: Mock;
    createAdminTester: Mock;
    deleteAdminTester: Mock;
  };

  const mockServiceId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
  const mockAdminId = '550e8400-e29b-41d4-a716-446655440003';

  const mockAdmin: AdminPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@example.com',
    name: 'Super Admin',
    type: 'ADMIN_ACCESS',
    accountMode: 'SERVICE',
    scope: 'SYSTEM',
    tenantId: null,
    roleId: '550e8400-e29b-41d4-a716-446655440100',
    roleName: 'SUPER_ADMIN',
    level: 0,
    permissions: ['*'],
    services: {},
  };

  const mockUserTester: TesterUserResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    serviceId: mockServiceId,
    userId: mockUserId,
    user: {
      id: mockUserId,
      email: 'tester@example.com',
      name: 'Test User',
      avatar: null,
    },
    bypassAll: false,
    bypassDomain: true,
    bypassIP: false,
    bypassRate: true,
    note: 'QA team member',
    expiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    createdBy: mockAdmin.sub,
    updatedAt: new Date('2024-01-01'),
  };

  const mockAdminTester: TesterAdminResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    serviceId: mockServiceId,
    adminId: mockAdminId,
    admin: {
      id: mockAdminId,
      email: 'test-admin@example.com',
      name: 'Test Admin',
    },
    bypassAll: true,
    bypassDomain: false,
    note: 'Development admin',
    expiresAt: null,
    createdAt: new Date('2024-01-01'),
    createdBy: mockAdmin.sub,
  };

  beforeEach(async () => {
    mockTesterService = {
      listUserTesters: vi.fn(),
      getUserTester: vi.fn(),
      createUserTester: vi.fn(),
      updateUserTester: vi.fn(),
      deleteUserTester: vi.fn(),
      listAdminTesters: vi.fn(),
      createAdminTester: vi.fn(),
      deleteAdminTester: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceTesterController],
      providers: [
        { provide: ServiceTesterService, useValue: mockTesterService },
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ServiceTesterController>(ServiceTesterController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // USER TESTERS
  // ============================================================

  describe('listUserTesters', () => {
    it('should return list of user testers', async () => {
      const query: ListTesterUsersQueryDto = {};
      const expectedResponse: TesterUserListResponseDto = {
        data: [mockUserTester],
        meta: { total: 1, serviceId: mockServiceId },
      };
      mockTesterService.listUserTesters.mockResolvedValue(expectedResponse);

      const result = await controller.listUserTesters(mockServiceId, query);

      expect(result).toEqual(expectedResponse);
      expect(mockTesterService.listUserTesters).toHaveBeenCalledWith(mockServiceId, query);
    });

    it('should filter by search query', async () => {
      const query: ListTesterUsersQueryDto = { search: 'test' };
      mockTesterService.listUserTesters.mockResolvedValue({
        data: [mockUserTester],
        meta: { total: 1, serviceId: mockServiceId },
      });

      await controller.listUserTesters(mockServiceId, query);

      expect(mockTesterService.listUserTesters).toHaveBeenCalledWith(mockServiceId, query);
    });

    it('should filter by expiration window', async () => {
      const query: ListTesterUsersQueryDto = { expiresWithin: '7d' };
      mockTesterService.listUserTesters.mockResolvedValue({
        data: [],
        meta: { total: 0, serviceId: mockServiceId },
      });

      await controller.listUserTesters(mockServiceId, query);

      expect(mockTesterService.listUserTesters).toHaveBeenCalledWith(mockServiceId, {
        expiresWithin: '7d',
      });
    });
  });

  describe('getUserTester', () => {
    it('should return a specific user tester', async () => {
      mockTesterService.getUserTester.mockResolvedValue(mockUserTester);

      const result = await controller.getUserTester(mockServiceId, mockUserId);

      expect(result).toEqual(mockUserTester);
      expect(mockTesterService.getUserTester).toHaveBeenCalledWith(mockServiceId, mockUserId);
    });
  });

  describe('createUserTester', () => {
    it('should create a user tester', async () => {
      const dto: CreateTesterUserDto = {
        userId: mockUserId,
        bypassDomain: true,
        bypassRate: true,
        note: 'QA team member',
        reason: 'Adding QA tester for beta testing',
      };
      mockTesterService.createUserTester.mockResolvedValue(mockUserTester);

      const result = await controller.createUserTester(mockServiceId, dto, mockAdmin);

      expect(result).toEqual(mockUserTester);
      expect(mockTesterService.createUserTester).toHaveBeenCalledWith(
        mockServiceId,
        dto,
        mockAdmin,
      );
    });

    it('should create user tester with bypass all', async () => {
      const dto: CreateTesterUserDto = {
        userId: mockUserId,
        bypassAll: true,
        reason: 'Full bypass for development',
      };
      const fullBypassTester = { ...mockUserTester, bypassAll: true };
      mockTesterService.createUserTester.mockResolvedValue(fullBypassTester);

      const result = await controller.createUserTester(mockServiceId, dto, mockAdmin);

      expect(result.bypassAll).toBe(true);
    });

    it('should create user tester with expiration', async () => {
      const dto: CreateTesterUserDto = {
        userId: mockUserId,
        bypassDomain: true,
        expiresAt: '2024-12-31T23:59:59Z',
        reason: 'Temporary tester access',
      };
      mockTesterService.createUserTester.mockResolvedValue(mockUserTester);

      await controller.createUserTester(mockServiceId, dto, mockAdmin);

      expect(mockTesterService.createUserTester).toHaveBeenCalledWith(
        mockServiceId,
        dto,
        mockAdmin,
      );
    });
  });

  describe('updateUserTester', () => {
    it('should update a user tester', async () => {
      const dto: UpdateTesterUserDto = {
        bypassAll: true,
        note: 'Updated note',
        reason: 'Upgrading to full bypass',
      };
      const updatedTester = { ...mockUserTester, bypassAll: true, note: 'Updated note' };
      mockTesterService.updateUserTester.mockResolvedValue(updatedTester);

      const result = await controller.updateUserTester(mockServiceId, mockUserId, dto, mockAdmin);

      expect(result.bypassAll).toBe(true);
      expect(result.note).toBe('Updated note');
      expect(mockTesterService.updateUserTester).toHaveBeenCalledWith(
        mockServiceId,
        mockUserId,
        dto,
        mockAdmin,
      );
    });

    it('should extend user tester expiration', async () => {
      const dto: UpdateTesterUserDto = {
        expiresAt: '2025-06-30T23:59:59Z',
        reason: 'Extending tester access',
      };
      const extendedTester = { ...mockUserTester, expiresAt: new Date('2025-06-30T23:59:59Z') };
      mockTesterService.updateUserTester.mockResolvedValue(extendedTester);

      const result = await controller.updateUserTester(mockServiceId, mockUserId, dto, mockAdmin);

      expect(result.expiresAt).toEqual(new Date('2025-06-30T23:59:59Z'));
    });
  });

  describe('deleteUserTester', () => {
    it('should delete a user tester', async () => {
      const dto: DeleteTesterDto = { reason: 'No longer needed' };
      mockTesterService.deleteUserTester.mockResolvedValue({ success: true });

      const result = await controller.deleteUserTester(mockServiceId, mockUserId, dto, mockAdmin);

      expect(result).toEqual({ success: true });
      expect(mockTesterService.deleteUserTester).toHaveBeenCalledWith(
        mockServiceId,
        mockUserId,
        dto.reason,
        mockAdmin,
      );
    });
  });

  // ============================================================
  // ADMIN TESTERS
  // ============================================================

  describe('listAdminTesters', () => {
    it('should return list of admin testers', async () => {
      const expectedResponse: TesterAdminListResponseDto = {
        data: [mockAdminTester],
        meta: { total: 1, serviceId: mockServiceId },
      };
      mockTesterService.listAdminTesters.mockResolvedValue(expectedResponse);

      const result = await controller.listAdminTesters(mockServiceId);

      expect(result).toEqual(expectedResponse);
      expect(mockTesterService.listAdminTesters).toHaveBeenCalledWith(mockServiceId);
    });

    it('should return empty list when no admin testers exist', async () => {
      mockTesterService.listAdminTesters.mockResolvedValue({
        data: [],
        meta: { total: 0, serviceId: mockServiceId },
      });

      const result = await controller.listAdminTesters(mockServiceId);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('createAdminTester', () => {
    it('should create an admin tester', async () => {
      const dto: CreateTesterAdminDto = {
        adminId: mockAdminId,
        bypassAll: true,
        note: 'Development admin',
        reason: 'Adding admin for development testing',
      };
      mockTesterService.createAdminTester.mockResolvedValue(mockAdminTester);

      const result = await controller.createAdminTester(mockServiceId, dto, mockAdmin);

      expect(result).toEqual(mockAdminTester);
      expect(mockTesterService.createAdminTester).toHaveBeenCalledWith(
        mockServiceId,
        dto,
        mockAdmin,
      );
    });

    it('should create admin tester with expiration', async () => {
      const dto: CreateTesterAdminDto = {
        adminId: mockAdminId,
        bypassDomain: true,
        expiresAt: '2024-12-31T23:59:59Z',
        reason: 'Temporary admin tester',
      };
      const expiringTester = {
        ...mockAdminTester,
        bypassAll: false,
        bypassDomain: true,
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      mockTesterService.createAdminTester.mockResolvedValue(expiringTester);

      const result = await controller.createAdminTester(mockServiceId, dto, mockAdmin);

      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('deleteAdminTester', () => {
    it('should delete an admin tester', async () => {
      const dto: DeleteTesterDto = { reason: 'Access revoked' };
      mockTesterService.deleteAdminTester.mockResolvedValue({ success: true });

      const result = await controller.deleteAdminTester(mockServiceId, mockAdminId, dto, mockAdmin);

      expect(result).toEqual({ success: true });
      expect(mockTesterService.deleteAdminTester).toHaveBeenCalledWith(
        mockServiceId,
        mockAdminId,
        dto.reason,
        mockAdmin,
      );
    });
  });
});
