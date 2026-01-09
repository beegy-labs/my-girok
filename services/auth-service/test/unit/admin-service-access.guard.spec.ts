import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminServiceAccessGuard } from '../../src/admin/guards/admin-service-access.guard';
import { PrismaService } from '../../src/database/prisma.service';

describe('AdminServiceAccessGuard', () => {
  let guard: AdminServiceAccessGuard;
  let mockPrismaService: { $queryRaw: Mock };

  const mockService = {
    id: 'service-123',
    slug: 'resume',
    name: 'Resume Service',
    domains: ['resume.example.com', 'api.resume.example.com'],
  };

  const mockServiceConfig = {
    jwtValidation: true,
    domainValidation: true,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    rateLimitEnabled: true,
    rateLimitRequests: 100,
    rateLimitWindowSeconds: 60,
    maintenanceMode: false,
    maintenanceMessage: null,
    auditLevel: 'full',
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminServiceAccessGuard, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    guard = module.get<AdminServiceAccessGuard>(AdminServiceAccessGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockContext(
    params?: Record<string, string>,
    user?: Record<string, unknown> | null,
    headers?: Record<string, string>,
    socket?: { remoteAddress?: string },
  ): ExecutionContext {
    const mockRequest = {
      params: params || {},
      user: user,
      admin: null,
      headers: headers || {},
      socket: socket,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  }

  describe('canActivate', () => {
    it('should allow access when no serviceId is specified', async () => {
      // Arrange
      const context = createMockContext({});

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when service not found', async () => {
      // Arrange
      const context = createMockContext({ serviceId: 'non-existent' });
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]); // No service found

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Service not found');
    });

    it('should allow admin tester to bypass all validations', async () => {
      // Arrange
      const context = createMockContext(
        { serviceId: 'service-123' },
        { sub: 'admin-123', type: 'ADMIN_ACCESS' },
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getService
        .mockResolvedValueOnce([{ bypass_all: true, bypass_domain: true, expires_at: null }]); // admin tester

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow user tester to bypass validations', async () => {
      // Arrange
      const context = createMockContext(
        { serviceId: 'service-123' },
        { sub: 'user-123', type: 'USER_ACCESS' },
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getService
        .mockResolvedValueOnce([
          {
            bypass_all: true,
            bypass_domain: true,
            bypass_ip: true,
            bypass_rate: true,
            expires_at: null,
          },
        ]); // user tester (no admin tester query for USER_ACCESS type)

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should not bypass when tester status is expired', async () => {
      // Arrange
      const context = createMockContext(
        { serviceId: 'service-123' },
        { sub: 'admin-123', type: 'ADMIN_ACCESS' },
        { host: 'unauthorized.example.com' }, // Invalid domain to trigger validation
      );
      const expiredDate = new Date(Date.now() - 86400000); // Yesterday
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getService
        .mockResolvedValueOnce([{ bypass_all: true, bypass_domain: true, expires_at: expiredDate }]) // expired admin tester
        .mockResolvedValueOnce([mockServiceConfig]); // getServiceConfig

      // Act & Assert - should fail because expired tester doesn't bypass domain validation
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Domain unauthorized.example.com is not authorized for this service',
      );
    });

    it('should validate domain when enabled', async () => {
      // Arrange
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'unauthorized.domain.com',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService]) // getService
        .mockResolvedValueOnce([mockServiceConfig]); // getServiceConfig

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Domain unauthorized.domain.com is not authorized for this service',
      );
    });

    it('should allow valid domain', async () => {
      // Arrange
      const context = createMockContext(
        { serviceId: 'service-123' },
        null,
        { host: 'resume.example.com:3000' }, // Domain with port
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([mockServiceConfig]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw when host header missing', async () => {
      // Arrange
      const context = createMockContext(
        { serviceId: 'service-123' },
        null,
        {}, // No host header
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([mockServiceConfig]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Host header is required');
    });

    it('should validate IP whitelist when enabled', async () => {
      // Arrange
      const configWithIP = {
        ...mockServiceConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: ['10.0.0.1', '192.168.1.0/24'],
      };
      const context = createMockContext(
        { serviceId: 'service-123' },
        null,
        { host: 'resume.example.com' },
        { remoteAddress: '172.16.0.1' }, // Not in whitelist
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }]) // No domain validation
        .mockResolvedValueOnce([configWithIP]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('IP address not authorized');
    });

    it('should allow IP in whitelist', async () => {
      // Arrange
      const configWithIP = {
        ...mockServiceConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: ['10.0.0.1'],
      };
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'resume.example.com',
        'x-forwarded-for': '10.0.0.1',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([configWithIP]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow IP in CIDR range', async () => {
      // Arrange
      const configWithIP = {
        ...mockServiceConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: ['192.168.1.0/24'],
      };
      const context = createMockContext(
        { serviceId: 'service-123' },
        null,
        { host: 'resume.example.com' },
        { remoteAddress: '192.168.1.100' },
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([configWithIP]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw when in maintenance mode', async () => {
      // Arrange
      const maintenanceConfig = {
        ...mockServiceConfig,
        maintenanceMode: true,
        maintenanceMessage: 'System upgrade in progress',
      };
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'resume.example.com',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([maintenanceConfig]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('System upgrade in progress');
    });

    it('should use default maintenance message when none provided', async () => {
      // Arrange
      const maintenanceConfig = {
        ...mockServiceConfig,
        maintenanceMode: true,
        maintenanceMessage: null,
      };
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'resume.example.com',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([maintenanceConfig]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Service is under maintenance');
    });

    it('should extract IP from x-forwarded-for with multiple IPs', async () => {
      // Arrange
      const configWithIP = {
        ...mockServiceConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: ['10.0.0.1'],
      };
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'resume.example.com',
        'x-forwarded-for': '10.0.0.1, 192.168.1.1, 172.16.0.1',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([configWithIP]);

      // Act - should use first IP in chain
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should use x-real-ip header when x-forwarded-for not present', async () => {
      // Arrange
      const configWithIP = {
        ...mockServiceConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: ['10.0.0.2'],
      };
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'resume.example.com',
        'x-real-ip': '10.0.0.2',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([configWithIP]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw when unable to determine client IP', async () => {
      // Arrange
      const configWithIP = {
        ...mockServiceConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: ['10.0.0.1'],
      };
      const context = createMockContext(
        { serviceId: 'service-123' },
        null,
        { host: 'resume.example.com' }, // No IP headers
      );
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([configWithIP]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Unable to determine client IP');
    });

    it('should skip domain validation when domains array is empty', async () => {
      // Arrange
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'any-domain.com',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ ...mockService, domains: [] }])
        .mockResolvedValueOnce([mockServiceConfig]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should skip domain validation when config disables it', async () => {
      // Arrange
      const configNoDomain = {
        ...mockServiceConfig,
        domainValidation: false,
      };
      const context = createMockContext({ serviceId: 'service-123' }, null, {
        host: 'any-domain.com',
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockService])
        .mockResolvedValueOnce([configNoDomain]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
