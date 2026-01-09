import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { UserService } from '../../src/user/user.service';
import { IdentityGrpcClient, AuditGrpcClient } from '../../src/grpc-clients';
import { SessionService } from '../../src/session/session.service';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';
import { Request, Response } from 'express';

describe('UserService', () => {
  let service: UserService;
  let identityClient: {
    getAccountByEmail: MockInstance;
    getAccount: MockInstance;
    createAccount: MockInstance;
    validatePassword: MockInstance;
    createSession: MockInstance;
    recordLoginAttempt: MockInstance;
    setupMfa: MockInstance;
    verifyMfaSetup: MockInstance;
    verifyMfaCode: MockInstance;
    disableMfa: MockInstance;
    getBackupCodes: MockInstance;
    regenerateBackupCodes: MockInstance;
    useBackupCode: MockInstance;
    changePassword: MockInstance;
    revokeAllSessions: MockInstance;
  };
  let auditClient: {
    logLoginSuccess: MockInstance;
    logLoginFailed: MockInstance;
    logMfaVerified: MockInstance;
    logMfaFailed: MockInstance;
    logLogout: MockInstance;
  };
  let sessionService: {
    getSession: MockInstance;
    createSession: MockInstance;
    destroySession: MockInstance;
    extractMetadata: MockInstance;
    getDeviceFingerprint: MockInstance;
  };

  const mockSession: BffSession = {
    id: 'session-123',
    accountType: AccountType.USER,
    accountId: 'user-123',
    email: 'user@example.com',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    deviceFingerprint: 'fingerprint-123',
    mfaVerified: false,
    mfaRequired: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    lastActivityAt: new Date(),
  };

  const mockAccount = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
    status: 1,
    mode: 1,
    mfaEnabled: false,
    emailVerified: true,
    createdAt: { seconds: 1234567890 },
    updatedAt: { seconds: 1234567890 },
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
        UserService,
        {
          provide: IdentityGrpcClient,
          useValue: {
            getAccountByEmail: vi.fn(),
            getAccount: vi.fn(),
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
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    identityClient = module.get(IdentityGrpcClient);
    auditClient = module.get(AuditGrpcClient);
    sessionService = module.get(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);
      identityClient.createAccount.mockResolvedValue(mockAccount);
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.register(mockRequest, mockResponse, {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        countryCode: 'US',
        locale: 'en-US',
        timezone: 'America/New_York',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(sessionService.createSession).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);

      await expect(
        service.register(mockRequest, mockResponse, {
          email: 'existing@example.com',
          username: 'newuser',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnauthorizedException on registration error', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);
      identityClient.createAccount.mockRejectedValue(new Error('DB error'));

      await expect(
        service.register(mockRequest, mockResponse, {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should login successfully without MFA', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
        failedAttempts: 0,
      });
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(auditClient.logLoginSuccess).toHaveBeenCalled();
    });

    it('should return MFA required when user has MFA enabled', async () => {
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const result = await service.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.mfaRequired).toBe(true);
      expect(result.challengeId).toBeDefined();
      expect(result.availableMethods).toContain('totp');
    });

    it('should throw UnauthorizedException when account not found', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(auditClient.logLoginFailed).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: false });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
        failedAttempts: 1,
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: false });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: true,
        failedAttempts: 5,
      });

      await expect(
        service.login(mockRequest, mockResponse, {
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Account locked');
    });
  });

  describe('loginMfa', () => {
    beforeEach(() => {
      // Setup a challenge first by triggering MFA login
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
    });

    it('should complete MFA login with TOTP successfully', async () => {
      // First create a challenge
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const loginResult = await service.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'password123',
      });

      expect(loginResult.challengeId).toBeDefined();
      const challengeId = loginResult.challengeId!;

      // Now verify MFA
      identityClient.verifyMfaCode.mockResolvedValue({ success: true });
      identityClient.getAccount.mockResolvedValue(mockAccount);
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.loginMfa(
        mockRequest,
        mockResponse,
        challengeId,
        '123456',
        'totp',
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(auditClient.logMfaVerified).toHaveBeenCalled();
    });

    it('should complete MFA login with backup code successfully', async () => {
      // First create a challenge
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const loginResult = await service.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'password123',
      });

      const challengeId = loginResult.challengeId!;

      // Now verify with backup code
      identityClient.useBackupCode.mockResolvedValue({ success: true });
      identityClient.getAccount.mockResolvedValue(mockAccount);
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({});
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await service.loginMfa(
        mockRequest,
        mockResponse,
        challengeId,
        'backup-code',
        'backup_code',
      );

      expect(result.success).toBe(true);
    });

    it('should throw UnauthorizedException for invalid challenge', async () => {
      await expect(
        service.loginMfa(mockRequest, mockResponse, 'invalid-challenge', '123456', 'totp'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid TOTP code', async () => {
      // First create a challenge
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const loginResult = await service.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'password123',
      });

      const challengeId = loginResult.challengeId!;

      identityClient.verifyMfaCode.mockResolvedValue({ success: false });

      await expect(
        service.loginMfa(mockRequest, mockResponse, challengeId, '000000', 'totp'),
      ).rejects.toThrow(UnauthorizedException);
      expect(auditClient.logMfaFailed).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid backup code', async () => {
      // First create a challenge
      const mfaAccount = { ...mockAccount, mfaEnabled: true };
      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const loginResult = await service.login(mockRequest, mockResponse, {
        email: 'user@example.com',
        password: 'password123',
      });

      const challengeId = loginResult.challengeId!;

      identityClient.useBackupCode.mockResolvedValue({ success: false });

      await expect(
        service.loginMfa(mockRequest, mockResponse, challengeId, 'invalid', 'backup_code'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      sessionService.getSession.mockResolvedValue(mockSession);
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
      expect(auditClient.logLogout).toHaveBeenCalled();
    });

    it('should logout even when session is null', async () => {
      sessionService.getSession.mockResolvedValue(null);
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
    });

    it('should handle logout error gracefully', async () => {
      sessionService.getSession.mockRejectedValue(new Error('Error'));
      sessionService.destroySession.mockResolvedValue(true);

      const result = await service.logout(mockRequest, mockResponse);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out');
    });
  });

  describe('getMe', () => {
    it('should return user info', async () => {
      identityClient.getAccount.mockResolvedValue(mockAccount);

      const result = await service.getMe(mockSession);

      expect(result.id).toBe(mockAccount.id);
      expect(result.email).toBe(mockAccount.email);
      expect(result.username).toBe(mockAccount.username);
    });

    it('should throw UnauthorizedException when account not found', async () => {
      identityClient.getAccount.mockResolvedValue(null);

      await expect(service.getMe(mockSession)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('MFA Management', () => {
    describe('setupMfa', () => {
      it('should setup MFA successfully', async () => {
        identityClient.setupMfa.mockResolvedValue({
          secret: 'secret-key',
          qrCodeUri: 'otpauth://...',
          backupCodes: ['code1', 'code2'],
        });

        const result = await service.setupMfa(mockSession);

        expect(result.secret).toBe('secret-key');
        expect(result.backupCodes).toHaveLength(2);
      });

      it('should throw UnauthorizedException on error', async () => {
        identityClient.setupMfa.mockRejectedValue(new Error('Error'));

        await expect(service.setupMfa(mockSession)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('verifyMfaSetup', () => {
      it('should verify MFA setup successfully', async () => {
        identityClient.verifyMfaSetup.mockResolvedValue({
          success: true,
          message: 'MFA enabled',
        });

        const result = await service.verifyMfaSetup(mockSession, '123456');

        expect(result.success).toBe(true);
      });

      it('should throw UnauthorizedException on error', async () => {
        identityClient.verifyMfaSetup.mockRejectedValue(new Error('Error'));

        await expect(service.verifyMfaSetup(mockSession, '123456')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('disableMfa', () => {
      it('should disable MFA successfully', async () => {
        identityClient.disableMfa.mockResolvedValue({
          success: true,
          message: 'MFA disabled',
        });

        const result = await service.disableMfa(mockSession, 'password');

        expect(result.success).toBe(true);
      });

      it('should throw UnauthorizedException on error', async () => {
        identityClient.disableMfa.mockRejectedValue(new Error('Error'));

        await expect(service.disableMfa(mockSession, 'password')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('getBackupCodesCount', () => {
      it('should return backup codes count', async () => {
        identityClient.getBackupCodes.mockResolvedValue({
          remainingCount: 5,
        });

        const result = await service.getBackupCodesCount(mockSession);

        expect(result.remainingCount).toBe(5);
      });

      it('should return 0 on error', async () => {
        identityClient.getBackupCodes.mockRejectedValue(new Error('Error'));

        const result = await service.getBackupCodesCount(mockSession);

        expect(result.remainingCount).toBe(0);
      });
    });

    describe('regenerateBackupCodes', () => {
      it('should regenerate backup codes successfully', async () => {
        identityClient.regenerateBackupCodes.mockResolvedValue({
          backupCodes: ['new-code-1', 'new-code-2'],
        });

        const result = await service.regenerateBackupCodes(mockSession, 'password');

        expect(result.backupCodes).toHaveLength(2);
      });

      it('should throw UnauthorizedException on error', async () => {
        identityClient.regenerateBackupCodes.mockRejectedValue(new Error('Error'));

        await expect(service.regenerateBackupCodes(mockSession, 'password')).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      identityClient.changePassword.mockResolvedValue({
        success: true,
        message: 'Password changed',
      });

      const result = await service.changePassword(mockSession, 'currentPass', 'newPass');

      expect(result.success).toBe(true);
    });

    it('should throw UnauthorizedException on error', async () => {
      identityClient.changePassword.mockRejectedValue(new Error('Error'));

      await expect(service.changePassword(mockSession, 'currentPass', 'newPass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all other sessions', async () => {
      identityClient.revokeAllSessions.mockResolvedValue({
        success: true,
        revokedCount: 3,
      });

      const result = await service.revokeAllOtherSessions(mockSession);

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(3);
    });

    it('should throw UnauthorizedException on error', async () => {
      identityClient.revokeAllSessions.mockRejectedValue(new Error('Error'));

      await expect(service.revokeAllOtherSessions(mockSession)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
