import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminAuthController } from '../../src/admin/controllers/admin-auth.controller';
import { AdminAuthService } from '../../src/admin/services/admin-auth.service';
import { generateTestId, resetTestCounter, createAdminPayload } from '../utils/test-factory';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let mockAdminAuthService: {
    login: Mock;
    refresh: Mock;
    getProfile: Mock;
    logout: Mock;
  };

  const adminId = '00000000-0000-7000-0000-000000000001';

  beforeEach(async () => {
    resetTestCounter();

    mockAdminAuthService = {
      login: vi.fn(),
      refresh: vi.fn(),
      getProfile: vi.fn(),
      logout: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [{ provide: AdminAuthService, useValue: mockAdminAuthService }],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login admin and return tokens', async () => {
      // Arrange
      const dto = {
        email: 'admin@test.com',
        password: 'password123',
      };
      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        admin: {
          id: adminId,
          email: dto.email,
          name: 'Test Admin',
          scope: 'SYSTEM',
          tenantId: null,
          tenantSlug: null,
          roleName: 'Super Admin',
          permissions: ['*'],
        },
      };

      mockAdminAuthService.login.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.admin.email).toBe(dto.email);
      expect(mockAdminAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      // Arrange
      const dto = { refreshToken: 'old-refresh-token' };
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAdminAuthService.refresh.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.refresh(dto);

      // Assert
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockAdminAuthService.refresh).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('getProfile', () => {
    it('should return admin profile', async () => {
      // Arrange
      const adminPayload = createAdminPayload({ id: adminId });
      const mockProfile = {
        id: adminId,
        email: 'admin@test.com',
        name: 'Test Admin',
        scope: 'SYSTEM',
        tenantId: null,
        tenant: undefined,
        role: {
          id: generateTestId(),
          name: 'super_admin',
          displayName: 'Super Administrator',
          level: 100,
        },
        permissions: ['*'],
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      mockAdminAuthService.getProfile.mockResolvedValue(mockProfile);

      // Act
      const result = await controller.getProfile(adminPayload);

      // Assert
      expect(result.id).toBe(adminId);
      expect(result.email).toBe('admin@test.com');
      expect(mockAdminAuthService.getProfile).toHaveBeenCalledWith(adminId);
    });
  });

  describe('logout', () => {
    it('should logout admin', async () => {
      // Arrange
      const adminPayload = createAdminPayload({ id: adminId });
      const dto = { refreshToken: 'refresh-token' };
      mockAdminAuthService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(adminPayload, dto);

      // Assert
      expect(mockAdminAuthService.logout).toHaveBeenCalledWith(adminId, 'refresh-token');
    });
  });
});
