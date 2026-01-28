/**
 * Integration tests for auth-bff <-> audit-service gRPC communication
 *
 * These tests verify the integration between auth-bff and audit-service,
 * testing authentication event logging and audit trail creation.
 *
 * The audit-service integration is designed to be non-blocking - authentication
 * operations should succeed even if audit logging fails.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest';
import { of, throwError } from 'rxjs';
import {
  AuditGrpcClient,
  AuthEventType,
  AccountType,
  AuthEventResult,
  LogAuthEventRequest,
} from '../../src/grpc-clients';
import { AdminService } from '../../src/admin/admin.service';
import { UserService } from '../../src/user/user.service';
import { AuthGrpcClient, IdentityGrpcClient } from '../../src/grpc-clients';
import { SessionService } from '../../src/session/session.service';
import { Request, Response } from 'express';
import { createNetworkError, createTimeoutError } from '../utils';

// Mock @nestjs/microservices for gRPC client creation
vi.mock('@nestjs/microservices', async () => {
  const actual = await vi.importActual('@nestjs/microservices');
  return {
    ...actual,
    ClientProxyFactory: {
      create: vi.fn(() => ({
        getService: vi.fn(() => ({})),
      })),
    },
  };
});

describe('Auth-BFF <-> Audit-Service gRPC Integration', () => {
  let module: TestingModule;
  let auditGrpcClient: AuditGrpcClient;
  let adminService: AdminService;
  let userService: UserService;
  let mockAuditService: Record<string, MockInstance>;
  let mockAuthService: Record<string, MockInstance>;
  let mockIdentityService: Record<string, MockInstance>;
  let mockSessionService: Record<string, MockInstance>;

  const mockRequest = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'x-forwarded-for': '192.168.1.100',
      'accept-language': 'en-US',
      'x-service-id': 'service-123',
    },
    socket: { remoteAddress: '127.0.0.1' },
    cookies: { girok_session: 'test-session-id' },
  } as unknown as Request;

  const mockResponse = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    mockAuditService = {
      logAuthEvent: vi.fn(),
    };

    mockAuthService = {
      adminLogin: vi.fn(),
      adminLoginMfa: vi.fn(),
      adminLogout: vi.fn(),
      adminGetActiveSessions: vi.fn(),
      adminRevokeAllSessions: vi.fn(),
      adminSetupMfa: vi.fn(),
      adminVerifyMfa: vi.fn(),
      adminDisableMfa: vi.fn(),
      adminRegenerateBackupCodes: vi.fn(),
      adminChangePassword: vi.fn(),
      adminRefreshSession: vi.fn(),
    };

    mockIdentityService = {
      getAccount: vi.fn(),
      getAccountByEmail: vi.fn(),
      createAccount: vi.fn(),
      validatePassword: vi.fn(),
      createSession: vi.fn(),
      recordLoginAttempt: vi.fn(),
      setupMfa: vi.fn(),
      verifyMfaSetup: vi.fn(),
      verifyMfaCode: vi.fn(),
      disableMfa: vi.fn(),
      getBackupCodes: vi.fn(),
      regenerateBackupCodes: vi.fn(),
      useBackupCode: vi.fn(),
      changePassword: vi.fn(),
      revokeAllSessions: vi.fn(),
    };

    mockSessionService = {
      createSession: vi.fn(),
      getSession: vi.fn(),
      validateSession: vi.fn(),
      destroySession: vi.fn(),
      setMfaVerified: vi.fn(),
      refreshSession: vi.fn(),
      getActiveSessions: vi.fn(),
      extractMetadata: vi.fn().mockReturnValue({
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.100',
        deviceType: 'desktop',
      }),
      getDeviceFingerprint: vi.fn().mockReturnValue('mock-fingerprint-hash'),
      getSessionWithTokens: vi.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AuditGrpcClient,
        AdminService,
        UserService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
        {
          provide: AuthGrpcClient,
          useValue: mockAuthService,
        },
        {
          provide: IdentityGrpcClient,
          useValue: mockIdentityService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: HttpService,
          useValue: {
            post: vi.fn().mockReturnValue(
              of({
                data: {
                  valid: true,
                  service: {
                    id: 'service-123',
                    slug: 'my-girok',
                    name: 'My Girok',
                    domainValidation: false,
                  },
                },
              }),
            ),
          },
        },
      ],
    }).compile();

    auditGrpcClient = module.get<AuditGrpcClient>(AuditGrpcClient);
    adminService = module.get<AdminService>(AdminService);
    userService = module.get<UserService>(UserService);

    // @ts-expect-error - Accessing private property for testing
    auditGrpcClient.auditService = mockAuditService;
    // @ts-expect-error - Accessing private property for testing
    auditGrpcClient.isConnected = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Direct Audit Client Integration', () => {
    it('should log authentication events successfully', async () => {
      mockAuditService.logAuthEvent.mockReturnValue(
        of({
          success: true,
          eventId: 'audit-event-uuid-123',
          message: 'Event logged',
        }),
      );

      const request: LogAuthEventRequest = {
        eventType: AuthEventType.LOGIN_SUCCESS,
        accountType: AccountType.USER,
        accountId: 'user-uuid-123',
        sessionId: 'session-uuid-456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        deviceFingerprint: 'fingerprint-hash-xyz',
        countryCode: 'US',
        result: AuthEventResult.SUCCESS,
      };

      const result = await auditGrpcClient.logAuthEvent(request);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('audit-event-uuid-123');
    });

    it('should handle audit service unavailable gracefully', async () => {
      // @ts-expect-error - Accessing private property for testing
      auditGrpcClient.isConnected = false;

      const request: LogAuthEventRequest = {
        eventType: AuthEventType.LOGIN_SUCCESS,
        accountType: AccountType.USER,
        accountId: 'user-uuid-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        result: AuthEventResult.SUCCESS,
      };

      const result = await auditGrpcClient.logAuthEvent(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not connected');
    });

    it('should handle network errors gracefully', async () => {
      const networkError = createNetworkError('audit-service:50054 - Connection refused');
      mockAuditService.logAuthEvent.mockReturnValue(throwError(() => networkError));

      const request: LogAuthEventRequest = {
        eventType: AuthEventType.LOGIN_FAILED,
        accountType: AccountType.USER,
        accountId: 'user-uuid-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        result: AuthEventResult.FAILURE,
        failureReason: 'Invalid credentials',
      };

      const result = await auditGrpcClient.logAuthEvent(request);

      expect(result.success).toBe(false);
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'event-123', message: '' }),
      );
    });

    it('should log login success events', async () => {
      await auditGrpcClient.logLoginSuccess({
        accountId: 'user-123',
        accountType: AccountType.USER,
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'fp-hash',
        countryCode: 'KR',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_SUCCESS,
          accountType: AccountType.USER,
          result: AuthEventResult.SUCCESS,
        }),
      );
    });

    it('should log login failed events with failure reason', async () => {
      await auditGrpcClient.logLoginFailed({
        accountId: 'user-123',
        accountType: AccountType.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        failureReason: 'Invalid password',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_FAILED,
          result: AuthEventResult.FAILURE,
          failureReason: 'Invalid password',
        }),
      );
    });

    it('should log logout events', async () => {
      await auditGrpcClient.logLogout({
        accountId: 'admin-123',
        accountType: AccountType.ADMIN,
        sessionId: 'session-789',
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGOUT,
          accountType: AccountType.ADMIN,
        }),
      );
    });

    it('should log MFA verified events', async () => {
      await auditGrpcClient.logMfaVerified({
        accountId: 'user-123',
        accountType: AccountType.USER,
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'totp',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.MFA_VERIFIED,
          result: AuthEventResult.SUCCESS,
          metadata: { method: 'totp' },
        }),
      );
    });

    it('should log password changed events', async () => {
      await auditGrpcClient.logPasswordChanged({
        accountId: 'user-123',
        accountType: AccountType.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.PASSWORD_CHANGED,
          result: AuthEventResult.SUCCESS,
        }),
      );
    });
  });

  describe('Audit Integration in Admin Flow', () => {
    it('should log successful admin login', async () => {
      const mockAdmin = {
        id: 'admin-uuid-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        scope: 1,
        mfaRequired: false,
        mfaEnabled: false,
        role: { permissions: [] },
      };

      mockAuthService.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: false,
        admin: mockAdmin,
        session: { id: 'session-123', mfaVerified: false },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'ADMIN',
        accountId: mockAdmin.id,
      });

      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'audit-1', message: '' }),
      );

      await adminService.login(mockRequest, mockResponse, {
        email: 'admin@example.com',
        password: 'Password123!',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_SUCCESS,
          accountType: AccountType.ADMIN,
        }),
      );
    });

    it('should log failed admin login', async () => {
      mockAuthService.adminLogin.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'audit-2', message: '' }),
      );

      await expect(
        adminService.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow();

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_FAILED,
          accountType: AccountType.ADMIN,
        }),
      );
    });
  });

  describe('Audit Integration in User Flow', () => {
    it('should log successful user login', async () => {
      const mockAccount = {
        id: 'user-uuid-456',
        email: 'user@example.com',
        username: 'testuser',
        status: 1,
        mode: 1,
        mfaEnabled: false,
        emailVerified: true,
      };

      mockIdentityService.getAccountByEmail.mockResolvedValue(mockAccount);
      mockIdentityService.validatePassword.mockResolvedValue({ valid: true, message: '' });
      mockIdentityService.createSession.mockResolvedValue({
        session: { id: 'session-456', accountId: mockAccount.id, sessionContext: 1 },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      mockIdentityService.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });

      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'USER',
        accountId: mockAccount.id,
      });

      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'audit-6', message: '' }),
      );

      await userService.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_SUCCESS,
          accountType: AccountType.USER,
        }),
      );
    });

    it('should log failed user login', async () => {
      const mockAccount = {
        id: 'user-uuid-456',
        email: 'user@example.com',
        username: 'testuser',
        status: 1,
        mode: 1,
      };

      mockIdentityService.getAccountByEmail.mockResolvedValue(mockAccount);
      mockIdentityService.validatePassword.mockResolvedValue({
        valid: false,
        message: 'Invalid password',
      });
      mockIdentityService.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
        failedAttempts: 1,
        maxAttempts: 5,
      });

      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'audit-7', message: '' }),
      );

      await expect(
        userService.login(mockRequest, mockResponse, {
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow();

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_FAILED,
          accountType: AccountType.USER,
        }),
      );
    });
  });

  describe('Non-Blocking Audit Behavior', () => {
    it('should not fail admin login when audit service is unavailable', async () => {
      const mockAdmin = {
        id: 'admin-uuid-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        scope: 1,
        mfaRequired: false,
        mfaEnabled: false,
        role: { permissions: [] },
      };

      mockAuthService.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: false,
        admin: mockAdmin,
        session: { id: 'session-123', mfaVerified: false },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'ADMIN',
        accountId: mockAdmin.id,
      });

      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: false, eventId: '', message: 'Service unavailable' }),
      );

      const result = await adminService.login(mockRequest, mockResponse, {
        email: 'admin@example.com',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
    });

    it('should not fail user login when audit service throws error', async () => {
      const mockAccount = {
        id: 'user-uuid-456',
        email: 'user@example.com',
        username: 'testuser',
        status: 1,
        mode: 1,
        mfaEnabled: false,
        emailVerified: true,
      };

      mockIdentityService.getAccountByEmail.mockResolvedValue(mockAccount);
      mockIdentityService.validatePassword.mockResolvedValue({ valid: true, message: '' });
      mockIdentityService.createSession.mockResolvedValue({
        session: { id: 'session-456', accountId: mockAccount.id, sessionContext: 1 },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      mockIdentityService.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });

      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'USER',
        accountId: mockAccount.id,
      });

      mockAuditService.logAuthEvent.mockReturnValue(
        throwError(() => createNetworkError('Connection refused')),
      );

      const result = await userService.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should handle audit service timeout without blocking authentication', async () => {
      const mockSession = {
        id: 'session-123',
        accountType: 'ADMIN',
        accountId: 'admin-uuid-123',
        email: 'admin@example.com',
      };

      mockSessionService.getSession.mockResolvedValue(mockSession);
      mockAuthService.adminLogout.mockResolvedValue({ success: true });
      mockSessionService.destroySession.mockResolvedValue(true);

      mockAuditService.logAuthEvent.mockReturnValue(
        throwError(() => createTimeoutError('Deadline exceeded')),
      );

      const result = await adminService.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
    });
  });

  describe('Audit Event Types Coverage', () => {
    beforeEach(() => {
      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'event-id', message: '' }),
      );
    });

    it('should use correct event type for LOGIN_SUCCESS', async () => {
      await auditGrpcClient.logLoginSuccess({
        accountId: 'user-123',
        accountType: AccountType.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_SUCCESS,
        }),
      );
    });

    it('should use correct event type for MFA_FAILED', async () => {
      await auditGrpcClient.logMfaFailed({
        accountId: 'user-123',
        accountType: AccountType.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        failureReason: 'Invalid code',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.MFA_FAILED,
        }),
      );
    });

    it('should use correct event type for SESSION_REVOKED', async () => {
      await auditGrpcClient.logSessionRevoked({
        accountId: 'user-123',
        accountType: AccountType.USER,
        sessionId: 'revoked-session',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.SESSION_REVOKED,
        }),
      );
    });

    it('should use correct event type for TOKEN_REFRESHED', async () => {
      await auditGrpcClient.logTokenRefreshed({
        accountId: 'user-123',
        accountType: AccountType.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.TOKEN_REFRESHED,
        }),
      );
    });
  });

  describe('Account Type Differentiation', () => {
    beforeEach(() => {
      mockAuditService.logAuthEvent.mockReturnValue(
        of({ success: true, eventId: 'event-id', message: '' }),
      );
    });

    it('should log USER account type correctly', async () => {
      await auditGrpcClient.logLoginSuccess({
        accountId: 'user-123',
        accountType: AccountType.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: AccountType.USER,
        }),
      );
    });

    it('should log ADMIN account type correctly', async () => {
      await auditGrpcClient.logLoginSuccess({
        accountId: 'admin-123',
        accountType: AccountType.ADMIN,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: AccountType.ADMIN,
        }),
      );
    });

    it('should log OPERATOR account type correctly', async () => {
      await auditGrpcClient.logLoginSuccess({
        accountId: 'operator-123',
        accountType: AccountType.OPERATOR,
        ipAddress: '172.16.0.1',
        userAgent: 'Firefox/121.0',
      });

      expect(mockAuditService.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: AccountType.OPERATOR,
        }),
      );
    });
  });
});
