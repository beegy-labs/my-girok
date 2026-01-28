import { vi } from 'vitest';
import { Request, Response } from 'express';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';

/**
 * Factory functions for creating mock objects in tests
 * Reduces duplication across test files and ensures consistency
 */

// ============================================================================
// Session Mocks
// ============================================================================

export interface MockSessionOptions {
  id?: string;
  accountType?: AccountType;
  accountId?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  deviceFingerprint?: string;
  mfaVerified?: boolean;
  mfaRequired?: boolean;
  permissions?: string[];
  createdAt?: Date;
  expiresAt?: Date;
  lastActivityAt?: Date;
}

export function createMockSession(options: MockSessionOptions = {}): BffSession {
  const now = new Date();
  return {
    id: options.id ?? 'session-123',
    accountType: options.accountType ?? AccountType.USER,
    accountId: options.accountId ?? 'user-123',
    email: options.email ?? 'user@example.com',
    accessToken: options.accessToken ?? 'encrypted-access-token',
    refreshToken: options.refreshToken ?? 'encrypted-refresh-token',
    deviceFingerprint: options.deviceFingerprint ?? 'fingerprint-123',
    mfaVerified: options.mfaVerified ?? false,
    mfaRequired: options.mfaRequired ?? false,
    permissions: options.permissions,
    createdAt: options.createdAt ?? now,
    expiresAt: options.expiresAt ?? new Date(now.getTime() + 86400000),
    lastActivityAt: options.lastActivityAt ?? now,
  };
}

export function createMockAdminSession(options: MockSessionOptions = {}): BffSession {
  return createMockSession({
    accountType: AccountType.ADMIN,
    accountId: 'admin-123',
    email: 'admin@example.com',
    mfaRequired: true,
    mfaVerified: true,
    permissions: ['users:read', 'users:write'],
    ...options,
  });
}

// ============================================================================
// Request/Response Mocks
// ============================================================================

export interface MockRequestOptions {
  cookies?: Record<string, string>;
  headers?: Record<string, string | string[]>;
  socket?: { remoteAddress?: string };
}

export function createMockRequest(options: MockRequestOptions = {}): Request {
  return {
    cookies: options.cookies ?? {},
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
      'x-service-id': 'service-123', // Required for service domain verification
      ...options.headers,
    },
    socket: { remoteAddress: options.socket?.remoteAddress ?? '127.0.0.1' },
  } as unknown as Request;
}

export function createMockResponse(): Response & {
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
} {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
}

// ============================================================================
// Admin/User Mocks
// ============================================================================

export interface MockAdminOptions {
  id?: string;
  email?: string;
  name?: string;
  scope?: number;
  roleId?: string;
  roleName?: string;
  permissions?: Array<{ id: string; resource: string; action: string }>;
  isActive?: boolean;
  mfaRequired?: boolean;
  mfaEnabled?: boolean;
}

export function createMockAdmin(options: MockAdminOptions = {}) {
  return {
    id: options.id ?? 'admin-123',
    email: options.email ?? 'admin@example.com',
    name: options.name ?? 'Test Admin',
    scope: options.scope ?? 1,
    roleId: options.roleId ?? 'role-1',
    role: {
      id: options.roleId ?? 'role-1',
      name: options.roleName ?? 'SuperAdmin',
      permissions: options.permissions ?? [
        { id: 'p1', resource: 'users', action: 'read' },
        { id: 'p2', resource: 'users', action: 'write' },
      ],
    },
    isActive: options.isActive ?? true,
    mfaRequired: options.mfaRequired ?? true,
    mfaEnabled: options.mfaEnabled ?? true,
  };
}

export interface MockUserOptions {
  id?: string;
  email?: string;
  username?: string;
  displayName?: string;
  provider?: number;
  mfaEnabled?: boolean;
  emailVerified?: boolean;
  status?: number;
}

export function createMockUser(options: MockUserOptions = {}) {
  return {
    id: options.id ?? 'user-123',
    email: options.email ?? 'user@example.com',
    username: options.username ?? 'testuser',
    displayName: options.displayName ?? 'Test User',
    provider: options.provider ?? 1,
    mfaEnabled: options.mfaEnabled ?? false,
    emailVerified: options.emailVerified ?? true,
    status: options.status ?? 1,
  };
}

// ============================================================================
// gRPC Error Mocks
// ============================================================================

export enum GrpcErrorCode {
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16,
}

export interface GrpcError extends Error {
  code: GrpcErrorCode;
  details?: string;
  metadata?: Record<string, string>;
}

export function createGrpcError(code: GrpcErrorCode, message: string, details?: string): GrpcError {
  const error = new Error(message) as GrpcError;
  error.code = code;
  error.details = details;
  error.name = 'GrpcError';
  return error;
}

export function createNetworkError(message = 'Network error'): GrpcError {
  return createGrpcError(GrpcErrorCode.UNAVAILABLE, message, 'Connection refused');
}

export function createTimeoutError(message = 'Deadline exceeded'): GrpcError {
  return createGrpcError(GrpcErrorCode.DEADLINE_EXCEEDED, message);
}

export function createInternalError(message = 'Internal server error'): GrpcError {
  return createGrpcError(GrpcErrorCode.INTERNAL, message);
}

export function createNotFoundError(message = 'Resource not found'): GrpcError {
  return createGrpcError(GrpcErrorCode.NOT_FOUND, message);
}

export function createUnauthenticatedError(message = 'Unauthenticated'): GrpcError {
  return createGrpcError(GrpcErrorCode.UNAUTHENTICATED, message);
}

export function createPermissionDeniedError(message = 'Permission denied'): GrpcError {
  return createGrpcError(GrpcErrorCode.PERMISSION_DENIED, message);
}
