import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { OperatorAuthService } from '../../src/operator/services/operator-auth.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { generateTestId, resetTestCounter } from '../utils/test-factory';

vi.mock('bcrypt');

describe('OperatorAuthService', () => {
  let service: OperatorAuthService;
  let mockPrisma: MockPrismaService;
  let mockJwtService: {
    verify: Mock;
    signAsync: Mock;
  };
  let mockConfigService: {
    get: Mock;
  };

  const operatorId = '00000000-0000-7000-0000-000000000001';
  const adminId = '00000000-0000-7000-0000-000000000002';
  const serviceId = '00000000-0000-7000-0000-000000000003';

  const mockOperator = {
    id: operatorId,
    email: 'operator@test.com',
    password: 'hashed-password',
    name: 'Test Operator',
    adminId,
    serviceId,
    serviceSlug: 'my-girok',
    serviceName: 'My Girok',
    countryCode: 'KR',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();
    mockJwtService = {
      verify: vi.fn(),
      signAsync: vi.fn().mockResolvedValue('mock-token'),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('1h'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OperatorAuthService>(OperatorAuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login operator with valid credentials', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator]) // find operator
        .mockResolvedValueOnce([{ operatorId, resource: 'content', action: 'read' }]); // get permissions

      (bcrypt.compare as Mock).mockResolvedValue(true);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.login({
        email: 'operator@test.com',
        password: 'password123',
        serviceSlug: 'my-girok',
      });

      // Assert
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.operator.email).toBe('operator@test.com');
      expect(result.operator.serviceSlug).toBe('my-girok');
      expect(result.operator.permissions).toEqual(['content:read']);
    });

    it('should throw UnauthorizedException when operator not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(
        service.login({
          email: 'unknown@test.com',
          password: 'password123',
          serviceSlug: 'my-girok',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when account is deactivated', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ ...mockOperator, isActive: false }]);

      // Act & Assert
      await expect(
        service.login({
          email: 'operator@test.com',
          password: 'password123',
          serviceSlug: 'my-girok',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockOperator]);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.login({
          email: 'operator@test.com',
          password: 'wrong-password',
          serviceSlug: 'my-girok',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('acceptInvitation', () => {
    const invitationToken = 'valid-invitation-token';
    const mockInvitation = {
      id: generateTestId(),
      adminId,
      serviceId,
      serviceSlug: 'my-girok',
      countryCode: 'KR',
      email: 'new-operator@test.com',
      name: 'New Operator',
      permissions: [generateTestId()],
    };

    it('should successfully accept invitation and create operator', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockInvitation]); // find invitation

      (bcrypt.hash as Mock).mockResolvedValue('hashed-password');

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          $queryRaw: vi.fn().mockResolvedValueOnce([
            {
              ...mockOperator,
              email: mockInvitation.email,
              name: mockInvitation.name,
            },
          ]),
        };
        return callback(tx);
      });

      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { operatorId, resource: 'content', action: 'read' },
      ]); // getOperatorPermissions

      mockPrisma.$executeRaw.mockResolvedValue(1); // saveOperatorSession

      // Act
      const result = await service.acceptInvitation({
        token: invitationToken,
        password: 'newpassword123',
      });

      // Assert
      expect(result.accessToken).toBe('mock-token');
      expect(result.operator.email).toBe('new-operator@test.com');
      expect(result.operator.name).toBe('New Operator');
    });

    it('should throw BadRequestException when invitation is invalid', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(
        service.acceptInvitation({
          token: 'invalid-token',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refresh', () => {
    const refreshToken = 'valid-refresh-token';

    it('should successfully refresh tokens', async () => {
      // Arrange
      const mockSession = {
        id: generateTestId(),
        subjectId: operatorId,
        subjectType: 'OPERATOR',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000), // 1 day in future
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: operatorId });
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([{ operatorId, resource: 'content', action: 'read' }]);

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.refresh(refreshToken);

      // Assert
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException when session expired', async () => {
      // Arrange
      const expiredSession = {
        id: generateTestId(),
        subjectId: operatorId,
        subjectType: 'OPERATOR',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() - 86400000), // 1 day in past
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: operatorId });
      mockPrisma.$queryRaw.mockResolvedValueOnce([expiredSession]);

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      // Arrange
      const revokedSession = {
        id: generateTestId(),
        subjectId: operatorId,
        subjectType: 'OPERATOR',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({ sub: operatorId });
      mockPrisma.$queryRaw.mockResolvedValueOnce([revokedSession]);

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when operator not found', async () => {
      // Arrange
      const mockSession = {
        id: generateTestId(),
        subjectId: operatorId,
        subjectType: 'OPERATOR',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: operatorId });
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockSession]).mockResolvedValueOnce([]); // operator not found

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when operator is deactivated', async () => {
      // Arrange
      const mockSession = {
        id: generateTestId(),
        subjectId: operatorId,
        subjectType: 'OPERATOR',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: operatorId });
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([{ ...mockOperator, isActive: false }]);

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke session on logout', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logout(operatorId, 'refresh-token');

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return operator profile', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockOperator])
        .mockResolvedValueOnce([{ operatorId, resource: 'content', action: 'read' }]);

      // Act
      const result = await service.getProfile(operatorId);

      // Assert
      expect(result.id).toBe(operatorId);
      expect(result.email).toBe('operator@test.com');
      expect(result.name).toBe('Test Operator');
      expect(result.serviceSlug).toBe('my-girok');
      expect(result.permissions).toEqual(['content:read']);
    });

    it('should throw UnauthorizedException when operator not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.getProfile(operatorId)).rejects.toThrow(UnauthorizedException);
    });
  });
});
