import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminPayload } from '@my-girok/types';
import { EmployeeAuthGuard } from './employee-auth.guard';

describe('EmployeeAuthGuard', () => {
  let guard: EmployeeAuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    verifyAsync: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<EmployeeAuthGuard>(EmployeeAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockExecutionContext = (authHeader?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
        }),
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException if no token is provided', async () => {
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should throw UnauthorizedException if token type is invalid', async () => {
      const context = createMockExecutionContext('Basic invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const context = createMockExecutionContext('Bearer invalid-token');
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException if token type is not ADMIN_ACCESS', async () => {
      const context = createMockExecutionContext('Bearer valid-token');
      const payload = { type: 'USER_ACCESS', sub: 'user-123' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid token type');
    });

    it('should allow access with valid ADMIN_ACCESS token', async () => {
      const context = createMockExecutionContext('Bearer valid-token');
      const payload: AdminPayload = {
        sub: 'admin-123',
        email: 'employee@example.com',
        name: 'Test Employee',
        type: 'ADMIN_ACCESS',
        accountMode: 'UNIFIED',
        scope: 'TENANT',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        roleName: 'employee',
        level: 1,
        permissions: [],
        services: {},
      };
      mockJwtService.verifyAsync.mockResolvedValueOnce(payload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });

    it('should attach employee to request', async () => {
      const request = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext;

      const payload: AdminPayload = {
        sub: 'admin-123',
        email: 'employee@example.com',
        name: 'Test Employee',
        type: 'ADMIN_ACCESS',
        accountMode: 'UNIFIED',
        scope: 'TENANT',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        roleName: 'employee',
        level: 1,
        permissions: [],
        services: {},
      };
      mockJwtService.verifyAsync.mockResolvedValueOnce(payload);

      await guard.canActivate(context);

      expect((request as any).employee).toEqual(payload);
    });
  });
});
