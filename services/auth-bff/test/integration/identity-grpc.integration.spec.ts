/**
 * Integration tests for auth-bff <-> identity-service gRPC communication
 *
 * These tests verify the integration between auth-bff and identity-service,
 * testing user authentication, registration, session management, and MFA flows.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest';
import { of, throwError } from 'rxjs';
import { IdentityGrpcClient } from '../../src/grpc-clients';
import { UserService } from '../../src/user/user.service';
import { AuditGrpcClient } from '../../src/grpc-clients';
import { SessionService } from '../../src/session/session.service';
import { Request, Response } from 'express';
import { createNetworkError, createNotFoundError } from '../utils';

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

describe('Auth-BFF <-> Identity-Service gRPC Integration', () => {
  let module: TestingModule;
  let userService: UserService;
  let identityGrpcClient: IdentityGrpcClient;
  let mockIdentityService: Record<string, MockInstance>;
  let mockSessionService: Record<string, MockInstance>;
  let mockAuditClient: Record<string, MockInstance>;

  const mockRequest = {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      'x-forwarded-for': '203.0.113.50',
      'accept-language': 'ko-KR',
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
    mockIdentityService = {
      getAccount: vi.fn(),
      getAccountByEmail: vi.fn(),
      getAccountByUsername: vi.fn(),
      createAccount: vi.fn(),
      validatePassword: vi.fn(),
      createSession: vi.fn(),
      validateSession: vi.fn(),
      revokeSession: vi.fn(),
      revokeAllSessions: vi.fn(),
      changePassword: vi.fn(),
      setupMfa: vi.fn(),
      verifyMfaSetup: vi.fn(),
      verifyMfaCode: vi.fn(),
      disableMfa: vi.fn(),
      getBackupCodes: vi.fn(),
      regenerateBackupCodes: vi.fn(),
      useBackupCode: vi.fn(),
      recordLoginAttempt: vi.fn(),
      lockAccount: vi.fn(),
      unlockAccount: vi.fn(),
      getProfile: vi.fn(),
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
        userAgent: 'Mozilla/5.0 (iPhone)',
        ipAddress: '203.0.113.50',
        deviceType: 'mobile',
      }),
      getDeviceFingerprint: vi.fn().mockReturnValue('mobile-fingerprint-hash'),
    };

    mockAuditClient = {
      logLoginSuccess: vi.fn(),
      logLoginFailed: vi.fn(),
      logMfaVerified: vi.fn(),
      logMfaFailed: vi.fn(),
      logLogout: vi.fn(),
      logPasswordChanged: vi.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        UserService,
        IdentityGrpcClient,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: AuditGrpcClient,
          useValue: mockAuditClient,
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

    userService = module.get<UserService>(UserService);
    identityGrpcClient = module.get<IdentityGrpcClient>(IdentityGrpcClient);

    // @ts-expect-error - Accessing private property for testing
    identityGrpcClient.identityService = mockIdentityService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    it('should successfully register a new user', async () => {
      const mockAccount = {
        id: 'user-uuid-123',
        email: 'newuser@example.com',
        username: 'newuser',
        status: 1,
        mode: 1,
        mfaEnabled: false,
        emailVerified: false,
        createdAt: { seconds: Date.now() / 1000, nanos: 0 },
        updatedAt: { seconds: Date.now() / 1000, nanos: 0 },
      };

      mockIdentityService.getAccountByEmail.mockReturnValue(
        throwError(() => new Error('Not found')),
      );
      mockIdentityService.createAccount.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.createSession.mockReturnValue(
        of({
          session: {
            id: 'session-uuid-123',
            accountId: mockAccount.id,
            sessionContext: 1,
            createdAt: { seconds: Date.now() / 1000, nanos: 0 },
            expiresAt: { seconds: (Date.now() + 86400000) / 1000, nanos: 0 },
            lastActivityAt: { seconds: Date.now() / 1000, nanos: 0 },
          },
          accessToken: 'jwt-access-token-xyz',
          refreshToken: 'jwt-refresh-token-abc',
        }),
      );

      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'USER',
        accountId: mockAccount.id,
        email: mockAccount.email,
      });

      const result = await userService.register(mockRequest, mockResponse, {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePassword123!',
        countryCode: 'KR',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-uuid-123');

      expect(mockIdentityService.createAccount).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePassword123!',
        provider: 1,
        mode: 1,
        countryCode: 'KR',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      });
    });

    it('should reject registration when email already exists', async () => {
      const existingAccount = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        username: 'existinguser',
        status: 1,
        mode: 1,
      };

      mockIdentityService.getAccountByEmail.mockReturnValue(of({ account: existingAccount }));

      await expect(
        userService.register(mockRequest, mockResponse, {
          email: 'existing@example.com',
          username: 'newuser',
          password: 'Password123!',
        }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('User Authentication Flow', () => {
    it('should authenticate user without MFA', async () => {
      const mockAccount = {
        id: 'user-uuid-456',
        email: 'user@example.com',
        username: 'testuser',
        status: 1,
        mode: 1,
        mfaEnabled: false,
        emailVerified: true,
        createdAt: { seconds: Date.now() / 1000, nanos: 0 },
        updatedAt: { seconds: Date.now() / 1000, nanos: 0 },
      };

      mockIdentityService.getAccountByEmail.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.validatePassword.mockReturnValue(of({ valid: true, message: '' }));
      mockIdentityService.createSession.mockReturnValue(
        of({
          session: {
            id: 'session-uuid-456',
            accountId: mockAccount.id,
            sessionContext: 1,
            createdAt: { seconds: Date.now() / 1000, nanos: 0 },
            expiresAt: { seconds: (Date.now() + 86400000) / 1000, nanos: 0 },
            lastActivityAt: { seconds: Date.now() / 1000, nanos: 0 },
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      );
      mockIdentityService.recordLoginAttempt.mockReturnValue(
        of({ accountLocked: false, failedAttempts: 0, maxAttempts: 5 }),
      );

      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'USER',
        accountId: mockAccount.id,
      });

      const result = await userService.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'CorrectPassword123!',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('user@example.com');
      expect(mockAuditClient.logLoginSuccess).toHaveBeenCalled();
    });

    it('should return MFA challenge when user has MFA enabled', async () => {
      const mockAccount = {
        id: 'user-uuid-789',
        email: 'mfauser@example.com',
        username: 'mfauser',
        status: 1,
        mode: 1,
        mfaEnabled: true,
        emailVerified: true,
      };

      mockIdentityService.getAccountByEmail.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.validatePassword.mockReturnValue(of({ valid: true, message: '' }));

      const result = await userService.login(mockRequest, mockResponse, {
        email: 'mfauser@example.com',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(result.mfaRequired).toBe(true);
      expect(result.challengeId).toBeDefined();
      expect(result.availableMethods).toContain('totp');
    });

    it('should reject login with invalid credentials', async () => {
      const mockAccount = {
        id: 'user-uuid-456',
        email: 'user@example.com',
        username: 'testuser',
        status: 1,
        mode: 1,
      };

      mockIdentityService.getAccountByEmail.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.validatePassword.mockReturnValue(
        of({ valid: false, message: 'Invalid password' }),
      );
      mockIdentityService.recordLoginAttempt.mockReturnValue(
        of({ accountLocked: false, failedAttempts: 1, maxAttempts: 5 }),
      );

      await expect(
        userService.login(mockRequest, mockResponse, {
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(mockAuditClient.logLoginFailed).toHaveBeenCalled();
    });

    it('should reject login when account is locked', async () => {
      const mockAccount = {
        id: 'user-uuid-456',
        email: 'user@example.com',
        username: 'testuser',
        status: 1,
        mode: 1,
      };

      mockIdentityService.getAccountByEmail.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.validatePassword.mockReturnValue(
        of({ valid: false, message: 'Invalid password' }),
      );
      mockIdentityService.recordLoginAttempt.mockReturnValue(
        of({
          accountLocked: true,
          failedAttempts: 5,
          maxAttempts: 5,
          lockedUntil: { seconds: (Date.now() + 900000) / 1000, nanos: 0 },
        }),
      );

      await expect(
        userService.login(mockRequest, mockResponse, {
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow('Account locked due to too many failed attempts');
    });
  });

  describe('User MFA Flow', () => {
    it('should complete MFA login with TOTP code', async () => {
      const mockAccount = {
        id: 'user-uuid-789',
        email: 'mfauser@example.com',
        username: 'mfauser',
        status: 1,
        mode: 1,
        mfaEnabled: true,
        emailVerified: true,
      };

      // Setup: login returns MFA challenge
      mockIdentityService.getAccountByEmail.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.validatePassword.mockReturnValue(of({ valid: true, message: '' }));

      const loginResult = await userService.login(mockRequest, mockResponse, {
        email: 'mfauser@example.com',
        password: 'Password123!',
      });

      const challengeId = loginResult.challengeId!;

      // Complete MFA
      mockIdentityService.verifyMfaCode.mockReturnValue(
        of({ success: true, message: 'Code verified' }),
      );
      mockIdentityService.getAccount.mockReturnValue(of({ account: mockAccount }));
      mockIdentityService.createSession.mockReturnValue(
        of({
          session: { id: 'session-uuid-mfa', accountId: mockAccount.id, sessionContext: 1 },
          accessToken: 'mfa-access-token',
          refreshToken: 'mfa-refresh-token',
        }),
      );
      mockIdentityService.recordLoginAttempt.mockReturnValue(
        of({ accountLocked: false, failedAttempts: 0, maxAttempts: 5 }),
      );
      mockSessionService.createSession.mockResolvedValue({
        id: 'bff-session-id',
        accountType: 'USER',
        accountId: mockAccount.id,
      });

      const mfaResult = await userService.loginMfa(
        mockRequest,
        mockResponse,
        challengeId,
        '123456',
        'totp',
      );

      expect(mfaResult.success).toBe(true);
      expect(mfaResult.user).toBeDefined();
      expect(mockAuditClient.logMfaVerified).toHaveBeenCalled();
    });
  });

  describe('User Session Management', () => {
    const mockSession = {
      id: 'session-123',
      accountType: 'USER',
      accountId: 'user-uuid-456',
      email: 'user@example.com',
      mfaVerified: false,
      mfaRequired: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    };

    it('should revoke all sessions except current', async () => {
      mockIdentityService.revokeAllSessions.mockReturnValue(
        of({
          success: true,
          revokedCount: 2,
          message: 'Sessions revoked',
        }),
      );

      const result = await userService.revokeAllOtherSessions(mockSession);

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(2);
    });
  });

  describe('User MFA Management', () => {
    const mockSession = {
      id: 'session-123',
      accountType: 'USER',
      accountId: 'user-uuid-456',
      email: 'user@example.com',
      mfaVerified: false,
      mfaRequired: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    };

    it('should setup MFA for user', async () => {
      mockIdentityService.setupMfa.mockReturnValue(
        of({
          success: true,
          secret: 'SECRETBASE32KEY',
          qrCodeUri: 'otpauth://totp/MyApp:user@example.com?secret=SECRETBASE32KEY&issuer=MyApp',
          backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5', 'code6', 'code7', 'code8'],
          message: 'MFA setup initiated',
        }),
      );

      const result = await userService.setupMfa(mockSession);

      expect(result.secret).toBe('SECRETBASE32KEY');
      expect(result.qrCodeUri).toContain('otpauth://totp/');
      expect(result.backupCodes).toHaveLength(8);
    });

    it('should verify MFA setup with valid TOTP code', async () => {
      mockIdentityService.verifyMfaSetup.mockReturnValue(
        of({ success: true, message: 'MFA enabled successfully' }),
      );

      const result = await userService.verifyMfaSetup(mockSession, '123456');

      expect(result.success).toBe(true);
    });
  });

  describe('User Password Management', () => {
    const mockSession = {
      id: 'session-123',
      accountType: 'USER',
      accountId: 'user-uuid-456',
      email: 'user@example.com',
      mfaVerified: false,
      mfaRequired: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    };

    it('should change password successfully', async () => {
      mockIdentityService.changePassword.mockReturnValue(
        of({ success: true, message: 'Password changed successfully' }),
      );

      const result = await userService.changePassword(
        mockSession,
        'OldPassword123!',
        'NewSecurePassword456!',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return null for getAccount when user not found', async () => {
      mockIdentityService.getAccount.mockReturnValue(
        throwError(() => createNotFoundError('Account not found')),
      );

      const result = await identityGrpcClient.getAccount('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const unavailableError = createNetworkError('identity-service:50051 - Connection refused');
      mockIdentityService.getAccountByEmail.mockReturnValue(throwError(() => unavailableError));
      mockIdentityService.recordLoginAttempt.mockReturnValue(
        of({ accountLocked: false, failedAttempts: 0, maxAttempts: 5 }),
      );

      await expect(
        userService.login(mockRequest, mockResponse, {
          email: 'user@example.com',
          password: 'password',
        }),
      ).rejects.toThrow();
    });
  });
});
