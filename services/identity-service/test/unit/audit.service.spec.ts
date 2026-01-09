import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { AuditService, AuditAction, AuditLogEntry } from '../../src/common/audit/audit.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockOutboxPublish: Mock;
  let mockConfigGet: Mock;

  const mockAccountId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSessionId = '223e4567-e89b-12d3-a456-426614174001';
  const mockDeviceId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(async () => {
    mockOutboxPublish = vi.fn().mockResolvedValue(undefined);
    mockConfigGet = vi.fn().mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: OutboxService,
          useValue: {
            publish: mockOutboxPublish,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: mockConfigGet,
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('should publish audit event to outbox', async () => {
      const entry: AuditLogEntry = {
        action: AuditAction.ACCOUNT_CREATED,
        targetId: mockAccountId,
        targetType: 'account',
        timestamp: new Date(),
      };

      await service.log(entry);

      expect(mockOutboxPublish).toHaveBeenCalledWith({
        aggregateType: 'audit',
        aggregateId: mockAccountId,
        eventType: 'identity.account_created',
        payload: expect.objectContaining({
          action: AuditAction.ACCOUNT_CREATED,
          targetType: 'account',
        }),
      });
    });

    it('should mask targetId in payload', async () => {
      const entry: AuditLogEntry = {
        action: AuditAction.ACCOUNT_CREATED,
        targetId: mockAccountId,
        targetType: 'account',
        timestamp: new Date(),
      };

      await service.log(entry);

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.targetId).not.toBe(mockAccountId);
      expect(payload.targetId).toContain('***');
    });

    it('should mask actorId when present', async () => {
      const actorId = '423e4567-e89b-12d3-a456-426614174003';
      const entry: AuditLogEntry = {
        action: AuditAction.ACCOUNT_UPDATED,
        actorId,
        targetId: mockAccountId,
        targetType: 'account',
        timestamp: new Date(),
      };

      await service.log(entry);

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.actorId).not.toBe(actorId);
      expect(payload.actorId).toContain('***');
    });

    it('should mask IP address when present', async () => {
      const entry: AuditLogEntry = {
        action: AuditAction.SESSION_CREATED,
        targetId: mockSessionId,
        targetType: 'session',
        ipAddress: '192.168.1.100',
        timestamp: new Date(),
      };

      await service.log(entry);

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.ipAddress).toBeDefined();
      expect(payload.ipAddress).not.toBe('192.168.1.100');
    });

    it('should truncate long user agent strings', async () => {
      const longUserAgent = 'A'.repeat(300);
      const entry: AuditLogEntry = {
        action: AuditAction.SESSION_CREATED,
        targetId: mockSessionId,
        targetType: 'session',
        userAgent: longUserAgent,
        timestamp: new Date(),
      };

      await service.log(entry);

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.userAgent.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(payload.userAgent).toContain('...');
    });

    it('should not truncate short user agent strings', async () => {
      const shortUserAgent = 'Mozilla/5.0 (Windows NT 10.0)';
      const entry: AuditLogEntry = {
        action: AuditAction.SESSION_CREATED,
        targetId: mockSessionId,
        targetType: 'session',
        userAgent: shortUserAgent,
        timestamp: new Date(),
      };

      await service.log(entry);

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.userAgent).toBe(shortUserAgent);
    });

    it('should not publish when audit is disabled', async () => {
      mockConfigGet.mockReturnValue(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditService,
          {
            provide: OutboxService,
            useValue: { publish: mockOutboxPublish },
          },
          {
            provide: ConfigService,
            useValue: { get: mockConfigGet },
          },
        ],
      }).compile();

      const disabledService = module.get<AuditService>(AuditService);

      await disabledService.log({
        action: AuditAction.ACCOUNT_CREATED,
        targetId: mockAccountId,
        targetType: 'account',
        timestamp: new Date(),
      });

      expect(mockOutboxPublish).not.toHaveBeenCalled();
    });

    it('should not throw when outbox publish fails', async () => {
      mockOutboxPublish.mockRejectedValue(new Error('Outbox error'));

      const entry: AuditLogEntry = {
        action: AuditAction.ACCOUNT_CREATED,
        targetId: mockAccountId,
        targetType: 'account',
        timestamp: new Date(),
      };

      // Should not throw
      await expect(service.log(entry)).resolves.not.toThrow();
    });
  });

  describe('logAccountMutation', () => {
    it('should log account mutation with context', async () => {
      await service.logAccountMutation(
        AuditAction.ACCOUNT_CREATED,
        mockAccountId,
        undefined,
        { email: 'test@example.com' },
        { ipAddress: '192.168.1.1', userAgent: 'Test Agent' },
      );

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.account_created',
          payload: expect.objectContaining({
            action: AuditAction.ACCOUNT_CREATED,
            targetType: 'account',
          }),
        }),
      );
    });

    it('should log account mutation with actor', async () => {
      const actorId = '523e4567-e89b-12d3-a456-426614174004';

      await service.logAccountMutation(AuditAction.ACCOUNT_UPDATED, mockAccountId, actorId, {
        field: 'name',
      });

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            actorId: expect.any(String),
          }),
        }),
      );
    });

    it('should log account deletion', async () => {
      await service.logAccountMutation(AuditAction.ACCOUNT_DELETED, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.account_deleted',
        }),
      );
    });

    it('should log password change', async () => {
      await service.logAccountMutation(AuditAction.PASSWORD_CHANGED, mockAccountId, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.password_changed',
        }),
      );
    });
  });

  describe('logSessionMutation', () => {
    it('should log session creation', async () => {
      await service.logSessionMutation(AuditAction.SESSION_CREATED, mockSessionId, mockAccountId, {
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/100',
      });

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: mockSessionId,
          eventType: 'identity.session_created',
          payload: expect.objectContaining({
            targetType: 'session',
          }),
        }),
      );
    });

    it('should log session revocation', async () => {
      await service.logSessionMutation(AuditAction.SESSION_REVOKED, mockSessionId, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.session_revoked',
        }),
      );
    });

    it('should log all sessions revoked', async () => {
      await service.logSessionMutation(
        AuditAction.ALL_SESSIONS_REVOKED,
        mockSessionId,
        mockAccountId,
      );

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.all_sessions_revoked',
        }),
      );
    });
  });

  describe('logDeviceMutation', () => {
    it('should log device registration', async () => {
      await service.logDeviceMutation(AuditAction.DEVICE_REGISTERED, mockDeviceId, mockAccountId, {
        deviceType: 'mobile',
        platform: 'iOS',
      });

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: mockDeviceId,
          eventType: 'identity.device_registered',
          payload: expect.objectContaining({
            targetType: 'device',
          }),
        }),
      );
    });

    it('should log device trust', async () => {
      await service.logDeviceMutation(AuditAction.DEVICE_TRUSTED, mockDeviceId, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.device_trusted',
        }),
      );
    });

    it('should log device removal', async () => {
      await service.logDeviceMutation(AuditAction.DEVICE_REMOVED, mockDeviceId, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.device_removed',
        }),
      );
    });
  });

  describe('logProfileMutation', () => {
    it('should log profile creation', async () => {
      await service.logProfileMutation(AuditAction.PROFILE_CREATED, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.profile_created',
          payload: expect.objectContaining({
            targetType: 'profile',
          }),
        }),
      );
    });

    it('should log profile update with changed fields', async () => {
      const changedFields = ['displayName', 'avatarUrl'];

      await service.logProfileMutation(AuditAction.PROFILE_UPDATED, mockAccountId, changedFields);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.profile_updated',
          payload: expect.objectContaining({
            details: expect.objectContaining({
              changedFields: expect.any(Object),
            }),
          }),
        }),
      );

      // Verify the changedFields contains the expected values (array converted to object)
      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(Object.values(payload.details.changedFields)).toEqual(changedFields);
    });

    it('should log profile update without fields', async () => {
      await service.logProfileMutation(AuditAction.PROFILE_UPDATED, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.profile_updated',
        }),
      );
    });
  });

  describe('logSecurityEvent', () => {
    it('should log login failure', async () => {
      await service.logSecurityEvent(
        AuditAction.LOGIN_FAILED,
        mockAccountId,
        { reason: 'invalid_password', attempts: 3 },
        { ipAddress: '192.168.1.50' },
      );

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.login_failed',
          payload: expect.objectContaining({
            targetType: 'account',
          }),
        }),
      );
    });

    it('should log account lock', async () => {
      await service.logSecurityEvent(AuditAction.ACCOUNT_LOCKED, mockAccountId, {
        reason: 'too_many_failed_attempts',
        lockedUntil: new Date().toISOString(),
      });

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.account_locked',
        }),
      );
    });

    it('should log account unlock', async () => {
      await service.logSecurityEvent(AuditAction.ACCOUNT_UNLOCKED, mockAccountId);

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.account_unlocked',
        }),
      );
    });

    it('should log MFA events', async () => {
      await service.logSecurityEvent(AuditAction.MFA_ENABLED, mockAccountId, {
        method: 'totp',
      });

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'identity.mfa_enabled',
        }),
      );
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask email in details', async () => {
      await service.logAccountMutation(AuditAction.ACCOUNT_CREATED, mockAccountId, undefined, {
        email: 'user@example.com',
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.email).not.toBe('user@example.com');
      expect(payload.details.email).toContain('***');
    });

    it('should redact password in details', async () => {
      await service.logAccountMutation(AuditAction.PASSWORD_CHANGED, mockAccountId, undefined, {
        password: 'secretPassword123',
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.password).toBe('[REDACTED]');
    });

    it('should redact secret fields in details', async () => {
      await service.logAccountMutation(AuditAction.MFA_ENABLED, mockAccountId, undefined, {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        clientSecret: 'some-secret',
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.mfaSecret).toBe('[REDACTED]');
      expect(payload.details.clientSecret).toBe('[REDACTED]');
    });

    it('should mask accountId in details', async () => {
      const nestedAccountId = '623e4567-e89b-12d3-a456-426614174005';
      await service.logAccountMutation(AuditAction.SESSION_CREATED, mockAccountId, undefined, {
        accountId: nestedAccountId,
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.accountId).not.toBe(nestedAccountId);
      expect(payload.details.accountId).toContain('***');
    });

    it('should mask userId in details', async () => {
      const userId = '723e4567-e89b-12d3-a456-426614174006';
      await service.logAccountMutation(AuditAction.PROFILE_UPDATED, mockAccountId, undefined, {
        userId: userId,
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.userId).not.toBe(userId);
      expect(payload.details.userId).toContain('***');
    });

    it('should recursively mask nested objects', async () => {
      await service.logAccountMutation(AuditAction.ACCOUNT_UPDATED, mockAccountId, undefined, {
        user: {
          email: 'nested@example.com',
          profile: {
            accountId: '823e4567-e89b-12d3-a456-426614174007',
          },
        },
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.user.email).toContain('***');
      expect(payload.details.user.profile.accountId).toContain('***');
    });

    it('should preserve non-sensitive fields', async () => {
      await service.logAccountMutation(AuditAction.ACCOUNT_UPDATED, mockAccountId, undefined, {
        action: 'update',
        field: 'displayName',
        count: 42,
        enabled: true,
      });

      const payload = mockOutboxPublish.mock.calls[0][0].payload;
      expect(payload.details.action).toBe('update');
      expect(payload.details.field).toBe('displayName');
      expect(payload.details.count).toBe(42);
      expect(payload.details.enabled).toBe(true);
    });
  });

  describe('all AuditAction types', () => {
    const allActions: AuditAction[] = [
      AuditAction.ACCOUNT_CREATED,
      AuditAction.ACCOUNT_UPDATED,
      AuditAction.ACCOUNT_DELETED,
      AuditAction.ACCOUNT_STATUS_CHANGED,
      AuditAction.PASSWORD_CHANGED,
      AuditAction.EMAIL_VERIFIED,
      AuditAction.SESSION_CREATED,
      AuditAction.SESSION_REFRESHED,
      AuditAction.SESSION_REVOKED,
      AuditAction.ALL_SESSIONS_REVOKED,
      AuditAction.DEVICE_REGISTERED,
      AuditAction.DEVICE_TRUSTED,
      AuditAction.DEVICE_REMOVED,
      AuditAction.MFA_ENABLED,
      AuditAction.MFA_DISABLED,
      AuditAction.MFA_VERIFIED,
      AuditAction.MFA_FAILED,
      AuditAction.PROFILE_CREATED,
      AuditAction.PROFILE_UPDATED,
      AuditAction.PROFILE_DELETED,
      AuditAction.LOGIN_FAILED,
      AuditAction.ACCOUNT_LOCKED,
      AuditAction.ACCOUNT_UNLOCKED,
    ];

    it.each(allActions)('should handle %s action', async (action) => {
      await service.log({
        action,
        targetId: mockAccountId,
        targetType: 'account',
        timestamp: new Date(),
      });

      expect(mockOutboxPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: `identity.${action.toLowerCase()}`,
        }),
      );
    });
  });
});
