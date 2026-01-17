import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type {
  UserLoginRequest,
  UserLoginMfaRequest,
  UserLoginResponse,
  UserRegisterRequest,
  UserRegisterResponse,
  UserInfo,
  UserMfaSetupResponse,
  UserChangePasswordRequest,
  BffBaseResponse,
  BackupCodesResponse,
  BackupCodesCountResponse,
  SessionRevokeResponse,
  OAuthProvider,
} from '@my-girok/types';

// BFF API base URL
const API_URL = import.meta.env.VITE_AUTH_BFF_URL || 'https://auth-bff.girok.dev';

/**
 * API client for auth-bff
 * Uses cookies for session management (withCredentials: true)
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Response interceptor - Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      // Preserve current URL to redirect back after login
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
    return Promise.reject(error);
  },
);

// ============================================================================
// User Auth API
// ============================================================================

/**
 * Register a new user
 */
export const register = async (data: UserRegisterRequest): Promise<UserRegisterResponse> => {
  const response = await apiClient.post<UserRegisterResponse>('/user/register', data);
  return response.data;
};

/**
 * Login with email and password
 */
export const login = async (data: UserLoginRequest): Promise<UserLoginResponse> => {
  const response = await apiClient.post<UserLoginResponse>('/user/login', data);
  return response.data;
};

/**
 * Complete login with MFA code
 */
export const loginMfa = async (data: UserLoginMfaRequest): Promise<UserLoginResponse> => {
  const response = await apiClient.post<UserLoginResponse>('/user/login-mfa', data);
  return response.data;
};

/**
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/user/logout');
  } finally {
    useAuthStore.getState().clearAuth();
  }
};

/**
 * Get current user info
 */
export const getCurrentUser = async (): Promise<UserInfo> => {
  const response = await apiClient.get<UserInfo>('/user/me');
  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (data: UserChangePasswordRequest): Promise<BffBaseResponse> => {
  const response = await apiClient.post<BffBaseResponse>('/user/password', data);
  return response.data;
};

// ============================================================================
// MFA API
// ============================================================================

/**
 * Setup MFA - returns QR code and backup codes
 */
export const setupMfa = async (): Promise<UserMfaSetupResponse> => {
  const response = await apiClient.post<UserMfaSetupResponse>('/user/mfa/setup');
  return response.data;
};

/**
 * Verify MFA setup with TOTP code
 */
export const verifyMfaSetup = async (code: string): Promise<BffBaseResponse> => {
  const response = await apiClient.post<BffBaseResponse>('/user/mfa/verify', { code });
  return response.data;
};

/**
 * Disable MFA
 */
export const disableMfa = async (password: string): Promise<BffBaseResponse> => {
  const response = await apiClient.post<BffBaseResponse>('/user/mfa/disable', { password });
  return response.data;
};

/**
 * Get backup codes count
 */
export const getBackupCodesCount = async (): Promise<BackupCodesCountResponse> => {
  const response = await apiClient.get<BackupCodesCountResponse>('/user/mfa/backup-codes');
  return response.data;
};

/**
 * Regenerate backup codes
 */
export const regenerateBackupCodes = async (password: string): Promise<BackupCodesResponse> => {
  const response = await apiClient.post<BackupCodesResponse>('/user/mfa/backup-codes', {
    password,
  });
  return response.data;
};

// ============================================================================
// Session API
// ============================================================================

/**
 * Revoke all other sessions
 */
export const revokeAllSessions = async (): Promise<SessionRevokeResponse> => {
  const response = await apiClient.delete<SessionRevokeResponse>('/user/sessions');
  return response.data;
};

// ============================================================================
// OAuth API
// ============================================================================

/**
 * Get OAuth authorization URL
 */
export const getOAuthUrl = (provider: OAuthProvider): string => {
  return `${API_URL}/oauth/${provider.toLowerCase()}`;
};

/**
 * Initiate OAuth flow - redirects to provider
 */
export const initiateOAuth = (provider: OAuthProvider): void => {
  window.location.href = getOAuthUrl(provider);
};

/**
 * Get enabled OAuth providers
 * Returns list of OAuth providers that are currently enabled by admin
 */
export const getEnabledOAuthProviders = async (): Promise<{
  providers: Array<{
    provider: string;
    displayName: string;
    description?: string;
  }>;
}> => {
  const response = await apiClient.get('/oauth/enabled');
  return response.data;
};

// Export the API client for other uses
// Also export as publicApi and authApi for backwards compatibility
export { apiClient, apiClient as publicApi, apiClient as authApi };
