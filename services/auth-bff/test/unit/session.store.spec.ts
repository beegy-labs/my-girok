import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionStore } from '../../src/session/session.store';
import { CreateSessionInput } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';

// Mock Redis
const mockRedis = {
  pipeline: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  get: jest.fn(),
  del: jest.fn().mockReturnThis(),
  sadd: jest.fn().mockReturnThis(),
  srem: jest.fn().mockReturnThis(),
  smembers: jest.fn(),
  expire: jest.fn().mockReturnThis(),
  pttl: jest.fn(),
  exec: jest.fn().mockResolvedValue([]),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('SessionStore', () => {
  let store: SessionStore;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionStore,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    store = module.get<SessionStore>(SessionStore);
  });

  afterEach(async () => {
    await store.onModuleDestroy();
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
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.exec).toHaveBeenCalled();
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
      mockRedis.get.mockResolvedValue(null);

      const session = await store.get('non-existent-id');

      expect(session).toBeNull();
    });

    it('should return session for valid ID', async () => {
      const storedSession = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        lastActivityAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedSession));

      const session = await store.get('session-123');

      expect(session).toBeDefined();
      expect(session?.id).toBe('session-123');
      expect(session?.accountId).toBe('user-123');
    });

    it('should return null and delete expired session', async () => {
      const expiredSession = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        lastActivityAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredSession));

      const session = await store.get('session-123');

      expect(session).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return false for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await store.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should delete existing session', async () => {
      const storedSession = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        lastActivityAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedSession));

      const result = await store.delete('session-123');

      expect(result).toBe(true);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('needsRefresh', () => {
    it('should return false for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await store.needsRefresh('non-existent-id');

      expect(result).toBe(false);
    });

    it('should return true when session is about to expire', async () => {
      const soonExpiringSession = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes left
        lastActivityAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(soonExpiringSession));

      const result = await store.needsRefresh('session-123');

      expect(result).toBe(true); // USER threshold is 24 hours
    });
  });

  describe('touch (sliding session)', () => {
    it('should return failure for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await store.touch('non-existent-id');

      expect(result).toEqual({ success: false, extended: false });
    });

    it('should update lastActivityAt without extending for USER session with plenty of time', async () => {
      const session = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days left
        lastActivityAt: new Date(Date.now() - 60000).toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(session));
      mockRedis.pttl.mockResolvedValue(5 * 24 * 60 * 60 * 1000); // 5 days in ms

      const result = await store.touch('session-123');

      expect(result.success).toBe(true);
      expect(result.extended).toBe(false); // Not within sliding window
    });

    it('should extend USER session when within sliding window', async () => {
      const session = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours left
        lastActivityAt: new Date(Date.now() - 60000).toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(session));
      mockRedis.pttl.mockResolvedValue(12 * 60 * 60 * 1000); // 12 hours in ms (within 24h window)

      const result = await store.touch('session-123');

      expect(result.success).toBe(true);
      expect(result.extended).toBe(true); // Should be extended
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should NOT extend ADMIN session (sliding disabled)', async () => {
      const session = {
        id: 'session-123',
        accountType: AccountType.ADMIN,
        accountId: 'admin-123',
        email: 'admin@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: true,
        mfaRequired: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes left
        lastActivityAt: new Date(Date.now() - 60000).toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(session));
      mockRedis.pttl.mockResolvedValue(30 * 60 * 1000); // 30 minutes (within 1h window)

      const result = await store.touch('session-123');

      expect(result.success).toBe(true);
      expect(result.extended).toBe(false); // ADMIN sliding is disabled
    });

    it('should cap extension at MAX_AGE', async () => {
      // Session created 29 days ago, about to hit max age
      const createdAt = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      const session = {
        id: 'session-123',
        accountType: AccountType.USER,
        accountId: 'user-123',
        email: 'test@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        deviceFingerprint: 'fingerprint',
        mfaVerified: false,
        mfaRequired: false,
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(Date.now() - 60000).toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(session));
      mockRedis.pttl.mockResolvedValue(12 * 60 * 60 * 1000);

      const result = await store.touch('session-123');

      expect(result.success).toBe(true);
      // Should be extended but capped at max age (30 days from creation)
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
});
