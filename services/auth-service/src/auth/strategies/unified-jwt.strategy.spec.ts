import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifiedJwtStrategy } from './unified-jwt.strategy';
import { PrismaService } from '../../database/prisma.service';
import {
  UserJwtPayload,
  AdminJwtPayload,
  OperatorJwtPayload,
  LegacyUserJwtPayload,
  AuthenticatedUser,
  AuthenticatedAdmin,
  AuthenticatedOperator,
} from '@my-girok/types';

describe('UnifiedJwtStrategy', () => {
  let strategy: UnifiedJwtStrategy;
  let mockPrismaService: {
    user: { findUnique: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') {
          return 'test-jwt-secret-key-for-testing';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedJwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<UnifiedJwtStrategy>(UnifiedJwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', async () => {
      const noSecretConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            UnifiedJwtStrategy,
            { provide: PrismaService, useValue: mockPrismaService },
            { provide: ConfigService, useValue: noSecretConfigService },
          ],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET is not configured');
    });
  });

  describe('validate - User Payload', () => {
    const userPayload: UserJwtPayload = {
      sub: 'user-123',
      email: 'user@example.com',
      type: 'USER_ACCESS',
      accountMode: 'SERVICE',
      countryCode: 'KR',
      services: {
        'my-girok': {
          status: 'ACTIVE',
          countries: ['KR', 'US'],
        },
      },
    };

    it('should validate and return authenticated user for valid user payload', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(userPayload);

      // Assert
      expect(result).toEqual({
        type: 'USER',
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        accountMode: 'SERVICE',
        countryCode: 'KR',
        services: {
          'my-girok': {
            status: 'ACTIVE',
            countries: ['KR', 'US'],
          },
        },
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, email: true, name: true },
      });
    });

    it('should return empty name when user has no name', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(userPayload);

      // Assert
      expect(result.name).toBe('');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(userPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(userPayload)).rejects.toThrow('User not found');
    });

    it('should handle UNIFIED account mode', async () => {
      // Arrange
      const unifiedPayload: UserJwtPayload = {
        ...userPayload,
        accountMode: 'UNIFIED',
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Unified User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = (await strategy.validate(unifiedPayload)) as AuthenticatedUser;

      // Assert
      expect(result.accountMode).toBe('UNIFIED');
    });
  });

  describe('validate - Admin Payload', () => {
    const adminPayload: AdminJwtPayload = {
      sub: 'admin-123',
      email: 'admin@example.com',
      name: 'Test Admin',
      type: 'ADMIN_ACCESS',
      accountMode: 'UNIFIED',
      scope: 'SYSTEM',
      tenantId: null,
      tenantSlug: null,
      tenantType: null,
      roleId: 'role-super-admin',
      roleName: 'Super Admin',
      level: 100,
      permissions: ['*'],
      services: {
        'my-girok': {
          roleId: 'role-1',
          roleName: 'Admin',
          countries: ['KR'],
          permissions: ['legal:*'],
        },
      },
    };

    it('should validate and return authenticated admin for valid admin payload', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        isActive: true,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      // Act
      const result = await strategy.validate(adminPayload);

      // Assert
      expect(result).toEqual({
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        scope: 'SYSTEM',
        tenantId: null,
        roleId: 'role-super-admin',
        roleName: 'Super Admin',
        level: 100,
        permissions: ['*'],
        services: adminPayload.services,
      });
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(strategy.validate(adminPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(adminPayload)).rejects.toThrow('Admin not found or inactive');
    });

    it('should throw UnauthorizedException when admin is inactive', async () => {
      // Arrange
      const inactiveAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Inactive Admin',
        isActive: false,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([inactiveAdmin]);

      // Act & Assert
      await expect(strategy.validate(adminPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(adminPayload)).rejects.toThrow('Admin not found or inactive');
    });

    it('should handle TENANT scope admin', async () => {
      // Arrange
      const tenantAdminPayload: AdminJwtPayload = {
        ...adminPayload,
        scope: 'TENANT',
        tenantId: 'tenant-123',
        tenantSlug: 'acme-corp',
        tenantType: 'COMPANY',
      };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Tenant Admin',
        isActive: true,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      // Act
      const result = (await strategy.validate(tenantAdminPayload)) as AuthenticatedAdmin;

      // Assert
      expect(result.scope).toBe('TENANT');
      expect(result.tenantId).toBe('tenant-123');
    });
  });

  describe('validate - Operator Payload', () => {
    const operatorPayload: OperatorJwtPayload = {
      sub: 'operator-123',
      email: 'operator@example.com',
      name: 'Test Operator',
      type: 'OPERATOR_ACCESS',
      adminId: 'admin-456',
      serviceId: 'service-789',
      serviceSlug: 'my-girok',
      countryCode: 'KR',
      permissions: ['user:read', 'user:update'],
    };

    it('should validate and return authenticated operator for valid operator payload', async () => {
      // Arrange
      const mockOperator = {
        id: 'operator-123',
        email: 'operator@example.com',
        name: 'Test Operator',
        isActive: true,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([mockOperator]);

      // Act
      const result = await strategy.validate(operatorPayload);

      // Assert
      expect(result).toEqual({
        type: 'OPERATOR',
        id: 'operator-123',
        email: 'operator@example.com',
        name: 'Test Operator',
        adminId: 'admin-456',
        serviceId: 'service-789',
        serviceSlug: 'my-girok',
        countryCode: 'KR',
        permissions: ['user:read', 'user:update'],
      });
    });

    it('should throw UnauthorizedException when operator not found', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(strategy.validate(operatorPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(operatorPayload)).rejects.toThrow(
        'Operator not found or inactive',
      );
    });

    it('should throw UnauthorizedException when operator is inactive', async () => {
      // Arrange
      const inactiveOperator = {
        id: 'operator-123',
        email: 'operator@example.com',
        name: 'Inactive Operator',
        isActive: false,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([inactiveOperator]);

      // Act & Assert
      await expect(strategy.validate(operatorPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(operatorPayload)).rejects.toThrow(
        'Operator not found or inactive',
      );
    });
  });

  describe('validate - Legacy Payload', () => {
    const legacyPayload: LegacyUserJwtPayload = {
      sub: 'user-legacy-123',
      email: 'legacy@example.com',
      role: 'USER',
      type: 'ACCESS',
    };

    it('should validate and return authenticated user for legacy ACCESS token', async () => {
      // Arrange
      const mockUser = {
        id: 'user-legacy-123',
        email: 'legacy@example.com',
        name: 'Legacy User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(legacyPayload);

      // Assert
      expect(result).toEqual({
        type: 'USER',
        id: 'user-legacy-123',
        email: 'legacy@example.com',
        name: 'Legacy User',
        accountMode: 'SERVICE',
        countryCode: 'KR',
        services: {},
      });
    });

    it('should validate legacy REFRESH token', async () => {
      // Arrange
      const refreshPayload: LegacyUserJwtPayload = {
        ...legacyPayload,
        type: 'REFRESH',
      };

      const mockUser = {
        id: 'user-legacy-123',
        email: 'legacy@example.com',
        name: 'Legacy User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(refreshPayload);

      // Assert
      expect(result.type).toBe('USER');
    });

    it('should validate legacy DOMAIN_ACCESS token', async () => {
      // Arrange
      const domainPayload: LegacyUserJwtPayload = {
        ...legacyPayload,
        type: 'DOMAIN_ACCESS',
        domain: 'resume',
      };

      const mockUser = {
        id: 'user-legacy-123',
        email: 'legacy@example.com',
        name: 'Legacy User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(domainPayload);

      // Assert
      expect(result.type).toBe('USER');
    });

    it('should throw UnauthorizedException when legacy user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(legacyPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(legacyPayload)).rejects.toThrow('User not found');
    });

    it('should return empty name for legacy user with null name', async () => {
      // Arrange
      const mockUser = {
        id: 'user-legacy-123',
        email: 'legacy@example.com',
        name: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(legacyPayload);

      // Assert
      expect(result.name).toBe('');
    });
  });

  describe('validate - Invalid Token Type', () => {
    it('should throw UnauthorizedException for unknown token type', async () => {
      // Arrange
      const invalidPayload = {
        sub: 'user-123',
        email: 'invalid@example.com',
        type: 'UNKNOWN_TYPE',
      } as any;

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(invalidPayload)).rejects.toThrow('Invalid token type');
    });

    it('should throw UnauthorizedException for payload without type', async () => {
      // Arrange
      const noTypePayload = {
        sub: 'user-123',
        email: 'notype@example.com',
      } as any;

      // Act & Assert
      await expect(strategy.validate(noTypePayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(noTypePayload)).rejects.toThrow('Invalid token type');
    });
  });

  describe('validate - Edge Cases', () => {
    it('should handle user with empty services object', async () => {
      // Arrange
      const payloadWithNoServices: UserJwtPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        type: 'USER_ACCESS',
        accountMode: 'SERVICE',
        countryCode: 'US',
        services: {},
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'User Without Services',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = (await strategy.validate(payloadWithNoServices)) as AuthenticatedUser;

      // Assert
      expect(result.services).toEqual({});
    });

    it('should handle admin with multiple services', async () => {
      // Arrange
      const multiServiceAdminPayload: AdminJwtPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        name: 'Multi-Service Admin',
        type: 'ADMIN_ACCESS',
        accountMode: 'UNIFIED',
        scope: 'SYSTEM',
        tenantId: null,
        tenantSlug: null,
        tenantType: null,
        roleId: 'role-admin',
        roleName: 'Admin',
        level: 50,
        permissions: ['user:*', 'legal:*'],
        services: {
          'my-girok': {
            roleId: 'role-1',
            roleName: 'Admin',
            countries: ['KR', 'US'],
            permissions: ['user:*'],
          },
          personal: {
            roleId: 'role-2',
            roleName: 'Manager',
            countries: ['JP'],
            permissions: ['resume:read'],
          },
        },
      };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Multi-Service Admin',
        isActive: true,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      // Act
      const result = (await strategy.validate(multiServiceAdminPayload)) as AuthenticatedAdmin;

      // Assert
      expect(Object.keys(result.services)).toHaveLength(2);
      expect(result.services['my-girok']).toBeDefined();
      expect(result.services['personal']).toBeDefined();
    });

    it('should handle operator with empty permissions', async () => {
      // Arrange
      const noPermissionsOperator: OperatorJwtPayload = {
        sub: 'operator-123',
        email: 'operator@example.com',
        name: 'Read Only Operator',
        type: 'OPERATOR_ACCESS',
        adminId: 'admin-456',
        serviceId: 'service-789',
        serviceSlug: 'my-girok',
        countryCode: 'KR',
        permissions: [],
      };

      const mockOperator = {
        id: 'operator-123',
        email: 'operator@example.com',
        name: 'Read Only Operator',
        isActive: true,
      };

      mockPrismaService.$queryRaw.mockResolvedValue([mockOperator]);

      // Act
      const result = (await strategy.validate(noPermissionsOperator)) as AuthenticatedOperator;

      // Assert
      expect(result.permissions).toEqual([]);
    });
  });
});
