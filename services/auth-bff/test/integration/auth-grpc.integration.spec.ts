/**
 * Integration tests for auth-bff <-> auth-service gRPC communication
 *
 * These tests verify the integration between auth-bff and auth-service,
 * testing admin authentication, session management, and MFA flows.
 *
 * The tests use mocked gRPC service responses to simulate the auth-service
 * behavior, allowing us to test the integration layer without requiring
 * the actual auth-service to be running.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthGrpcClient } from '../../src/grpc-clients';
import { AdminService } from '../../src/admin/admin.service';
import { AuditGrpcClient } from '../../src/grpc-clients';
import { SessionService } from '../../src/session/session.service';
import { Request, Response } from 'express';
import { createNetworkError, createTimeoutError, createUnauthenticatedError } from '../utils';

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

describe('Auth-BFF <-> Auth-Service gRPC Integration', () => {
  let module: TestingModule;
  let adminService: AdminService;
  let authGrpcClient: AuthGrpcClient;
  let mockAuthService: Record<string, MockInstance>;
  let mockSessionService: Record<string, MockInstance>;
  let mockAuditClient: Record<string, MockInstance>;

  const mockRequest = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'x-forwarded-for': '192.168.1.100',
      'accept-language': 'en-US',
    },
    socket: { remoteAddress: '127.0.0.1' },
    cookies: { girok_session: 'test-session-id' },
  } as unknown as Request;

  const mockResponse = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    // Create mock gRPC service methods
    mockAuthService = {
      adminLogin: vi.fn(),
      adminLoginMfa: vi.fn(),
      adminValidateSession: vi.fn(),
      adminRefreshSession: vi.fn(),
      adminLogout: vi.fn(),
      adminRevokeAllSessions: vi.fn(),
      adminGetActiveSessions: vi.fn(),
      adminSetupMfa: vi.fn(),
      adminVerifyMfa: vi.fn(),
      adminDisableMfa: vi.fn(),
      adminRegenerateBackupCodes: vi.fn(),
      adminChangePassword: vi.fn(),
      getOperatorAssignment: vi.fn(),
      getOperatorAssignmentPermissions: vi.fn(),
      checkPermission: vi.fn(),
      getOperatorPermissions: vi.fn(),
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
        AdminService,
        AuthGrpcClient,
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
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
    authGrpcClient = module.get<AuthGrpcClient>(AuthGrpcClient);

    // Inject mock gRPC service
    // @ts-expect-error - Accessing private property for testing
    authGrpcClient.authService = mockAuthService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Authentication Flow', () => {
    describe('adminLogin gRPC integration', () => {
      it('should successfully authenticate admin without MFA', async () => {
        const mockAdmin = {
          id: 'admin-uuid-123',
          email: 'admin@example.com',
          name: 'Test Admin',
          scope: 1,
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'SuperAdmin',
            permissions: [
              { id: 'p1', resource: 'users', action: 'read' },
              { id: 'p2', resource: 'users', action: 'write' },
            ],
          },
          isActive: true,
          mfaRequired: false,
          mfaEnabled: false,
        };

        const mockSession = {
          id: 'session-uuid-123',
          adminId: mockAdmin.id,
          mfaVerified: false,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          deviceFingerprint: 'mock-fingerprint',
          isActive: true,
          lastActivityAt: { seconds: Date.now() / 1000, nanos: 0 },
          expiresAt: { seconds: (Date.now() + 86400000) / 1000, nanos: 0 },
          createdAt: { seconds: Date.now() / 1000, nanos: 0 },
        };

        mockAuthService.adminLogin.mockReturnValue(
          of({
            success: true,
            mfaRequired: false,
            admin: mockAdmin,
            session: mockSession,
            accessToken: 'jwt-access-token-xyz',
            refreshToken: 'jwt-refresh-token-abc',
          }),
        );

        mockSessionService.createSession.mockResolvedValue({
          id: 'bff-session-id',
          accountType: 'ADMIN',
          accountId: mockAdmin.id,
          email: mockAdmin.email,
        });

        const result = await adminService.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'SecurePassword123!',
        });

        expect(result.success).toBe(true);
        expect(result.admin).toBeDefined();
        expect(result.admin?.id).toBe('admin-uuid-123');
        expect(result.admin?.email).toBe('admin@example.com');
        expect(result.mfaRequired).toBeUndefined();

        // Verify gRPC client was called with correct parameters
        expect(mockAuthService.adminLogin).toHaveBeenCalledWith({
          email: 'admin@example.com',
          password: 'SecurePassword123!',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'mock-fingerprint-hash',
        });

        // Verify audit logging
        expect(mockAuditClient.logLoginSuccess).toHaveBeenCalled();
      });

      it('should return MFA challenge when admin has MFA enabled', async () => {
        mockAuthService.adminLogin.mockReturnValue(
          of({
            success: true,
            mfaRequired: true,
            challengeId: 'mfa-challenge-uuid-456',
            availableMethods: [1, 2], // TOTP and Backup Code
            message: 'MFA verification required',
          }),
        );

        const result = await adminService.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'SecurePassword123!',
        });

        expect(result.success).toBe(true);
        expect(result.mfaRequired).toBe(true);
        expect(result.challengeId).toBe('mfa-challenge-uuid-456');
        expect(result.availableMethods).toContain('totp');
        expect(result.availableMethods).toContain('backup_code');
      });

      it('should handle authentication failure from auth-service', async () => {
        mockAuthService.adminLogin.mockReturnValue(
          of({
            success: false,
            message: 'Invalid email or password',
          }),
        );

        await expect(
          adminService.login(mockRequest, mockResponse, {
            email: 'admin@example.com',
            password: 'WrongPassword',
          }),
        ).rejects.toThrow('Invalid email or password');

        expect(mockAuditClient.logLoginFailed).toHaveBeenCalled();
      });

      it('should handle gRPC network error during login', async () => {
        const networkError = createNetworkError('Connection refused to auth-service:50052');
        mockAuthService.adminLogin.mockReturnValue(throwError(() => networkError));

        await expect(
          adminService.login(mockRequest, mockResponse, {
            email: 'admin@example.com',
            password: 'SecurePassword123!',
          }),
        ).rejects.toThrow();

        expect(mockAuditClient.logLoginFailed).toHaveBeenCalled();
      });

      it('should handle gRPC timeout during login', async () => {
        const timeoutError = createTimeoutError('Deadline exceeded');
        mockAuthService.adminLogin.mockReturnValue(throwError(() => timeoutError));

        await expect(
          adminService.login(mockRequest, mockResponse, {
            email: 'admin@example.com',
            password: 'SecurePassword123!',
          }),
        ).rejects.toThrow();
      });
    });

    describe('adminLoginMfa gRPC integration', () => {
      it('should complete MFA verification with TOTP code', async () => {
        const mockAdmin = {
          id: 'admin-uuid-123',
          email: 'admin@example.com',
          name: 'Test Admin',
          scope: 1,
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'SuperAdmin',
            permissions: [{ id: 'p1', resource: 'users', action: 'read' }],
          },
          isActive: true,
          mfaRequired: true,
          mfaEnabled: true,
        };

        mockAuthService.adminLoginMfa.mockReturnValue(
          of({
            success: true,
            message: 'MFA verification successful',
            admin: mockAdmin,
            session: {
              id: 'session-uuid-789',
              adminId: mockAdmin.id,
              mfaVerified: true,
            },
            accessToken: 'new-jwt-access-token',
            refreshToken: 'new-jwt-refresh-token',
          }),
        );

        mockSessionService.createSession.mockResolvedValue({
          id: 'bff-session-id',
          accountType: 'ADMIN',
          accountId: mockAdmin.id,
        });

        const result = await adminService.loginMfa(mockRequest, mockResponse, {
          challengeId: 'mfa-challenge-uuid-456',
          code: '123456',
          method: 'totp',
        });

        expect(result.success).toBe(true);
        expect(result.admin).toBeDefined();
        expect(result.admin.id).toBe('admin-uuid-123');

        // Verify gRPC client was called with correct MFA method (1 = TOTP)
        expect(mockAuthService.adminLoginMfa).toHaveBeenCalledWith({
          challengeId: 'mfa-challenge-uuid-456',
          code: '123456',
          method: 1,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'mock-fingerprint-hash',
        });

        expect(mockAuditClient.logMfaVerified).toHaveBeenCalled();
      });

      it('should complete MFA verification with backup code', async () => {
        const mockAdmin = {
          id: 'admin-uuid-123',
          email: 'admin@example.com',
          name: 'Test Admin',
          scope: 1,
          mfaRequired: true,
          mfaEnabled: true,
        };

        mockAuthService.adminLoginMfa.mockReturnValue(
          of({
            success: true,
            admin: mockAdmin,
            session: { id: 'session-uuid', mfaVerified: true },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          }),
        );

        mockSessionService.createSession.mockResolvedValue({
          id: 'bff-session-id',
          accountType: 'ADMIN',
          accountId: mockAdmin.id,
        });

        await adminService.loginMfa(mockRequest, mockResponse, {
          challengeId: 'challenge-id',
          code: 'ABCD1234EFGH',
          method: 'backup_code',
        });

        // Verify method 2 = backup_code
        expect(mockAuthService.adminLoginMfa).toHaveBeenCalledWith(
          expect.objectContaining({ method: 2 }),
        );
      });

      it('should handle invalid MFA code from auth-service', async () => {
        mockAuthService.adminLoginMfa.mockReturnValue(
          of({
            success: false,
            message: 'Invalid verification code',
          }),
        );

        await expect(
          adminService.loginMfa(mockRequest, mockResponse, {
            challengeId: 'challenge-id',
            code: '000000',
            method: 'totp',
          }),
        ).rejects.toThrow('Invalid verification code');

        expect(mockAuditClient.logMfaFailed).toHaveBeenCalled();
      });
    });
  });

  describe('Admin Session Management Flow', () => {
    const mockSession = {
      id: 'session-123',
      accountType: 'ADMIN',
      accountId: 'admin-uuid-123',
      email: 'admin@example.com',
      accessToken: 'encrypted-access-token',
      refreshToken: 'encrypted-refresh-token',
      deviceFingerprint: 'fingerprint-hash',
      mfaVerified: true,
      mfaRequired: true,
      permissions: ['users:read', 'users:write'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    };

    describe('adminValidateSession gRPC integration', () => {
      it('should validate active session through auth-service', async () => {
        mockAuthService.adminValidateSession.mockReturnValue(
          of({
            valid: true,
            adminId: 'admin-uuid-123',
            sessionId: 'session-123',
            mfaVerified: true,
            expiresAt: { seconds: (Date.now() + 86400000) / 1000, nanos: 0 },
            message: '',
          }),
        );

        const result = await authGrpcClient.adminValidateSession('hashed-token-value');

        expect(result.valid).toBe(true);
        expect(result.adminId).toBe('admin-uuid-123');
        expect(result.sessionId).toBe('session-123');
      });

      it('should return invalid for expired session', async () => {
        mockAuthService.adminValidateSession.mockReturnValue(
          of({
            valid: false,
            adminId: '',
            sessionId: '',
            mfaVerified: false,
            message: 'Session expired',
          }),
        );

        const result = await authGrpcClient.adminValidateSession('expired-token-hash');

        expect(result.valid).toBe(false);
        expect(result.message).toBe('Session expired');
      });
    });

    describe('adminRefreshSession gRPC integration', () => {
      it('should refresh session with new tokens', async () => {
        mockAuthService.adminRefreshSession.mockReturnValue(
          of({
            success: true,
            accessToken: 'new-access-token-xyz',
            refreshToken: 'new-refresh-token-abc',
            expiresAt: { seconds: (Date.now() + 86400000) / 1000, nanos: 0 },
            message: 'Session refreshed',
          }),
        );

        const result = await authGrpcClient.adminRefreshSession('refresh-token-hash');

        expect(result.success).toBe(true);
        expect(result.accessToken).toBe('new-access-token-xyz');
        expect(result.refreshToken).toBe('new-refresh-token-abc');
      });

      it('should handle refresh token expiration', async () => {
        mockAuthService.adminRefreshSession.mockReturnValue(
          of({
            success: false,
            accessToken: '',
            refreshToken: '',
            message: 'Refresh token expired',
          }),
        );

        const result = await authGrpcClient.adminRefreshSession('expired-refresh-token');

        expect(result.success).toBe(false);
        expect(result.message).toBe('Refresh token expired');
      });
    });

    describe('adminLogout gRPC integration', () => {
      it('should logout and invalidate session through auth-service', async () => {
        mockSessionService.getSession.mockResolvedValue(mockSession);
        mockAuthService.adminLogout.mockReturnValue(
          of({
            success: true,
            message: 'Session terminated',
          }),
        );
        mockSessionService.destroySession.mockResolvedValue(true);

        const result = await adminService.logout(mockRequest, mockResponse);

        expect(result.success).toBe(true);
        expect(mockAuthService.adminLogout).toHaveBeenCalled();
        expect(mockAuditClient.logLogout).toHaveBeenCalled();
      });

      it('should handle logout when auth-service is unavailable', async () => {
        mockSessionService.getSession.mockResolvedValue(mockSession);
        mockAuthService.adminLogout.mockReturnValue(
          throwError(() => createNetworkError('Service unavailable')),
        );
        mockSessionService.destroySession.mockResolvedValue(true);

        // Should still succeed by destroying local session
        const result = await adminService.logout(mockRequest, mockResponse);

        expect(result.success).toBe(true);
        expect(mockSessionService.destroySession).toHaveBeenCalled();
      });
    });

    describe('adminGetActiveSessions gRPC integration', () => {
      it('should retrieve all active sessions for admin', async () => {
        const activeSessions = [
          {
            id: 'session-1',
            adminId: 'admin-uuid-123',
            deviceFingerprint: 'fp-1',
            ipAddress: '192.168.1.100',
            userAgent: 'Chrome/120.0',
            mfaVerified: true,
            isActive: true,
            createdAt: { seconds: Date.now() / 1000, nanos: 0 },
            lastActivityAt: { seconds: Date.now() / 1000, nanos: 0 },
            expiresAt: { seconds: (Date.now() + 86400000) / 1000, nanos: 0 },
          },
          {
            id: 'session-2',
            adminId: 'admin-uuid-123',
            deviceFingerprint: 'fp-2',
            ipAddress: '10.0.0.50',
            userAgent: 'Firefox/121.0',
            mfaVerified: true,
            isActive: true,
            createdAt: { seconds: (Date.now() - 3600000) / 1000, nanos: 0 },
            lastActivityAt: { seconds: (Date.now() - 1800000) / 1000, nanos: 0 },
            expiresAt: { seconds: (Date.now() + 82800000) / 1000, nanos: 0 },
          },
        ];

        mockAuthService.adminGetActiveSessions.mockReturnValue(
          of({
            sessions: activeSessions,
            totalCount: 2,
          }),
        );

        const result = await adminService.getActiveSessions(mockSession, 'session-1');

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('session-1');
        expect(result[0].isCurrent).toBe(true);
        expect(result[1].isCurrent).toBe(false);
      });
    });

    describe('adminRevokeAllSessions gRPC integration', () => {
      it('should revoke all sessions except current', async () => {
        mockAuthService.adminRevokeAllSessions.mockReturnValue(
          of({
            success: true,
            revokedCount: 3,
            message: 'Sessions revoked',
          }),
        );

        const result = await adminService.revokeAllOtherSessions(mockSession);

        expect(result.success).toBe(true);
        expect(result.revokedCount).toBe(3);

        expect(mockAuthService.adminRevokeAllSessions).toHaveBeenCalledWith({
          adminId: 'admin-uuid-123',
          excludeSessionId: 'session-123',
          reason: 'User revoked all sessions',
        });
      });
    });
  });

  describe('Admin MFA Management Flow', () => {
    const mockSession = {
      id: 'session-123',
      accountType: 'ADMIN',
      accountId: 'admin-uuid-123',
      email: 'admin@example.com',
      mfaVerified: true,
      mfaRequired: true,
      permissions: ['users:read'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    };

    describe('adminSetupMfa gRPC integration', () => {
      it('should initiate MFA setup and return QR code', async () => {
        mockAuthService.adminSetupMfa.mockReturnValue(
          of({
            success: true,
            secret: 'JBSWY3DPEHPK3PXP',
            qrCodeUri:
              'otpauth://totp/MyApp:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp',
            backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5'],
            message: 'MFA setup initiated',
          }),
        );

        const result = await adminService.setupMfa(mockSession);

        expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
        expect(result.qrCodeUri).toContain('otpauth://totp/');
        expect(result.backupCodes).toHaveLength(5);
      });
    });

    describe('adminVerifyMfa gRPC integration', () => {
      it('should verify MFA setup with TOTP code', async () => {
        mockAuthService.adminVerifyMfa.mockReturnValue(
          of({
            success: true,
            message: 'MFA enabled successfully',
          }),
        );

        const result = await adminService.verifyMfaSetup(mockSession, '123456');

        expect(result.success).toBe(true);
        expect(mockAuthService.adminVerifyMfa).toHaveBeenCalledWith({
          adminId: 'admin-uuid-123',
          code: '123456',
        });
      });

      it('should reject invalid TOTP code during setup', async () => {
        mockAuthService.adminVerifyMfa.mockReturnValue(
          of({
            success: false,
            message: 'Invalid verification code',
          }),
        );

        const result = await adminService.verifyMfaSetup(mockSession, '000000');

        expect(result.success).toBe(false);
      });
    });

    describe('adminDisableMfa gRPC integration', () => {
      it('should disable MFA with password verification', async () => {
        mockAuthService.adminDisableMfa.mockReturnValue(
          of({
            success: true,
            message: 'MFA disabled',
          }),
        );

        const result = await adminService.disableMfa(mockSession, 'CurrentPassword123!');

        expect(result.success).toBe(true);
        expect(mockAuthService.adminDisableMfa).toHaveBeenCalledWith({
          adminId: 'admin-uuid-123',
          password: 'CurrentPassword123!',
        });
      });
    });

    describe('adminRegenerateBackupCodes gRPC integration', () => {
      it('should regenerate backup codes with password verification', async () => {
        mockAuthService.adminRegenerateBackupCodes.mockReturnValue(
          of({
            success: true,
            backupCodes: ['new1', 'new2', 'new3', 'new4', 'new5'],
            message: 'Backup codes regenerated',
          }),
        );

        const result = await adminService.regenerateBackupCodes(mockSession, 'CurrentPassword123!');

        expect(result.backupCodes).toHaveLength(5);
      });
    });
  });

  describe('Admin Password Management Flow', () => {
    const mockSession = {
      id: 'session-123',
      accountType: 'ADMIN',
      accountId: 'admin-uuid-123',
      email: 'admin@example.com',
      mfaVerified: true,
      mfaRequired: true,
      permissions: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    };

    describe('adminChangePassword gRPC integration', () => {
      it('should change password successfully', async () => {
        mockAuthService.adminChangePassword.mockReturnValue(
          of({
            success: true,
            message: 'Password changed successfully',
          }),
        );

        const result = await adminService.changePassword(
          mockRequest,
          mockSession,
          'OldPassword123!',
          'NewSecurePassword456!',
        );

        expect(result.success).toBe(true);
        expect(mockAuthService.adminChangePassword).toHaveBeenCalledWith({
          adminId: 'admin-uuid-123',
          currentPassword: 'OldPassword123!',
          newPassword: 'NewSecurePassword456!',
        });
        expect(mockAuditClient.logPasswordChanged).toHaveBeenCalled();
      });

      it('should reject password change with incorrect current password', async () => {
        mockAuthService.adminChangePassword.mockReturnValue(
          of({
            success: false,
            message: 'Current password is incorrect',
          }),
        );

        const result = await adminService.changePassword(
          mockRequest,
          mockSession,
          'WrongOldPassword',
          'NewPassword123!',
        );

        expect(result.success).toBe(false);
        expect(mockAuditClient.logPasswordChanged).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle auth-service unavailable gracefully', async () => {
      const unavailableError = createNetworkError('auth-service:50052 - Connection refused');
      mockAuthService.adminLogin.mockReturnValue(throwError(() => unavailableError));

      await expect(
        adminService.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'password',
        }),
      ).rejects.toThrow();
    });

    it('should handle authentication errors from auth-service', async () => {
      const authError = createUnauthenticatedError('Token expired');
      mockAuthService.adminValidateSession.mockReturnValue(throwError(() => authError));

      await expect(authGrpcClient.adminValidateSession('expired-token')).rejects.toMatchObject({
        code: 16, // UNAUTHENTICATED
      });
    });

    it('should handle timeout from auth-service', async () => {
      const timeoutError = createTimeoutError('Deadline exceeded after 5s');
      mockAuthService.adminLogin.mockReturnValue(throwError(() => timeoutError));

      await expect(
        adminService.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'password',
        }),
      ).rejects.toThrow();
    });
  });
});
