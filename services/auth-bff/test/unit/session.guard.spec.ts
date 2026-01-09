import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { SessionGuard } from '../../src/common/guards/session.guard';
import { SessionService } from '../../src/session/session.service';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let reflector: Reflector;
  let sessionService: { validateSession: MockInstance };

  const mockSession: BffSession = {
    id: 'session-123',
    accountType: AccountType.USER,
    accountId: 'user-123',
    email: 'test@example.com',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    deviceFingerprint: 'fingerprint-123',
    mfaVerified: true,
    mfaRequired: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    lastActivityAt: new Date(),
  };

  const createMockExecutionContext = (request: Partial<Request> = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: vi.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            validateSession: vi.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<SessionGuard>(SessionGuard);
    reflector = module.get<Reflector>(Reflector);
    sessionService = module.get(SessionService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow public routes', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.validateSession).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when session is invalid', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      sessionService.validateSession.mockResolvedValue({
        valid: false,
        error: 'No valid session found',
      });

      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow valid session', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session: mockSession,
      });

      const request = {};
      const context = createMockExecutionContext(request);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request as Record<string, unknown>).session).toBe(mockSession);
    });

    it('should throw ForbiddenException when MFA required but not verified', async () => {
      const sessionWithoutMfa = { ...mockSession, mfaVerified: false };
      vi.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(true) // requireMfa
        .mockReturnValueOnce(null); // allowedTypes

      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session: sessionWithoutMfa,
      });

      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for wrong account type', async () => {
      vi.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(false) // requireMfa
        .mockReturnValueOnce(['ADMIN']); // allowedTypes

      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session: mockSession, // accountType is 'USER'
      });

      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow correct account type', async () => {
      vi.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(false) // requireMfa
        .mockReturnValueOnce(['USER', 'ADMIN']); // allowedTypes

      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session: mockSession,
      });

      const context = createMockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
