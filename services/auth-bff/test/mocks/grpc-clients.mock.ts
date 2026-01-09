import { vi } from 'vitest';

export const createMockIdentityGrpcClient = () => ({
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
});

export const createMockAuthGrpcClient = () => ({
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
});

export const createMockSessionService = () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  validateSession: vi.fn(),
  setMfaVerified: vi.fn(),
  refreshSession: vi.fn(),
  destroySession: vi.fn(),
  getActiveSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeAllOtherSessions: vi.fn(),
  needsRefresh: vi.fn(),
  getSessionWithTokens: vi.fn(),
  getDeviceFingerprint: vi.fn().mockReturnValue('mock-fingerprint'),
  extractMetadata: vi.fn().mockReturnValue({
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    deviceType: 'desktop',
  }),
});
