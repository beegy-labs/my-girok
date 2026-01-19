import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminAccountService } from './admin-account.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditEventEmitterService } from '../../common/services/audit-event-emitter.service';
import { AdminScope } from '../dto/admin-account.dto';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt');
vi.mock('@my-girok/nest-common', () => ({
  ID: {
    generate: vi.fn(() => '01935c6d-c2d0-7abc-8def-1234567890ab'),
  },
  Transactional: () => () => {},
}));

describe('AdminAccountService', () => {
  let service: AdminAccountService;
  let prismaService: Mocked<PrismaService>;

  const mockAdminId = '01935c6d-c2d0-7abc-8def-1234567890aa';
  const mockRoleId = '01935c6d-c2d0-7abc-8def-1234567890bb';

  beforeEach(async () => {
    const mockPrismaService = {
      admins: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      admin_invitations: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      roles: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      tenants: {
        findFirst: vi.fn(),
      },
      adminSession: {
        updateMany: vi.fn(),
      },
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    };

    const mockAuditEventEmitter = {
      emitAdminCreated: vi.fn(),
      emitAdminUpdated: vi.fn(),
      emitAdminDeactivated: vi.fn(),
      emitAdminReactivated: vi.fn(),
      emitAdminInvited: vi.fn(),
      emitAdminRoleChanged: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAccountService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditEventEmitterService,
          useValue: mockAuditEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AdminAccountService>(AdminAccountService);
    prismaService = module.get(PrismaService) as Mocked<PrismaService>;

    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);
  });

  describe('create', () => {
    it('should create a new admin account', async () => {
      const createDto = {
        email: 'new@example.com',
        name: 'New Admin',
        tempPassword: 'password123',
        roleId: mockRoleId,
        scope: AdminScope.SYSTEM,
      };

      prismaService.admins.findFirst.mockResolvedValue(null);
      prismaService.roles.findFirst.mockResolvedValue({
        id: mockRoleId,
        name: 'admin',
        display_name: 'Admin',
        scope: AdminScope.SYSTEM,
        level: 1,
      } as any);
      prismaService.admins.create.mockResolvedValue({} as any);
      prismaService.$executeRaw.mockResolvedValue(1 as any);

      // Mock findById for the return
      vi.spyOn(service, 'findById').mockResolvedValue({
        id: mockAdminId,
        email: createDto.email,
        name: createDto.name,
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
        createdAt: new Date(),
        permissions: [],
      });

      const result = await service.create('current-admin-id', createDto);

      expect(result.email).toBe(createDto.email);
      expect(prismaService.admins.findFirst).toHaveBeenCalledWith({
        where: { email: createDto.email, deleted_at: null },
        select: { id: true },
      });
      expect(prismaService.admins.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      prismaService.admins.findFirst.mockResolvedValue({ id: 'existing-id' } as any);

      await expect(
        service.create('current-admin-id', {
          email: 'existing@example.com',
          name: 'Test',
          tempPassword: 'pass',
          roleId: mockRoleId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if role not found', async () => {
      prismaService.admins.findFirst.mockResolvedValue(null);
      prismaService.roles.findFirst.mockResolvedValue(null);

      await expect(
        service.create('current-admin-id', {
          email: 'new@example.com',
          name: 'Test',
          tempPassword: 'pass',
          roleId: 'invalid-role-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if role scope mismatch', async () => {
      prismaService.admins.findFirst.mockResolvedValue(null);
      prismaService.roles.findFirst.mockResolvedValue({
        id: mockRoleId,
        scope: AdminScope.TENANT,
      } as any);

      await expect(
        service.create('current-admin-id', {
          email: 'new@example.com',
          name: 'Test',
          tempPassword: 'pass',
          roleId: mockRoleId,
          scope: AdminScope.SYSTEM,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRoles', () => {
    it('should return all roles when no scope filter', async () => {
      const mockRoles = [
        { id: '1', name: 'admin', display_name: 'Admin', scope: 'SYSTEM', level: 1 },
        { id: '2', name: 'viewer', display_name: 'Viewer', scope: 'TENANT', level: 2 },
      ];

      prismaService.roles.findMany.mockResolvedValue(mockRoles as any);

      const result = await service.getRoles({});

      expect(result.roles).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prismaService.roles.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          name: true,
          display_name: true,
          scope: true,
          level: true,
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter roles by scope', async () => {
      const mockRoles = [
        { id: '1', name: 'admin', display_name: 'Admin', scope: 'SYSTEM', level: 1 },
      ];

      prismaService.roles.findMany.mockResolvedValue(mockRoles as any);

      const result = await service.getRoles({ scope: AdminScope.SYSTEM });

      expect(result.roles).toHaveLength(1);
      expect(prismaService.roles.findMany).toHaveBeenCalledWith({
        where: { scope: AdminScope.SYSTEM },
        select: {
          id: true,
          name: true,
          display_name: true,
          scope: true,
          level: true,
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('update', () => {
    it('should update admin account', async () => {
      const updateDto = { name: 'Updated Name', isActive: true };

      vi.spyOn(service, 'findById')
        .mockResolvedValueOnce({
          id: mockAdminId,
          email: 'test@example.com',
          name: 'Old Name',
          scope: AdminScope.SYSTEM,
          tenantId: null,
          role: { id: mockRoleId, name: 'admin', displayName: 'Admin', level: 1 },
          isActive: false,
          lastLoginAt: null,
          createdAt: new Date(),
          permissions: [],
        })
        .mockResolvedValueOnce({
          id: mockAdminId,
          email: 'test@example.com',
          name: updateDto.name,
          scope: AdminScope.SYSTEM,
          tenantId: null,
          role: { id: mockRoleId, name: 'admin', displayName: 'Admin', level: 1 },
          isActive: updateDto.isActive,
          lastLoginAt: null,
          createdAt: new Date(),
          permissions: [],
        });

      prismaService.admins.update.mockResolvedValue({} as any);
      prismaService.$executeRaw.mockResolvedValue(1 as any);

      const result = await service.update('current-admin-id', mockAdminId, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(prismaService.admins.update).toHaveBeenCalledWith({
        where: { id: mockAdminId },
        data: { name: updateDto.name, is_active: updateDto.isActive },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate admin account and revoke sessions', async () => {
      vi.spyOn(service, 'findById').mockResolvedValue({
        id: mockAdminId,
        email: 'test@example.com',
        name: 'Test Admin',
        scope: AdminScope.SYSTEM,
        tenantId: null,
        role: { id: mockRoleId, name: 'admin', displayName: 'Admin', level: 1 },
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        permissions: [],
      });

      prismaService.admins.update.mockResolvedValue({} as any);
      prismaService.adminSession.updateMany.mockResolvedValue({ count: 2 } as any);
      prismaService.$executeRaw.mockResolvedValue(1 as any);

      await service.deactivate('current-admin-id', mockAdminId);

      expect(prismaService.admins.update).toHaveBeenCalledWith({
        where: { id: mockAdminId },
        data: { is_active: false },
      });
      expect(prismaService.adminSession.updateMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to deactivate self', async () => {
      vi.spyOn(service, 'findById').mockResolvedValue({
        id: mockAdminId,
        email: 'test@example.com',
        name: 'Test Admin',
        scope: AdminScope.SYSTEM,
        tenantId: null,
        role: { id: mockRoleId, name: 'admin', displayName: 'Admin', level: 1 },
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        permissions: [],
      });

      await expect(service.deactivate(mockAdminId, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role to admin', async () => {
      const newRoleId = 'new-role-id';

      vi.spyOn(service, 'findById')
        .mockResolvedValueOnce({
          id: mockAdminId,
          email: 'test@example.com',
          name: 'Test Admin',
          scope: AdminScope.SYSTEM,
          tenantId: null,
          role: { id: mockRoleId, name: 'admin', displayName: 'Admin', level: 1 },
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          permissions: [],
        })
        .mockResolvedValueOnce({
          id: mockAdminId,
          email: 'test@example.com',
          name: 'Test Admin',
          scope: AdminScope.SYSTEM,
          tenantId: null,
          role: { id: newRoleId, name: 'viewer', displayName: 'Viewer', level: 2 },
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          permissions: [],
        });

      prismaService.roles.findFirst.mockResolvedValue({
        id: newRoleId,
        scope: AdminScope.SYSTEM,
      } as any);
      prismaService.admins.update.mockResolvedValue({} as any);
      prismaService.$executeRaw.mockResolvedValue(1 as any);

      const result = await service.assignRole('current-admin-id', mockAdminId, newRoleId);

      expect(result.role.id).toBe(newRoleId);
      expect(prismaService.admins.update).toHaveBeenCalledWith({
        where: { id: mockAdminId },
        data: { role_id: newRoleId },
      });
    });

    it('should throw BadRequestException if role scope does not match admin scope', async () => {
      vi.spyOn(service, 'findById').mockResolvedValue({
        id: mockAdminId,
        email: 'test@example.com',
        name: 'Test Admin',
        scope: AdminScope.SYSTEM,
        tenantId: null,
        role: { id: mockRoleId, name: 'admin', displayName: 'Admin', level: 1 },
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        permissions: [],
      });

      prismaService.roles.findFirst.mockResolvedValue({
        id: 'tenant-role',
        scope: AdminScope.TENANT,
      } as any);

      await expect(
        service.assignRole('current-admin-id', mockAdminId, 'tenant-role'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
