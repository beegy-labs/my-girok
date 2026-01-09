import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminSessionService, SessionMetadata } from './admin-session.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';

describe('AdminSessionService', () => {
  let service: AdminSessionService;
  let prismaService: Mocked<PrismaService>;
  let jwtService: Mocked<JwtService>;
  let outboxService: Mocked<OutboxService>;

  const mockAdminId = '01935c6d-c2d0-7abc-8def-1234567890ab';
  const mockSessionId = '01935c6d-c2d0-7abc-8def-1234567890ac';
  const mockTokenHash = 'hashed_access_token';
  const mockRefreshTokenHash = 'hashed_refresh_token';

  const mockMetadata: SessionMetadata = {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    deviceFingerprint: 'device123',
  };

  const mockAdminRow = {
    id: mockAdminId,
    email: 'admin@example.com',
    name: 'Test Admin',
    scope: 'SUPER',
    roleId: 'role-id-1',
    roleName: 'Super Admin',
    roleLevel: 100,
    tenantId: null,
    tenantSlug: null,
    tenantType: null,
    accountMode: 'SERVICE',
    isActive: true,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
    };

    const mockJwtService = {
      signAsync: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn((_key: string, defaultValue?: string) => defaultValue),
    };

    const mockOutboxService = {
      addEventDirect: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSessionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<AdminSessionService>(AdminSessionService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    outboxService = module.get(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    beforeEach(() => {
      prismaService.$queryRaw.mockResolvedValue([mockAdminRow]);
      prismaService.$executeRaw.mockResolvedValue(1);
      jwtService.signAsync
        .mockResolvedValueOnce('access_token_123')
        .mockResolvedValueOnce('refresh_token_123');
    });

    it('should create a new session', async () => {
      const result = await service.createSession(mockAdminId, mockMetadata);

      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_123');
      expect(result.sessionId).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should create session with MFA verified', async () => {
      const result = await service.createSession(mockAdminId, mockMetadata, true, 'TOTP');

      expect(result.accessToken).toBe('access_token_123');
      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should throw error if admin not found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      await expect(service.createSession(mockAdminId, mockMetadata)).rejects.toThrow(
        'Admin not found',
      );
    });
  });

  describe('validateSession', () => {
    it('should return valid for active session', async () => {
      const mockSession = {
        id: mockSessionId,
        adminId: mockAdminId,
        tokenHash: mockTokenHash,
        mfaVerified: true,
        mfaVerifiedAt: new Date(),
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      prismaService.$queryRaw.mockResolvedValue([mockSession]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.validateSession(mockTokenHash);

      expect(result.valid).toBe(true);
      expect(result.adminId).toBe(mockAdminId);
      expect(result.sessionId).toBe(mockSessionId);
      expect(result.mfaVerified).toBe(true);
    });

    it('should return invalid for non-existent session', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.validateSession('nonexistent_hash');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Session not found');
    });

    it('should return invalid for inactive session', async () => {
      const mockSession = {
        id: mockSessionId,
        adminId: mockAdminId,
        isActive: false,
        expiresAt: new Date(Date.now() + 3600000),
      };

      prismaService.$queryRaw.mockResolvedValue([mockSession]);

      const result = await service.validateSession(mockTokenHash);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Session is inactive');
    });

    it('should return invalid for expired session', async () => {
      const mockSession = {
        id: mockSessionId,
        adminId: mockAdminId,
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      prismaService.$queryRaw.mockResolvedValue([mockSession]);

      const result = await service.validateSession(mockTokenHash);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Session expired');
    });
  });

  describe('refreshSession', () => {
    beforeEach(() => {
      jwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');
    });

    it('should refresh a valid session', async () => {
      const mockSession = {
        id: mockSessionId,
        adminId: mockAdminId,
        refreshTokenHash: mockRefreshTokenHash,
        previousRefreshTokenHash: null,
        mfaVerified: true,
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000),
      };

      prismaService.$queryRaw
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([mockAdminRow]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.refreshSession(mockRefreshTokenHash);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });

    it('should return failure for invalid refresh token', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.refreshSession('invalid_hash');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid refresh token');
    });

    it('should revoke session on refresh token reuse', async () => {
      const mockSession = {
        id: mockSessionId,
        adminId: mockAdminId,
        refreshTokenHash: 'new_hash',
        previousRefreshTokenHash: mockRefreshTokenHash, // Using old token
        mfaVerified: true,
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000),
      };

      prismaService.$queryRaw.mockResolvedValue([mockSession]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.refreshSession(mockRefreshTokenHash);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session revoked due to security concern');
    });

    it('should return failure for expired session', async () => {
      const mockSession = {
        id: mockSessionId,
        adminId: mockAdminId,
        refreshTokenHash: mockRefreshTokenHash,
        previousRefreshTokenHash: null,
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000), // Expired
      };

      prismaService.$queryRaw.mockResolvedValue([mockSession]);

      const result = await service.refreshSession(mockRefreshTokenHash);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session expired');
    });
  });

  describe('logout', () => {
    it('should logout an active session', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.logout(mockSessionId);

      expect(result).toBe(true);
      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should return false for non-existent session', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);

      const result = await service.logout('nonexistent_id');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for an admin', async () => {
      prismaService.$executeRaw.mockResolvedValue(3);
      outboxService.addEventDirect.mockResolvedValue('event-id');

      const result = await service.revokeAllSessions(mockAdminId);

      expect(result).toBe(3);
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'ADMIN_SESSION_REVOKED',
        mockAdminId,
        expect.objectContaining({
          adminId: mockAdminId,
          revokedCount: 3,
        }),
      );
    });

    it('should exclude specified session', async () => {
      prismaService.$executeRaw.mockResolvedValue(2);
      outboxService.addEventDirect.mockResolvedValue('event-id');

      const result = await service.revokeAllSessions(mockAdminId, mockSessionId);

      expect(result).toBe(2);
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'ADMIN_SESSION_REVOKED',
        mockAdminId,
        expect.objectContaining({
          excludedSessionId: mockSessionId,
        }),
      );
    });

    it('should not emit event if no sessions revoked', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);

      const result = await service.revokeAllSessions(mockAdminId);

      expect(result).toBe(0);
      expect(outboxService.addEventDirect).not.toHaveBeenCalled();
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for an admin', async () => {
      const mockSessions = [
        {
          id: mockSessionId,
          adminId: mockAdminId,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          isActive: true,
          mfaVerified: true,
          expiresAt: new Date(Date.now() + 3600000),
          lastActivityAt: new Date(),
          createdAt: new Date(),
        },
      ];

      prismaService.$queryRaw.mockResolvedValue(mockSessions);

      const result = await service.getActiveSessions(mockAdminId);

      expect(result).toHaveLength(1);
      expect(result[0].adminId).toBe(mockAdminId);
    });

    it('should return empty array if no active sessions', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getActiveSessions(mockAdminId);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateLastActivity', () => {
    it('should update last activity timestamp', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      await service.updateLastActivity(mockSessionId);

      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('markMfaVerified', () => {
    it('should mark session as MFA verified', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      await service.markMfaVerified(mockSessionId, 'TOTP');

      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });
  });
});
