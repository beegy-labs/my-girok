import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { AdminService } from '../../src/admin/admin.service';
import { AuthGrpcClient, AuditGrpcClient } from '../../src/grpc-clients';
import { SessionService } from '../../src/session/session.service';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';
import { Request, Response } from 'express';

describe('AdminService', () => {
  let service: AdminService;
  let authClient: {
    adminLogin: MockInstance;
    adminLoginMfa: MockInstance;
    adminLogout: MockInstance;
    adminGetActiveSessions: MockInstance;
    adminRevokeAllSessions: MockInstance;
    adminSetupMfa: MockInstance;
    adminVerifyMfa: MockInstance;
    adminDisableMfa: MockInstance;
    adminRegenerateBackupCodes: MockInstance;
    adminChangePassword: MockInstance;
    adminRefreshSession: MockInstance;
  };
  let auditClient: {
    logLoginSuccess: MockInstance;
    logLoginFailed: MockInstance;
    logMfaVerified: MockInstance;
    logMfaFailed: MockInstance;
    logLogout: MockInstance;
    logPasswordChanged: MockInstance;
  };
  let sessionService: {
    getSession: MockInstance;
    createSession: MockInstance;
    destroySession: MockInstance;
    extractMetadata: MockInstance;
    getDeviceFingerprint: MockInstance;
    refreshSession: MockInstance;
    getSessionWithTokens: MockInstance;
  };

  const mockSession: BffSession = {
    id: 'session-123',
    accountType: AccountType.ADMIN,
    accountId: 'admin-123',
    email: 'admin@example.com',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    deviceFingerprint: 'fingerprint-123',
    mfaVerified: true,
    mfaRequired: true,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    lastActivityAt: new Date(),
    permissions: ['users:read', 'users:write'],
  };

  const mockAdmin = {
    id: 'admin-123',
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
    mfaRequired: true,
    mfaEnabled: true,
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
        AdminService,
        {
          provide: AuthGrpcClient,
          useValue: {
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
          },
        },
        {
          provide: AuditGrpcClient,
          useValue: {
            logLoginSuccess: vi.fn(),
            logLoginFailed: vi.fn(),
            logMfaVerified: vi.fn(),
            logMfaFailed: vi.fn(),
            logLogout: vi.fn(),
            logPasswordChanged: vi.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            getSession: vi.fn(),
            createSession: vi.fn(),
            destroySession: vi.fn(),
            extractMetadata: vi.fn().mockReturnValue({ userAgent: 'test', ipAddress: '127.0.0.1' }),
            getDeviceFingerprint: vi.fn().mockReturnValue('fingerprint-123'),
            refreshSession: vi.fn(),
            getSessionWithTokens: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    authClient = module.get(AuthGrpcClient);
    auditClient = module.get(AuditGrpcClient);
    sessionService = module.get(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return MFA required when admin has MFA enabled', async () => {
      authClient.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: true,
        challengeId: 'challenge-123',
        availableMethods: [1, 2],
        message: 'MFA required',
      });

      const result = await service.login(mockRequest, mockResponse, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.mfaRequired).toBe(true);
      expect(result.challengeId).toBe('challenge-123');
      expect(result.availableMethods).toContain('totp');
    });

    it('should login successfully without MFA', async () => {
      authClient.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: false,
        admin: mockAdmin,
        session: { id: 'session-1', mfaVerified: false },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.login(mockRequest, mockResponse, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
      expect(result.admin?.email).toBe('admin@example.com');
      expect(auditClient.logLoginSuccess).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      authClient.adminLogin.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(auditClient.logLoginFailed).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when login response has no admin', async () => {
      authClient.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: false,
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'admin@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginMfa', () => {
    it('should complete MFA login successfully', async () => {
      authClient.adminLoginMfa.mockResolvedValue({
        success: true,
        admin: mockAdmin,
        session: { id: 'session-1' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.loginMfa(mockRequest, mockResponse, {
        challengeId: 'challenge-123',
        code: '123456',
        method: 'totp',
      });

      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
      expect(auditClient.logMfaVerified).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid MFA code', async () => {
      authClient.adminLoginMfa.mockResolvedValue({
        success: false,
        message: 'Invalid code',
      });

      await expect(
        service.loginMfa(mockRequest, mockResponse, {
          challengeId: 'challenge-123',
          code: '000000',
          method: 'totp',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(auditClient.logMfaFailed).toHaveBeenCalled();
    });

    it('should use backup_code method correctly', async () => {
      authClient.adminLoginMfa.mockResolvedValue({
        success: true,
        admin: mockAdmin,
        session: { id: 'session-1' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      sessionService.createSession.mockResolvedValue(mockSession);

      await service.loginMfa(mockRequest, mockResponse, {
        challengeId: 'challenge-123',
        code: 'backup-code',
        method: 'backup_code',
      });

      expect(authClient.adminLoginMfa).toHaveBeenCalledWith(expect.objectContaining({ method: 2 }));
    });
  });

  describe('logout', () => {
    it('should logout successfully with valid session', async () => {
      sessionService.getSession.mockResolvedValue(mockSession);
      authClient.adminLogout.mockResolvedValue({ success: true });
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
      expect(auditClient.logLogout).toHaveBeenCalled();
    });

    it('should still logout when session is not found', async () => {
      sessionService.getSession.mockResolvedValue(null);
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
    });

    it('should handle logout error gracefully', async () => {
      sessionService.getSession.mockResolvedValue(mockSession);
      authClient.adminLogout.mockRejectedValue(new Error('Network error'));
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out');
    });
  });

  describe('getMe', () => {
    it('should return admin info from session', async () => {
      const result = await service.getMe(mockSession);

      expect(result.id).toBe(mockSession.accountId);
      expect(result.email).toBe(mockSession.email);
      expect(result.permissions).toEqual(mockSession.permissions);
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          deviceFingerprint: 'fp1',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
          mfaVerified: true,
          createdAt: { seconds: 1234567890 },
          lastActivityAt: { seconds: 1234567890 },
        },
      ];
      authClient.adminGetActiveSessions.mockResolvedValue({
        sessions: mockSessions,
      });

      const result = await service.getActiveSessions(mockSession, 'session-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-1');
    });

    it('should return empty array on error', async () => {
      authClient.adminGetActiveSessions.mockRejectedValue(new Error('Error'));

      const result = await service.getActiveSessions(mockSession, 'session-123');

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      authClient.adminLogout.mockResolvedValue({
        success: true,
        message: 'Session revoked',
      });

      const result = await service.revokeSession(mockSession, 'other-session');

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException when trying to revoke current session', async () => {
      await expect(service.revokeSession(mockSession, mockSession.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnauthorizedException on error', async () => {
      authClient.adminLogout.mockRejectedValue(new Error('Error'));

      await expect(service.revokeSession(mockSession, 'other-session')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all other sessions', async () => {
      authClient.adminRevokeAllSessions.mockResolvedValue({
        success: true,
        revokedCount: 3,
      });

      const result = await service.revokeAllOtherSessions(mockSession);

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(3);
    });

    it('should throw UnauthorizedException on error', async () => {
      authClient.adminRevokeAllSessions.mockRejectedValue(new Error('Error'));

      await expect(service.revokeAllOtherSessions(mockSession)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('MFA Management', () => {
    describe('setupMfa', () => {
      it('should setup MFA successfully', async () => {
        authClient.adminSetupMfa.mockResolvedValue({
          secret: 'secret-key',
          qrCodeUri: 'otpauth://...',
          backupCodes: ['code1', 'code2'],
        });

        const result = await service.setupMfa(mockSession);

        expect(result.secret).toBe('secret-key');
        expect(result.qrCodeUri).toBeDefined();
        expect(result.backupCodes).toHaveLength(2);
      });

      it('should throw UnauthorizedException on error', async () => {
        authClient.adminSetupMfa.mockRejectedValue(new Error('Error'));

        await expect(service.setupMfa(mockSession)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('verifyMfaSetup', () => {
      it('should verify MFA setup successfully', async () => {
        authClient.adminVerifyMfa.mockResolvedValue({
          success: true,
          message: 'MFA enabled',
        });

        const result = await service.verifyMfaSetup(mockSession, '123456');

        expect(result.success).toBe(true);
      });

      it('should throw UnauthorizedException on error', async () => {
        authClient.adminVerifyMfa.mockRejectedValue(new Error('Error'));

        await expect(service.verifyMfaSetup(mockSession, '123456')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('disableMfa', () => {
      it('should disable MFA successfully', async () => {
        authClient.adminDisableMfa.mockResolvedValue({
          success: true,
          message: 'MFA disabled',
        });

        const result = await service.disableMfa(mockSession, 'password');

        expect(result.success).toBe(true);
      });

      it('should throw UnauthorizedException on error', async () => {
        authClient.adminDisableMfa.mockRejectedValue(new Error('Error'));

        await expect(service.disableMfa(mockSession, 'password')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('regenerateBackupCodes', () => {
      it('should regenerate backup codes successfully', async () => {
        authClient.adminRegenerateBackupCodes.mockResolvedValue({
          backupCodes: ['new-code-1', 'new-code-2'],
        });

        const result = await service.regenerateBackupCodes(mockSession, 'password');

        expect(result.backupCodes).toHaveLength(2);
      });

      it('should throw UnauthorizedException on error', async () => {
        authClient.adminRegenerateBackupCodes.mockRejectedValue(new Error('Error'));

        await expect(service.regenerateBackupCodes(mockSession, 'password')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      authClient.adminChangePassword.mockResolvedValue({
        success: true,
        message: 'Password changed',
      });

      const result = await service.changePassword(
        mockRequest,
        mockSession,
        'currentPass',
        'newPass',
      );

      expect(result.success).toBe(true);
      expect(auditClient.logPasswordChanged).toHaveBeenCalled();
    });

    it('should not log audit on failure', async () => {
      authClient.adminChangePassword.mockResolvedValue({
        success: false,
        message: 'Invalid current password',
      });

      const result = await service.changePassword(mockRequest, mockSession, 'wrongPass', 'newPass');

      expect(result.success).toBe(false);
      expect(auditClient.logPasswordChanged).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on error', async () => {
      authClient.adminChangePassword.mockRejectedValue(new Error('Error'));

      await expect(
        service.changePassword(mockRequest, mockSession, 'currentPass', 'newPass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      sessionService.getSessionWithTokens.mockResolvedValue({
        ...mockSession,
        decryptedAccessToken: 'old-access',
        decryptedRefreshToken: 'old-refresh',
      });
      authClient.adminRefreshSession.mockResolvedValue({
        success: true,
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      sessionService.refreshSession.mockResolvedValue(mockSession);

      const result = await service.refreshSession(mockRequest, mockResponse, mockSession);

      expect(result.success).toBe(true);
      expect(sessionService.refreshSession).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when session not found', async () => {
      sessionService.getSessionWithTokens.mockResolvedValue(null);

      await expect(service.refreshSession(mockRequest, mockResponse, mockSession)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh fails', async () => {
      sessionService.getSessionWithTokens.mockResolvedValue({
        ...mockSession,
        decryptedAccessToken: 'old-access',
        decryptedRefreshToken: 'old-refresh',
      });
      authClient.adminRefreshSession.mockResolvedValue({
        success: false,
        message: 'Token expired',
      });

      await expect(service.refreshSession(mockRequest, mockResponse, mockSession)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      authClient.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: true,
        challengeId: 'challenge-123',
        availableMethods: [1],
      });

      await service.login(mockRequest, mockResponse, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(authClient.adminLogin).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '192.168.1.1' }),
      );
    });

    it('should use socket address when no x-forwarded-for', async () => {
      const reqWithoutForwarded = {
        headers: { 'user-agent': 'test' },
        socket: { remoteAddress: '10.0.0.1' },
        cookies: {},
      } as unknown as Request;

      authClient.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: true,
        challengeId: 'challenge-123',
        availableMethods: [1],
      });

      await service.login(reqWithoutForwarded, mockResponse, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(authClient.adminLogin).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '10.0.0.1' }),
      );
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

      authClient.adminLogin.mockResolvedValue({
        success: true,
        mfaRequired: true,
        challengeId: 'challenge-123',
        availableMethods: [1],
      });

      await service.login(reqWithArrayForwarded, mockResponse, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(authClient.adminLogin).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '203.0.113.1' }),
      );
    });
  });
});
