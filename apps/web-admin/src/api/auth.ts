import type {
  AdminLoginRequest,
  AdminLoginMfaRequest,
  AdminLoginResponse,
  AdminInfo,
  AdminSession,
  AdminMfaSetupResponse,
  AdminChangePasswordRequest,
  BffBaseResponse,
  SessionRevokeResponse,
  BackupCodesResponse,
} from '@my-girok/types';
import apiClient from './client';

export type { AdminLoginResponse, AdminInfo, AdminSession };

export const authApi = {
  /**
   * Admin login - Step 1
   * Returns MFA challenge if MFA is enabled, otherwise returns admin info
   */
  login: async (data: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>('/admin/login', data);
    return response.data;
  },

  /**
   * Admin MFA login - Step 2 (if MFA required)
   */
  loginMfa: async (data: AdminLoginMfaRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>('/admin/login-mfa', data);
    return response.data;
  },

  /**
   * Logout - destroys session
   */
  logout: async (): Promise<BffBaseResponse> => {
    const response = await apiClient.post<BffBaseResponse>('/admin/logout');
    return response.data;
  },

  /**
   * Get current admin info
   */
  getMe: async (): Promise<AdminInfo> => {
    const response = await apiClient.get<AdminInfo>('/admin/me');
    return response.data;
  },

  /**
   * Refresh session
   */
  refresh: async (): Promise<BffBaseResponse> => {
    const response = await apiClient.post<BffBaseResponse>('/admin/refresh');
    return response.data;
  },

  /**
   * Get active sessions
   */
  getSessions: async (): Promise<AdminSession[]> => {
    const response = await apiClient.get<AdminSession[]>('/admin/sessions');
    return response.data;
  },

  /**
   * Revoke a specific session
   */
  revokeSession: async (sessionId: string): Promise<BffBaseResponse> => {
    const response = await apiClient.delete<BffBaseResponse>(`/admin/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Revoke all other sessions
   */
  revokeAllSessions: async (): Promise<SessionRevokeResponse> => {
    const response = await apiClient.delete<SessionRevokeResponse>('/admin/sessions');
    return response.data;
  },

  /**
   * Setup MFA - returns QR code and backup codes
   */
  setupMfa: async (): Promise<AdminMfaSetupResponse> => {
    const response = await apiClient.post<AdminMfaSetupResponse>('/admin/mfa/setup');
    return response.data;
  },

  /**
   * Verify MFA setup with TOTP code
   */
  verifyMfaSetup: async (code: string): Promise<BffBaseResponse> => {
    const response = await apiClient.post<BffBaseResponse>('/admin/mfa/verify', { code });
    return response.data;
  },

  /**
   * Disable MFA
   */
  disableMfa: async (password: string): Promise<BffBaseResponse> => {
    const response = await apiClient.post<BffBaseResponse>('/admin/mfa/disable', { password });
    return response.data;
  },

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: async (password: string): Promise<BackupCodesResponse> => {
    const response = await apiClient.post<BackupCodesResponse>('/admin/mfa/backup-codes', {
      password,
    });
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: AdminChangePasswordRequest): Promise<BffBaseResponse> => {
    const response = await apiClient.post<BffBaseResponse>('/admin/password', data);
    return response.data;
  },
};
