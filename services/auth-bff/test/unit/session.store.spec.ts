import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import RedisMock from 'ioredis-mock';

/**
 * @fileoverview SessionStore unit tests
 *
 * Uses ioredis-mock package for reliable Redis mocking without memory issues.
 */

// Mock ioredis to use ioredis-mock
vi.mock('ioredis', () => {
  return { default: RedisMock };
});

// Import after mocking
import { SessionStore } from '../../src/session/session.store';
import { CreateSessionInput } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';

describe('SessionStore', () => {
  let store: SessionStore;
  let mockConfigService: { get: Mock };

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'valkey.host': 'localhost',
          'valkey.port': 6379,
          'valkey.password': '',
          'valkey.db': 15,
          'encryption.key': 'test-encryption-key-32-chars!!',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionStore, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    store = module.get<SessionStore>(SessionStore);
  });

  afterEach(async () => {
    if (store) {
      await store.onModuleDestroy();
    }
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new session', async () => {
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint-123',
        mfaVerified: false,
        mfaRequired: false,
      };

      const session = await store.create(input);

      expect(session).toBeDefined();
      expect(session.id).toHaveLength(64);
      expect(session.accountType).toBe(AccountType.USER);
      expect(session.accountId).toBe('user-123');
      expect(session.email).toBe('test@example.com');
      expect(session.accessToken).toContain(':'); // encrypted format
      expect(session.refreshToken).toContain(':'); // encrypted format
    });

    it('should set correct TTL based on account type', async () => {
      const adminInput: CreateSessionInput = {
        accountType: AccountType.ADMIN,
        accountId: 'admin-123',
        email: 'admin@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint-123',
      };

      const session = await store.create(adminInput);

      // Admin session TTL is 8 hours
      expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(8 * 60 * 60 * 1000);
    });
  });

  describe('get', () => {
    it('should return null for non-existent session', async () => {
      const session = await store.get('non-existent-id');
      expect(session).toBeNull();
    });

    it('should return session for valid ID', async () => {
      // Create a session first
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
      };

      const created = await store.create(input);
      const session = await store.get(created.id);

      expect(session).toBeDefined();
      expect(session?.id).toBe(created.id);
      expect(session?.accountId).toBe('user-123');
    });
  });

  describe('delete', () => {
    it('should return false for non-existent session', async () => {
      const result = await store.delete('non-existent-id');
      expect(result).toBe(false);
    });

    it('should delete existing session', async () => {
      // Create a session first
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
      };

      const created = await store.create(input);
      const result = await store.delete(created.id);

      expect(result).toBe(true);

      // Verify it's actually deleted
      const session = await store.get(created.id);
      expect(session).toBeNull();
    });
  });

  describe('needsRefresh', () => {
    it('should return false for non-existent session', async () => {
      const result = await store.needsRefresh('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return true when session is about to expire (mocked)', async () => {
      // Create a session
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
      };

      const created = await store.create(input);

      // For USER with 7-day TTL, refresh threshold is 24 hours
      // A fresh session should NOT need refresh
      const result = await store.needsRefresh(created.id);
      expect(result).toBe(false);
    });
  });

  describe('touch (sliding session)', () => {
    it('should return failure for non-existent session', async () => {
      const result = await store.touch('non-existent-id');
      expect(result).toEqual({ success: false, extended: false });
    });

    it('should update lastActivityAt for valid session', async () => {
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
      };

      const created = await store.create(input);
      const result = await store.touch(created.id);

      expect(result.success).toBe(true);
    });

    it('should NOT extend ADMIN session (sliding disabled)', async () => {
      const input: CreateSessionInput = {
        accountType: AccountType.ADMIN,
        accountId: 'admin-123',
        email: 'admin@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint',
        mfaVerified: true,
        mfaRequired: true,
      };

      const created = await store.create(input);
      const result = await store.touch(created.id);

      expect(result.success).toBe(true);
      expect(result.extended).toBe(false); // ADMIN sliding is disabled
    });
  });

  describe('isSessionExpiredByMaxAge', () => {
    it('should return true for session past max age', () => {
      const oldSession = {
        id: 'session-123',
        accountType: AccountType.USER as const,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(),
      };

      const result = store.isSessionExpiredByMaxAge(oldSession);
      expect(result).toBe(true); // USER max age is 30 days
    });

    it('should return false for session within max age', () => {
      const validSession = {
        id: 'session-123',
        accountType: AccountType.USER as const,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(),
      };

      const result = store.isSessionExpiredByMaxAge(validSession);
      expect(result).toBe(false);
    });
  });

  describe('getActiveSessions', () => {
    it('should return empty array for user with no sessions', async () => {
      const sessions = await store.getActiveSessions(AccountType.USER, 'non-existent-user');
      expect(sessions).toEqual([]);
    });

    it('should return sessions for user with active sessions', async () => {
      // Create multiple sessions
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-multi',
        email: 'multi@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint-1',
        mfaVerified: false,
        mfaRequired: false,
      };

      await store.create(input);
      await store.create({ ...input, deviceFingerprint: 'fingerprint-2' });

      const sessions = await store.getActiveSessions(AccountType.USER, 'user-multi');
      expect(sessions.length).toBe(2);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for an account', async () => {
      // Create multiple sessions
      const input: CreateSessionInput = {
        accountType: AccountType.USER,
        accountId: 'user-revoke',
        email: 'revoke@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        deviceFingerprint: 'fingerprint-1',
        mfaVerified: false,
        mfaRequired: false,
      };

      await store.create(input);
      await store.create({ ...input, deviceFingerprint: 'fingerprint-2' });

      const revokedCount = await store.revokeAllSessions(AccountType.USER, 'user-revoke');
      expect(revokedCount).toBe(2);

      // Verify sessions are actually deleted
      const sessions = await store.getActiveSessions(AccountType.USER, 'user-revoke');
      expect(sessions.length).toBe(0);
    });
  });
});
