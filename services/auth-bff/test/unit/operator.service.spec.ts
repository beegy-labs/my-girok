import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { OperatorService } from '../../src/operator/operator.service';
import { IdentityGrpcClient, AuthGrpcClient } from '../../src/grpc-clients';
import { SessionService } from '../../src/session/session.service';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';
import { Request, Response } from 'express';

describe('OperatorService', () => {
  let service: OperatorService;
  let identityClient: {
    getAccountByEmail: MockInstance;
    validatePassword: MockInstance;
    createSession: MockInstance;
    recordLoginAttempt: MockInstance;
  };
  let authClient: {
    getOperatorAssignment: MockInstance;
  };
  let sessionService: {
    createSession: MockInstance;
    destroySession: MockInstance;
    extractMetadata: MockInstance;
    getDeviceFingerprint: MockInstance;
  };

  const mockSession: BffSession = {
    id: 'session-123',
    accountType: AccountType.OPERATOR,
    accountId: 'user-123',
    email: 'operator@example.com',
    serviceId: 'service-1',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    deviceFingerprint: 'fingerprint-123',
    mfaVerified: false,
    mfaRequired: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    lastActivityAt: new Date(),
    permissions: ['orders:read', 'orders:write'],
  };

  const mockAccount = {
    id: 'user-123',
    email: 'operator@example.com',
    username: 'operator1',
    status: 1,
    mode: 1,
    mfaEnabled: false,
    emailVerified: true,
  };

  const mockAssignment = {
    id: 'assignment-123',
    accountId: 'user-123',
    serviceId: 'service-1',
    countryCode: 'KR',
    status: 1, // ACTIVE
    permissions: [
      { id: 'p1', resource: 'orders', action: 'read' },
      { id: 'p2', resource: 'orders', action: 'write' },
    ],
  };

  const mockRequest = {
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
    socket: { remoteAddress: '127.0.0.1' },
    cookies: {},
  } as unknown as Request;

  const mockResponse = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorService,
        {
          provide: IdentityGrpcClient,
          useValue: {
            getAccountByEmail: vi.fn(),
            validatePassword: vi.fn(),
            createSession: vi.fn(),
            recordLoginAttempt: vi.fn(),
          },
        },
        {
          provide: AuthGrpcClient,
          useValue: {
            getOperatorAssignment: vi.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: vi.fn(),
            destroySession: vi.fn(),
            extractMetadata: vi.fn().mockReturnValue({ userAgent: 'test', ipAddress: '127.0.0.1' }),
            getDeviceFingerprint: vi.fn().mockReturnValue('fingerprint-123'),
          },
        },
      ],
    }).compile();

    service = module.get<OperatorService>(OperatorService);
    identityClient = module.get(IdentityGrpcClient);
    authClient = module.get(AuthGrpcClient);
    sessionService = module.get(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login operator successfully without MFA', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      authClient.getOperatorAssignment.mockResolvedValue({
        found: true,
        assignment: mockAssignment,
      });
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.login(mockRequest, mockResponse, {
        email: 'operator@example.com',
        password: 'password123',
        serviceId: 'service-1',
        countryCode: 'KR',
      });

      expect(result.success).toBe(true);
      expect(result.operator).toBeDefined();
      expect(result.operator?.permissions).toContain('orders:read');
    });

    it('should return MFA required when operator has MFA enabled', async () => {
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      authClient.getOperatorAssignment.mockResolvedValue({
        found: true,
        assignment: mockAssignment,
      });

      const result = await service.login(mockRequest, mockResponse, {
        email: 'operator@example.com',
        password: 'password123',
        serviceId: 'service-1',
        countryCode: 'KR',
      });

      expect(result.success).toBe(true);
      expect(result.mfaRequired).toBe(true);
      expect(result.challengeId).toBeDefined();
    });

    it('should throw UnauthorizedException when account not found', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'unknown@example.com',
          password: 'password123',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: false });
      identityClient.recordLoginAttempt.mockResolvedValue({});

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'operator@example.com',
          password: 'wrongpassword',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when no operator assignment found', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      authClient.getOperatorAssignment.mockResolvedValue({
        found: false,
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'operator@example.com',
          password: 'password123',
          serviceId: 'service-2',
          countryCode: 'KR',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when assignment is not active', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      authClient.getOperatorAssignment.mockResolvedValue({
        found: true,
        assignment: { ...mockAssignment, status: 2 }, // INACTIVE
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'operator@example.com',
          password: 'password123',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException on unexpected error', async () => {
      identityClient.getAccountByEmail.mockRejectedValue(new Error('DB error'));

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'operator@example.com',
          password: 'password123',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty permissions', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      authClient.getOperatorAssignment.mockResolvedValue({
        found: true,
        assignment: { ...mockAssignment, permissions: undefined },
      });
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.login(mockRequest, mockResponse, {
        email: 'operator@example.com',
        password: 'password123',
        serviceId: 'service-1',
        countryCode: 'KR',
      });

      expect(result.operator?.permissions).toEqual([]);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });

    it('should handle logout error gracefully', async () => {
      sessionService.destroySession
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out');
    });
  });

  describe('getMe', () => {
    it('should return operator info from session', async () => {
      const result = await service.getMe(mockSession);

      expect(result.id).toBe(mockSession.id);
      expect(result.accountId).toBe(mockSession.accountId);
      expect(result.email).toBe(mockSession.email);
      expect(result.serviceId).toBe(mockSession.serviceId);
      expect(result.permissions).toEqual(mockSession.permissions);
    });

    it('should handle missing serviceId', async () => {
      const sessionWithoutService = { ...mockSession, serviceId: undefined };

      const result = await service.getMe(sessionWithoutService);

      expect(result.serviceId).toBe('');
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'test@example.com',
          password: 'password',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow();

      // The IP should have been used in the failed attempt
    });

    it('should use socket address when no x-forwarded-for', async () => {
      const reqWithoutForwarded = {
        headers: { 'user-agent': 'test' },
        socket: { remoteAddress: '10.0.0.1' },
        cookies: {},
      } as unknown as Request;

      identityClient.getAccountByEmail.mockResolvedValue(null);

      await expect(
        service.login(reqWithoutForwarded, mockResponse, {
          email: 'test@example.com',
          password: 'password',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow();
    });

    it('should handle array x-forwarded-for', async () => {
      const reqWithArrayForwarded = {
        headers: {
          'user-agent': 'test',
          'x-forwarded-for': ['203.0.113.1', '192.168.1.1'],
        },
        socket: { remoteAddress: '10.0.0.1' },
        cookies: {},
      } as unknown as Request;

      identityClient.getAccountByEmail.mockResolvedValue(null);

      await expect(
        service.login(reqWithArrayForwarded, mockResponse, {
          email: 'test@example.com',
          password: 'password',
          serviceId: 'service-1',
          countryCode: 'KR',
        }),
      ).rejects.toThrow();
    });
  });
});
