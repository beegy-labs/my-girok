import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminAccountController } from './admin-account.controller';
import { AdminAccountService } from '../services/admin-account.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  CreateAdminDto,
  InviteAdminDto,
  UpdateAdminDto,
  AssignRoleDto,
  AdminResponse,
  AdminDetailResponse,
  AdminListResponse,
  AdminRoleListResponse,
  InvitationResponse,
  AdminListQueryDto,
  AdminRoleListQueryDto,
  AdminScope,
  InvitationType,
} from '../dto/admin-account.dto';
import { AdminPayload } from '../types/admin.types';

describe('AdminAccountController', () => {
  let controller: AdminAccountController;
  let mockAdminAccountService: {
    create: Mock;
    invite: Mock;
    findAll: Mock;
    getRoles: Mock;
    findById: Mock;
    update: Mock;
    deactivate: Mock;
    reactivate: Mock;
    assignRole: Mock;
  };

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
    permissions: [
      'system_admin:create',
      'system_admin:read',
      'system_admin:update',
      'system_admin:delete',
    ],
    services: {},
  };

  const mockAdminId = '550e8400-e29b-41d4-a716-446655440001';
  const mockRoleId = '550e8400-e29b-41d4-a716-446655440101';

  const mockAdminResponse: AdminResponse = {
    id: mockAdminId,
    email: 'test@example.com',
    name: 'Test Admin',
    scope: AdminScope.SYSTEM,
    tenantId: null,
    role: {
      id: mockRoleId,
      name: 'admin',
      displayName: 'Admin',
      level: 1,
    },
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
  };

  const mockAdminDetailResponse: AdminDetailResponse = {
    ...mockAdminResponse,
    permissions: [
      {
        id: '550e8400-e29b-41d4-a716-446655440201',
        resource: 'system_admin',
        action: 'read',
        displayName: 'Read System Admin',
        description: 'View system admin accounts',
        category: 'admin',
      },
    ],
  };

  beforeEach(async () => {
    mockAdminAccountService = {
      create: vi.fn(),
      invite: vi.fn(),
      findAll: vi.fn(),
      getRoles: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      assignRole: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAccountController],
      providers: [
        { provide: AdminAccountService, useValue: mockAdminAccountService },
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: vi.fn(() => true) })
      .compile();

    controller = module.get<AdminAccountController>(AdminAccountController);
  });

  describe('create', () => {
    it('should create a new admin account', async () => {
      const createDto: CreateAdminDto = {
        email: 'new@example.com',
        name: 'New Admin',
        tempPassword: 'password123',
        roleId: mockRoleId,
        scope: AdminScope.SYSTEM,
      };

      mockAdminAccountService.create.mockResolvedValue(mockAdminResponse);

      const result = await controller.create(mockAdmin, createDto);

      expect(result).toEqual(mockAdminResponse);
      expect(mockAdminAccountService.create).toHaveBeenCalledWith(mockAdmin.sub, createDto);
    });
  });

  describe('invite', () => {
    it('should invite an admin via email', async () => {
      const inviteDto: InviteAdminDto = {
        email: 'invite@example.com',
        name: 'Invited Admin',
        roleId: mockRoleId,
        type: InvitationType.EMAIL,
      };

      const mockInvitation: InvitationResponse = {
        id: '550e8400-e29b-41d4-a716-446655440301',
        email: inviteDto.email,
        name: inviteDto.name,
        type: InvitationType.EMAIL,
        status: 'PENDING',
        expiresAt: new Date('2024-01-08'),
        createdAt: new Date('2024-01-01'),
      };

      mockAdminAccountService.invite.mockResolvedValue(mockInvitation);

      const result = await controller.invite(mockAdmin, inviteDto);

      expect(result).toEqual(mockInvitation);
      expect(mockAdminAccountService.invite).toHaveBeenCalledWith(mockAdmin.sub, inviteDto);
    });

    it('should create admin directly via DIRECT type', async () => {
      const inviteDto: InviteAdminDto = {
        email: 'direct@example.com',
        name: 'Direct Admin',
        roleId: mockRoleId,
        type: InvitationType.DIRECT,
        tempPassword: 'temppass123',
      };

      const mockInvitation: InvitationResponse = {
        id: '550e8400-e29b-41d4-a716-446655440302',
        email: inviteDto.email,
        name: inviteDto.name,
        type: InvitationType.DIRECT,
        status: 'ACCEPTED',
        expiresAt: new Date('2024-01-08'),
        createdAt: new Date('2024-01-01'),
      };

      mockAdminAccountService.invite.mockResolvedValue(mockInvitation);

      const result = await controller.invite(mockAdmin, inviteDto);

      expect(result).toEqual(mockInvitation);
      expect(mockAdminAccountService.invite).toHaveBeenCalledWith(mockAdmin.sub, inviteDto);
    });
  });

  describe('findAll', () => {
    it('should list all admins without filters', async () => {
      const query: AdminListQueryDto = {
        page: 1,
        limit: 20,
      };

      const mockListResponse: AdminListResponse = {
        admins: [mockAdminResponse],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockAdminAccountService.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
      expect(mockAdminAccountService.findAll).toHaveBeenCalledWith(query);
    });

    it('should list admins with filters', async () => {
      const query: AdminListQueryDto = {
        page: 1,
        limit: 10,
        scope: AdminScope.SYSTEM,
        roleId: mockRoleId,
        isActive: true,
        search: 'test',
      };

      const mockListResponse: AdminListResponse = {
        admins: [mockAdminResponse],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockAdminAccountService.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
      expect(mockAdminAccountService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getRoles', () => {
    it('should get all available roles', async () => {
      const query: AdminRoleListQueryDto = {};

      const mockRolesResponse: AdminRoleListResponse = {
        roles: [
          {
            id: mockRoleId,
            name: 'admin',
            displayName: 'Admin',
            level: 1,
            scope: AdminScope.SYSTEM,
          },
        ],
        total: 1,
      };

      mockAdminAccountService.getRoles.mockResolvedValue(mockRolesResponse);

      const result = await controller.getRoles(query);

      expect(result).toEqual(mockRolesResponse);
      expect(mockAdminAccountService.getRoles).toHaveBeenCalledWith(query);
    });

    it('should filter roles by scope', async () => {
      const query: AdminRoleListQueryDto = {
        scope: AdminScope.SYSTEM,
      };

      const mockRolesResponse: AdminRoleListResponse = {
        roles: [
          {
            id: mockRoleId,
            name: 'admin',
            displayName: 'Admin',
            level: 1,
            scope: AdminScope.SYSTEM,
          },
        ],
        total: 1,
      };

      mockAdminAccountService.getRoles.mockResolvedValue(mockRolesResponse);

      const result = await controller.getRoles(query);

      expect(result).toEqual(mockRolesResponse);
      expect(mockAdminAccountService.getRoles).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should get admin by ID with full details', async () => {
      mockAdminAccountService.findById.mockResolvedValue(mockAdminDetailResponse);

      const result = await controller.findById(mockAdminId);

      expect(result).toEqual(mockAdminDetailResponse);
      expect(mockAdminAccountService.findById).toHaveBeenCalledWith(mockAdminId);
    });
  });

  describe('update', () => {
    it('should update admin account', async () => {
      const updateDto: UpdateAdminDto = {
        name: 'Updated Name',
        isActive: true,
      };

      const updatedAdmin: AdminResponse = {
        ...mockAdminResponse,
        name: updateDto.name,
        isActive: updateDto.isActive!,
      };

      mockAdminAccountService.update.mockResolvedValue(updatedAdmin);

      const result = await controller.update(mockAdmin, mockAdminId, updateDto);

      expect(result).toEqual(updatedAdmin);
      expect(mockAdminAccountService.update).toHaveBeenCalledWith(
        mockAdmin.sub,
        mockAdminId,
        updateDto,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate admin account', async () => {
      mockAdminAccountService.deactivate.mockResolvedValue(undefined);

      await controller.deactivate(mockAdmin, mockAdminId);

      expect(mockAdminAccountService.deactivate).toHaveBeenCalledWith(mockAdmin.sub, mockAdminId);
    });
  });

  describe('reactivate', () => {
    it('should reactivate admin account', async () => {
      const reactivatedAdmin: AdminResponse = {
        ...mockAdminResponse,
        isActive: true,
      };

      mockAdminAccountService.reactivate.mockResolvedValue(reactivatedAdmin);

      const result = await controller.reactivate(mockAdmin, mockAdminId);

      expect(result).toEqual(reactivatedAdmin);
      expect(mockAdminAccountService.reactivate).toHaveBeenCalledWith(mockAdmin.sub, mockAdminId);
    });
  });

  describe('assignRole', () => {
    it('should assign role to admin', async () => {
      const assignRoleDto: AssignRoleDto = {
        roleId: '550e8400-e29b-41d4-a716-446655440102',
      };

      const updatedAdmin: AdminResponse = {
        ...mockAdminResponse,
        role: {
          id: assignRoleDto.roleId,
          name: 'viewer',
          displayName: 'Viewer',
          level: 2,
        },
      };

      mockAdminAccountService.assignRole.mockResolvedValue(updatedAdmin);

      const result = await controller.assignRole(mockAdmin, mockAdminId, assignRoleDto);

      expect(result).toEqual(updatedAdmin);
      expect(mockAdminAccountService.assignRole).toHaveBeenCalledWith(
        mockAdmin.sub,
        mockAdminId,
        assignRoleDto.roleId,
      );
    });
  });
});
