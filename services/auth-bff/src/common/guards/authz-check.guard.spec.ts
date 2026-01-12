import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthzCheckGuard, AUTHZ_CHECK_KEY, AuthzCheckOptions } from './authz-check.guard';
import { AuthorizationGrpcClient } from '../../grpc-clients';

describe('AuthzCheckGuard', () => {
  let guard: AuthzCheckGuard;
  let reflector: { get: ReturnType<typeof vi.fn> };
  let authzClient: { check: ReturnType<typeof vi.fn> };

  const mockExecutionContext = (requestData: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(requestData),
      }),
    } as any;
  };

  beforeEach(async () => {
    reflector = {
      get: vi.fn(),
    };

    authzClient = {
      check: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthzCheckGuard,
        { provide: Reflector, useValue: reflector },
        { provide: AuthorizationGrpcClient, useValue: authzClient },
      ],
    }).compile();

    guard = module.get<AuthzCheckGuard>(AuthzCheckGuard);
  });

  describe('canActivate', () => {
    it('should return true when no @AuthzCheck decorator is applied', async () => {
      reflector.get.mockReturnValue(undefined);

      const context = mockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authzClient.check).not.toHaveBeenCalled();
    });

    it('should allow access when authorization check passes', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        query: { serviceSlug: 'web-app' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authzClient.check).toHaveBeenCalledWith(
        'admin:admin-123',
        'can_view',
        'session_recording:web-app',
      );
    });

    it('should deny access when authorization check fails', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_edit',
        objectType: 'session_recording',
        objectIdFrom: 'param',
        objectIdKey: 'id',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(false);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        params: { id: 'recording-456' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        "You don't have permission to can_edit this session_recording",
      );
    });

    it('should throw ForbiddenException when user ID is not found', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
      };

      reflector.get.mockReturnValue(options);

      const context = mockExecutionContext({
        query: { serviceSlug: 'web-app' },
        // No session
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
      expect(authzClient.check).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when object ID is not found', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
      };

      reflector.get.mockReturnValue(options);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        query: {}, // No serviceSlug
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Object not specified');
      expect(authzClient.check).not.toHaveBeenCalled();
    });

    it('should use custom error message when provided', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_delete',
        objectType: 'session_recording',
        objectIdFrom: 'param',
        objectIdKey: 'id',
        errorMessage: 'Access denied to this resource',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(false);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        params: { id: 'recording-456' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow('Access denied to this resource');
    });

    it('should use custom userType when provided', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
        userType: 'operator',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        query: { serviceSlug: 'web-app' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        'operator:admin-123', // Should use custom userType
        'can_view',
        'session_recording:web-app',
      );
    });
  });

  describe('getUserId', () => {
    it('should get user ID from admin session by default', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        query: { serviceSlug: 'web-app' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        'admin:admin-123',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should get user ID from operator session', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { operator: { id: 'operator-456' } },
        query: { serviceSlug: 'web-app' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        'admin:operator-456',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should get user ID from JWT when userIdFrom is "jwt"', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
        userIdFrom: 'jwt',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        user: { sub: 'user-from-jwt' },
        query: { serviceSlug: 'web-app' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        'admin:user-from-jwt',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should fallback to user.id from JWT if sub is not present', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
        userIdFrom: 'jwt',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        user: { id: 'user-id-fallback' },
        query: { serviceSlug: 'web-app' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        'admin:user-id-fallback',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('getObjectId', () => {
    it('should get object ID from query params', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_view',
        objectType: 'session_recording',
        objectIdFrom: 'query',
        objectIdKey: 'serviceSlug',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        query: { serviceSlug: 'web-app' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'session_recording:web-app',
      );
    });

    it('should get object ID from route params', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_edit',
        objectType: 'session_recording',
        objectIdFrom: 'param',
        objectIdKey: 'id',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        params: { id: 'recording-456' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'session_recording:recording-456',
      );
    });

    it('should get object ID from request body', async () => {
      const options: AuthzCheckOptions = {
        relation: 'can_create',
        objectType: 'session_recording',
        objectIdFrom: 'body',
        objectIdKey: 'serviceId',
      };

      reflector.get.mockReturnValue(options);
      authzClient.check.mockResolvedValue(true);

      const context = mockExecutionContext({
        session: { admin: { id: 'admin-123' } },
        body: { serviceId: 'service-789' },
      });

      await guard.canActivate(context);

      expect(authzClient.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'session_recording:service-789',
      );
    });
  });
});
