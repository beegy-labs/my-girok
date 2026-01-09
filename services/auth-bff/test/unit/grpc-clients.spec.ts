import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthGrpcClient } from '../../src/grpc-clients/auth.client';
import { IdentityGrpcClient } from '../../src/grpc-clients/identity.client';
import {
  AuditGrpcClient,
  AccountType as AuditAccountType,
} from '../../src/grpc-clients/audit.client';

// Mock @nestjs/microservices
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

describe('gRPC Clients', () => {
  describe('AuthGrpcClient', () => {
    let client: AuthGrpcClient;
    let mockAuthService: Record<string, MockInstance>;

    beforeEach(async () => {
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

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthGrpcClient,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
            },
          },
        ],
      }).compile();

      client = module.get<AuthGrpcClient>(AuthGrpcClient);
      // @ts-expect-error - Accessing private property for testing
      client.authService = mockAuthService;
    });

    describe('adminLogin', () => {
      it('should call adminLogin and return response', async () => {
        const response = { success: true, mfaRequired: false };
        mockAuthService.adminLogin.mockReturnValue(of(response));

        const result = await client.adminLogin({
          email: 'admin@example.com',
          password: 'password',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          deviceFingerprint: 'fp',
        });

        expect(result).toEqual(response);
      });
    });

    describe('adminLoginMfa', () => {
      it('should call adminLoginMfa and return response', async () => {
        const response = { success: true, admin: { id: 'admin-1' } };
        mockAuthService.adminLoginMfa.mockReturnValue(of(response));

        const result = await client.adminLoginMfa({
          challengeId: 'challenge-1',
          code: '123456',
          method: 1,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          deviceFingerprint: 'fp',
        });

        expect(result).toEqual(response);
      });
    });

    describe('adminValidateSession', () => {
      it('should validate session', async () => {
        const response = { valid: true, adminId: 'admin-1', sessionId: 'session-1' };
        mockAuthService.adminValidateSession.mockReturnValue(of(response));

        const result = await client.adminValidateSession('token-hash');

        expect(result).toEqual(response);
      });
    });

    describe('adminRefreshSession', () => {
      it('should refresh session', async () => {
        const response = { success: true, accessToken: 'new-token', refreshToken: 'new-refresh' };
        mockAuthService.adminRefreshSession.mockReturnValue(of(response));

        const result = await client.adminRefreshSession('refresh-token-hash');

        expect(result).toEqual(response);
      });
    });

    describe('adminLogout', () => {
      it('should logout session', async () => {
        const response = { success: true, message: 'Logged out' };
        mockAuthService.adminLogout.mockReturnValue(of(response));

        const result = await client.adminLogout('session-1');

        expect(result).toEqual(response);
      });
    });

    describe('adminRevokeAllSessions', () => {
      it('should revoke all sessions', async () => {
        const response = { success: true, revokedCount: 3 };
        mockAuthService.adminRevokeAllSessions.mockReturnValue(of(response));

        const result = await client.adminRevokeAllSessions('admin-1', 'current-session', 'reason');

        expect(result).toEqual(response);
      });
    });

    describe('adminGetActiveSessions', () => {
      it('should get active sessions', async () => {
        const response = { sessions: [{ id: 'session-1' }], totalCount: 1 };
        mockAuthService.adminGetActiveSessions.mockReturnValue(of(response));

        const result = await client.adminGetActiveSessions('admin-1');

        expect(result).toEqual(response);
      });
    });

    describe('MFA operations', () => {
      it('should setup MFA', async () => {
        const response = { success: true, secret: 'secret', qrCodeUri: 'uri', backupCodes: [] };
        mockAuthService.adminSetupMfa.mockReturnValue(of(response));

        const result = await client.adminSetupMfa('admin-1');

        expect(result).toEqual(response);
      });

      it('should verify MFA', async () => {
        const response = { success: true, message: 'Verified' };
        mockAuthService.adminVerifyMfa.mockReturnValue(of(response));

        const result = await client.adminVerifyMfa('admin-1', '123456');

        expect(result).toEqual(response);
      });

      it('should disable MFA', async () => {
        const response = { success: true, message: 'Disabled' };
        mockAuthService.adminDisableMfa.mockReturnValue(of(response));

        const result = await client.adminDisableMfa('admin-1', 'password');

        expect(result).toEqual(response);
      });

      it('should regenerate backup codes', async () => {
        const response = { success: true, backupCodes: ['code1', 'code2'] };
        mockAuthService.adminRegenerateBackupCodes.mockReturnValue(of(response));

        const result = await client.adminRegenerateBackupCodes('admin-1', 'password');

        expect(result).toEqual(response);
      });
    });

    describe('adminChangePassword', () => {
      it('should change password', async () => {
        const response = { success: true, message: 'Changed' };
        mockAuthService.adminChangePassword.mockReturnValue(of(response));

        const result = await client.adminChangePassword('admin-1', 'current', 'new');

        expect(result).toEqual(response);
      });
    });

    describe('Operator operations', () => {
      it('should get operator assignment', async () => {
        const response = { found: true, assignment: { id: 'assignment-1' } };
        mockAuthService.getOperatorAssignment.mockReturnValue(of(response));

        const result = await client.getOperatorAssignment('account-1', 'service-1', 'KR');

        expect(result).toEqual(response);
      });

      it('should get operator assignment permissions', async () => {
        const response = { permissions: [{ id: 'p1', resource: 'orders', action: 'read' }] };
        mockAuthService.getOperatorAssignmentPermissions.mockReturnValue(of(response));

        const result = await client.getOperatorAssignmentPermissions('assignment-1');

        expect(result).toEqual([{ id: 'p1', resource: 'orders', action: 'read' }]);
      });

      it('should check permission', async () => {
        const response = { allowed: true, reason: 'Has permission' };
        mockAuthService.checkPermission.mockReturnValue(of(response));

        const result = await client.checkPermission('operator-1', 'orders', 'read');

        expect(result).toEqual(response);
      });

      it('should get operator permissions', async () => {
        const response = { permissions: [{ id: 'p1' }] };
        mockAuthService.getOperatorPermissions.mockReturnValue(of(response));

        const result = await client.getOperatorPermissions('operator-1');

        expect(result).toEqual([{ id: 'p1' }]);
      });
    });
  });

  describe('IdentityGrpcClient', () => {
    let client: IdentityGrpcClient;
    let mockIdentityService: Record<string, MockInstance>;

    beforeEach(async () => {
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

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IdentityGrpcClient,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
            },
          },
        ],
      }).compile();

      client = module.get<IdentityGrpcClient>(IdentityGrpcClient);
      // @ts-expect-error - Accessing private property for testing
      client.identityService = mockIdentityService;
    });

    describe('getAccount', () => {
      it('should return account when found', async () => {
        const account = { id: 'user-1', email: 'user@example.com' };
        mockIdentityService.getAccount.mockReturnValue(of({ account }));

        const result = await client.getAccount('user-1');

        expect(result).toEqual(account);
      });

      it('should return null when not found', async () => {
        mockIdentityService.getAccount.mockReturnValue(throwError(() => new Error('Not found')));

        const result = await client.getAccount('unknown');

        expect(result).toBeNull();
      });
    });

    describe('getAccountByEmail', () => {
      it('should return account when found', async () => {
        const account = { id: 'user-1', email: 'user@example.com' };
        mockIdentityService.getAccountByEmail.mockReturnValue(of({ account }));

        const result = await client.getAccountByEmail('user@example.com');

        expect(result).toEqual(account);
      });

      it('should return null when not found', async () => {
        mockIdentityService.getAccountByEmail.mockReturnValue(
          throwError(() => new Error('Not found')),
        );

        const result = await client.getAccountByEmail('unknown@example.com');

        expect(result).toBeNull();
      });
    });

    describe('createAccount', () => {
      it('should create and return account', async () => {
        const account = { id: 'user-1', email: 'new@example.com' };
        mockIdentityService.createAccount.mockReturnValue(of({ account }));

        const result = await client.createAccount({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password',
          provider: 1,
          mode: 1,
        });

        expect(result).toEqual(account);
      });
    });

    describe('validatePassword', () => {
      it('should validate password', async () => {
        const response = { valid: true, message: '' };
        mockIdentityService.validatePassword.mockReturnValue(of(response));

        const result = await client.validatePassword('user-1', 'password');

        expect(result).toEqual(response);
      });
    });

    describe('createSession', () => {
      it('should create session', async () => {
        const response = { accessToken: 'token', refreshToken: 'refresh' };
        mockIdentityService.createSession.mockReturnValue(of(response));

        const result = await client.createSession({
          accountId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          sessionContext: 1,
        });

        expect(result).toEqual(response);
      });
    });

    describe('recordLoginAttempt', () => {
      it('should record login attempt', async () => {
        const response = { accountLocked: false, failedAttempts: 0, maxAttempts: 5 };
        mockIdentityService.recordLoginAttempt.mockReturnValue(of(response));

        const result = await client.recordLoginAttempt(
          'user-1',
          'user@example.com',
          '127.0.0.1',
          'test',
          true,
          '',
        );

        expect(result).toEqual(response);
      });
    });

    describe('MFA operations', () => {
      it('should setup MFA', async () => {
        const response = { success: true, secret: 'secret', qrCodeUri: 'uri', backupCodes: [] };
        mockIdentityService.setupMfa.mockReturnValue(of(response));

        const result = await client.setupMfa('user-1');

        expect(result).toEqual(response);
      });

      it('should verify MFA setup', async () => {
        const response = { success: true, message: 'Verified' };
        mockIdentityService.verifyMfaSetup.mockReturnValue(of(response));

        const result = await client.verifyMfaSetup('user-1', '123456');

        expect(result).toEqual(response);
      });

      it('should verify MFA code', async () => {
        const response = { success: true, message: 'Verified' };
        mockIdentityService.verifyMfaCode.mockReturnValue(of(response));

        const result = await client.verifyMfaCode('user-1', '123456', 1);

        expect(result).toEqual(response);
      });

      it('should disable MFA', async () => {
        const response = { success: true, message: 'Disabled' };
        mockIdentityService.disableMfa.mockReturnValue(of(response));

        const result = await client.disableMfa('user-1', 'password');

        expect(result).toEqual(response);
      });

      it('should get backup codes', async () => {
        const response = { remainingCount: 5 };
        mockIdentityService.getBackupCodes.mockReturnValue(of(response));

        const result = await client.getBackupCodes('user-1');

        expect(result).toEqual(response);
      });

      it('should regenerate backup codes', async () => {
        const response = { success: true, backupCodes: ['code1'] };
        mockIdentityService.regenerateBackupCodes.mockReturnValue(of(response));

        const result = await client.regenerateBackupCodes('user-1', 'password');

        expect(result).toEqual(response);
      });

      it('should use backup code', async () => {
        const response = { success: true, remainingCount: 4 };
        mockIdentityService.useBackupCode.mockReturnValue(of(response));

        const result = await client.useBackupCode('user-1', 'backup-code');

        expect(result).toEqual(response);
      });
    });

    describe('changePassword', () => {
      it('should change password', async () => {
        const response = { success: true, message: 'Changed' };
        mockIdentityService.changePassword.mockReturnValue(of(response));

        const result = await client.changePassword('user-1', 'current', 'new');

        expect(result).toEqual(response);
      });
    });

    describe('revokeAllSessions', () => {
      it('should revoke all sessions', async () => {
        const response = { success: true, revokedCount: 2 };
        mockIdentityService.revokeAllSessions.mockReturnValue(of(response));

        const result = await client.revokeAllSessions('user-1', 'exclude-session');

        expect(result).toEqual(response);
      });
    });
  });

  describe('AuditGrpcClient', () => {
    let client: AuditGrpcClient;
    let mockAuditService: Record<string, MockInstance>;

    beforeEach(async () => {
      mockAuditService = {
        logAuthEvent: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditGrpcClient,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
            },
          },
        ],
      }).compile();

      client = module.get<AuditGrpcClient>(AuditGrpcClient);
      // @ts-expect-error - Accessing private property for testing
      client.auditService = mockAuditService;
      // @ts-expect-error - Accessing private property for testing
      client.isConnected = true;
    });

    describe('logAuthEvent', () => {
      it('should log auth event successfully', async () => {
        const response = { success: true, eventId: 'event-1', message: '' };
        mockAuditService.logAuthEvent.mockReturnValue(of(response));

        const result = await client.logAuthEvent({
          eventType: 1,
          accountType: 1,
          accountId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          result: 1,
        });

        expect(result).toEqual(response);
      });

      it('should return failure when not connected', async () => {
        // @ts-expect-error - Accessing private property for testing
        client.isConnected = false;

        const result = await client.logAuthEvent({
          eventType: 1,
          accountType: 1,
          accountId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          result: 1,
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('not connected');
      });

      it('should handle errors gracefully', async () => {
        mockAuditService.logAuthEvent.mockReturnValue(throwError(() => new Error('Network error')));

        const result = await client.logAuthEvent({
          eventType: 1,
          accountType: 1,
          accountId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          result: 1,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('convenience methods', () => {
      beforeEach(() => {
        mockAuditService.logAuthEvent.mockReturnValue(
          of({ success: true, eventId: 'event-1', message: '' }),
        );
      });

      it('should log login success', async () => {
        await client.logLoginSuccess({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          sessionId: 'session-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log login failed', async () => {
        await client.logLoginFailed({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          failureReason: 'Invalid credentials',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log logout', async () => {
        await client.logLogout({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          sessionId: 'session-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log MFA verified', async () => {
        await client.logMfaVerified({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          method: 'totp',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log MFA verified without method', async () => {
        await client.logMfaVerified({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log MFA failed', async () => {
        await client.logMfaFailed({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          failureReason: 'Invalid code',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log password changed', async () => {
        await client.logPasswordChanged({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log session revoked', async () => {
        await client.logSessionRevoked({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          sessionId: 'session-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          reason: 'User requested',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log session revoked without reason', async () => {
        await client.logSessionRevoked({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          sessionId: 'session-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });

      it('should log token refreshed', async () => {
        await client.logTokenRefreshed({
          accountId: 'user-1',
          accountType: AuditAccountType.USER,
          sessionId: 'session-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        });

        expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
      });
    });
  });
});
