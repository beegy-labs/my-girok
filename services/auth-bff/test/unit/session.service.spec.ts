import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { SessionService } from '../../src/session/session.service';
import { SessionStore } from '../../src/session/session.store';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';
import { Request, Response } from 'express';

describe('SessionService', () => {
  let service: SessionService;
  let sessionStore: {
    create: MockInstance;
    get: MockInstance;
    delete: MockInstance;
    touch: MockInstance;
    setMfaVerified: MockInstance;
    refresh: MockInstance;
    getActiveSessions: MockInstance;
    revokeAllSessions: MockInstance;
    needsRefresh: MockInstance;
    getWithTokens: MockInstance;
  };
  let configService: {
    get: MockInstance;
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

  const mockRequest = (
    options: {
      cookies?: Record<string, string>;
      headers?: Record<string, string | string[]>;
      socket?: { remoteAddress?: string };
    } = {},
  ): Request =>
    ({
      cookies: options.cookies || {},
      headers: {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip',
        ...options.headers,
      },
      socket: { remoteAddress: options.socket?.remoteAddress || '127.0.0.1' },
    }) as unknown as Request;

  const mockResponse = (): Response =>
    ({
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    }) as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SessionStore,
          useValue: {
            create: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            touch: vi.fn(),
            setMfaVerified: vi.fn(),
            refresh: vi.fn(),
            getActiveSessions: vi.fn(),
            revokeAllSessions: vi.fn(),
            needsRefresh: vi.fn(),
            getWithTokens: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultValue: unknown) => {
              const config: Record<string, unknown> = {
                'session.cookieName': 'girok_session',
                'session.secure': false,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionStore = module.get(SessionStore);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a session and set cookie', async () => {
      sessionStore.create.mockResolvedValue(mockSession);
      const res = mockResponse();

      const result = await service.createSession(
        res,
        {
          accountType: AccountType.USER,
          accountId: 'user-123',
          email: 'user@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          deviceFingerprint: 'fingerprint-123',
          mfaVerified: false,
          mfaRequired: false,
        },
        { userAgent: 'Chrome', ipAddress: '192.168.1.1' },
      );

      expect(result).toEqual(mockSession);
      expect(sessionStore.create).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session when valid', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const fingerprint = service.getDeviceFingerprint(req);
      const sessionWithMatchingFingerprint = { ...mockSession, deviceFingerprint: fingerprint };
      sessionStore.get.mockResolvedValue(sessionWithMatchingFingerprint);
      sessionStore.touch.mockResolvedValue(true);

      const result = await service.getSession(req);

      expect(result).toEqual(sessionWithMatchingFingerprint);
      expect(sessionStore.touch).toHaveBeenCalledWith('session-123');
    });

    it('should return null when no session cookie', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.getSession(req);

      expect(result).toBeNull();
    });

    it('should return null when session not found', async () => {
      const req = mockRequest({ cookies: { girok_session: 'invalid-session' } });
      sessionStore.get.mockResolvedValue(null);

      const result = await service.getSession(req);

      expect(result).toBeNull();
    });

    it('should return null and delete session on device fingerprint mismatch', async () => {
      const req = mockRequest({
        cookies: { girok_session: 'session-123' },
        headers: { 'user-agent': 'Different Browser' },
      });
      sessionStore.get.mockResolvedValue(mockSession);
      sessionStore.delete.mockResolvedValue(true);

      const result = await service.getSession(req);

      expect(result).toBeNull();
      expect(sessionStore.delete).toHaveBeenCalledWith('session-123');
    });
  });

  describe('validateSession', () => {
    it('should return valid when session exists and no MFA required', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const fingerprint = service.getDeviceFingerprint(req);
      const sessionWithMatchingFingerprint = { ...mockSession, deviceFingerprint: fingerprint };
      sessionStore.get.mockResolvedValue(sessionWithMatchingFingerprint);
      sessionStore.touch.mockResolvedValue(true);

      const result = await service.validateSession(req);

      expect(result.valid).toBe(true);
      expect(result.session).toEqual(sessionWithMatchingFingerprint);
    });

    it('should return invalid when no session found', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.validateSession(req);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No valid session found');
    });

    it('should return invalid when MFA required but not verified', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const fingerprint = service.getDeviceFingerprint(req);
      const mfaSession = {
        ...mockSession,
        mfaRequired: true,
        mfaVerified: false,
        deviceFingerprint: fingerprint,
      };
      sessionStore.get.mockResolvedValue(mfaSession);
      sessionStore.touch.mockResolvedValue(true);

      const result = await service.validateSession(req);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MFA verification required');
    });
  });

  describe('setMfaVerified', () => {
    it('should update MFA verification status', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      sessionStore.setMfaVerified.mockResolvedValue(true);

      const result = await service.setMfaVerified(req, true);

      expect(result).toBe(true);
      expect(sessionStore.setMfaVerified).toHaveBeenCalledWith('session-123', true);
    });

    it('should return false when no session cookie', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.setMfaVerified(req, true);

      expect(result).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session with new tokens', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const res = mockResponse();
      sessionStore.refresh.mockResolvedValue(mockSession);

      const result = await service.refreshSession(req, res, 'new-access', 'new-refresh');

      expect(result).toEqual(mockSession);
      expect(sessionStore.refresh).toHaveBeenCalledWith('session-123', 'new-access', 'new-refresh');
      expect(res.cookie).toHaveBeenCalled();
    });

    it('should return null when no session cookie', async () => {
      const req = mockRequest({ cookies: {} });
      const res = mockResponse();

      const result = await service.refreshSession(req, res, 'new-access', 'new-refresh');

      expect(result).toBeNull();
    });

    it('should return null when refresh fails', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const res = mockResponse();
      sessionStore.refresh.mockResolvedValue(null);

      const result = await service.refreshSession(req, res, 'new-access', 'new-refresh');

      expect(result).toBeNull();
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('destroySession', () => {
    it('should destroy session and clear cookie', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const res = mockResponse();
      sessionStore.delete.mockResolvedValue(true);

      const result = await service.destroySession(req, res);

      expect(result).toBe(true);
      expect(sessionStore.delete).toHaveBeenCalledWith('session-123');
      expect(res.clearCookie).toHaveBeenCalled();
    });

    it('should return false when no session cookie', async () => {
      const req = mockRequest({ cookies: {} });
      const res = mockResponse();

      const result = await service.destroySession(req, res);

      expect(result).toBe(false);
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const activeSessions = [
        { id: 'session-1', deviceType: 'desktop', isCurrent: false },
        { id: 'session-123', deviceType: 'desktop', isCurrent: true },
      ];
      // Get the fingerprint that will be generated from this request
      const fingerprint = service.getDeviceFingerprint(req);
      const sessionWithMatchingFingerprint = { ...mockSession, deviceFingerprint: fingerprint };
      sessionStore.get.mockResolvedValue(sessionWithMatchingFingerprint);
      sessionStore.touch.mockResolvedValue(true);
      sessionStore.getActiveSessions.mockResolvedValue(activeSessions);

      const result = await service.getActiveSessions(req);

      expect(result).toEqual(activeSessions);
    });

    it('should return empty array when no session', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.getActiveSessions(req);

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      // Get the fingerprint that will be generated from this request
      const fingerprint = service.getDeviceFingerprint(req);
      const currentSession = { ...mockSession, deviceFingerprint: fingerprint };
      const targetSession = {
        ...mockSession,
        id: 'target-session',
        deviceFingerprint: fingerprint,
      };
      sessionStore.get.mockImplementation(async (id: string) =>
        id === 'session-123' ? currentSession : targetSession,
      );
      sessionStore.touch.mockResolvedValue(true);
      sessionStore.delete.mockResolvedValue(true);

      const result = await service.revokeSession(req, 'target-session');

      expect(result).toBe(true);
      expect(sessionStore.delete).toHaveBeenCalledWith('target-session');
    });

    it('should return false when no current session', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.revokeSession(req, 'target-session');

      expect(result).toBe(false);
    });

    it('should return false when target session belongs to different user', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const fingerprint = service.getDeviceFingerprint(req);
      const currentSession = { ...mockSession, deviceFingerprint: fingerprint };
      const targetSession = { ...mockSession, id: 'target-session', accountId: 'other-user' };
      sessionStore.get.mockImplementation(async (id: string) =>
        id === 'session-123' ? currentSession : targetSession,
      );
      sessionStore.touch.mockResolvedValue(true);

      const result = await service.revokeSession(req, 'target-session');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all other sessions', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const fingerprint = service.getDeviceFingerprint(req);
      const sessionWithMatchingFingerprint = { ...mockSession, deviceFingerprint: fingerprint };
      sessionStore.get.mockResolvedValue(sessionWithMatchingFingerprint);
      sessionStore.touch.mockResolvedValue(true);
      sessionStore.revokeAllSessions.mockResolvedValue(3);

      const result = await service.revokeAllOtherSessions(req);

      expect(result).toBe(3);
    });

    it('should return 0 when no session', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.revokeAllOtherSessions(req);

      expect(result).toBe(0);
    });
  });

  describe('needsRefresh', () => {
    it('should check if session needs refresh', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      sessionStore.needsRefresh.mockResolvedValue(true);

      const result = await service.needsRefresh(req);

      expect(result).toBe(true);
    });

    it('should return false when no session cookie', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.needsRefresh(req);

      expect(result).toBe(false);
    });
  });

  describe('getSessionWithTokens', () => {
    it('should return session with decrypted tokens', async () => {
      const req = mockRequest({ cookies: { girok_session: 'session-123' } });
      const sessionWithTokens = {
        ...mockSession,
        decryptedAccessToken: 'access-token',
        decryptedRefreshToken: 'refresh-token',
      };
      sessionStore.getWithTokens.mockResolvedValue(sessionWithTokens);

      const result = await service.getSessionWithTokens(req);

      expect(result).toEqual(sessionWithTokens);
    });

    it('should return null when no session cookie', async () => {
      const req = mockRequest({ cookies: {} });

      const result = await service.getSessionWithTokens(req);

      expect(result).toBeNull();
    });
  });

  describe('getDeviceFingerprint', () => {
    it('should generate fingerprint from request headers', () => {
      const req = mockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
        },
      });

      const result = service.getDeviceFingerprint(req);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should use x-forwarded-for if present', () => {
      const req = mockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '203.0.113.1',
        },
      });

      const fingerprint = service.getDeviceFingerprint(req);
      expect(fingerprint).toBeDefined();
    });

    it('should handle array x-forwarded-for', () => {
      const req = mockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': ['203.0.113.1', '192.168.1.1'],
        },
      });

      const fingerprint = service.getDeviceFingerprint(req);
      expect(fingerprint).toBeDefined();
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from request', () => {
      const req = mockRequest({
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone)', 'x-forwarded-for': '192.168.1.1' },
      });

      const result = service.extractMetadata(req);

      expect(result.userAgent).toContain('iPhone');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.deviceType).toBe('mobile');
    });

    it('should detect desktop device', () => {
      const req = mockRequest({
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' },
      });

      const result = service.extractMetadata(req);

      expect(result.deviceType).toBe('desktop');
    });

    it('should detect tablet device', () => {
      const req = mockRequest({
        headers: { 'user-agent': 'Mozilla/5.0 (iPad)' },
      });

      const result = service.extractMetadata(req);

      expect(result.deviceType).toBe('tablet');
    });

    it('should detect mobile device', () => {
      const req = mockRequest({
        headers: { 'user-agent': 'Mozilla/5.0 (Android)' },
      });

      const result = service.extractMetadata(req);

      expect(result.deviceType).toBe('mobile');
    });

    it('should handle array IP address', () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': ['10.0.0.1', '192.168.1.1'] },
      });

      const result = service.extractMetadata(req);

      expect(result.ipAddress).toBe('10.0.0.1');
    });
  });
});
