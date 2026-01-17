import { AuthProvider } from '@my-girok/types';
import apiClient from './client';

/**
 * OAuth Provider configuration response
 * Secrets are masked for security (only last 4 characters shown)
 */
export interface OAuthProviderConfig {
  provider: AuthProvider;
  enabled: boolean;
  clientId?: string;
  clientSecretMasked?: string;
  callbackUrl?: string;
  displayName: string;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Update credentials request
 */
export interface UpdateCredentialsRequest {
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
}

/**
 * Toggle provider request
 */
export interface ToggleProviderRequest {
  enabled: boolean;
}

/**
 * OAuth API client for web-admin
 * Communicates with auth-bff /v1/oauth-config endpoints
 */
export const oauthApi = {
  /**
   * Get all OAuth provider configurations
   * Secrets are masked (only last 4 chars shown)
   */
  getAllProviders: async (): Promise<OAuthProviderConfig[]> => {
    const response = await apiClient.get<OAuthProviderConfig[]>('/v1/oauth-config');
    return response.data;
  },

  /**
   * Get specific provider configuration
   */
  getProvider: async (provider: AuthProvider): Promise<OAuthProviderConfig> => {
    const response = await apiClient.get<OAuthProviderConfig>(`/v1/oauth-config/${provider}`);
    return response.data;
  },

  /**
   * Enable or disable OAuth provider
   */
  toggleProvider: async (
    provider: AuthProvider,
    enabled: boolean,
  ): Promise<OAuthProviderConfig> => {
    const response = await apiClient.patch<OAuthProviderConfig>(
      `/v1/oauth-config/${provider}/toggle`,
      { enabled },
    );
    return response.data;
  },

  /**
   * Update OAuth provider credentials
   * Client secret will be encrypted on the backend
   */
  updateCredentials: async (
    provider: AuthProvider,
    credentials: UpdateCredentialsRequest,
  ): Promise<OAuthProviderConfig> => {
    const response = await apiClient.patch<OAuthProviderConfig>(
      `/v1/oauth-config/${provider}`,
      credentials,
    );
    return response.data;
  },

  /**
   * Check if provider is enabled (public endpoint)
   */
  getProviderStatus: async (
    provider: AuthProvider,
  ): Promise<{ provider: AuthProvider; enabled: boolean }> => {
    const response = await apiClient.get<{ provider: AuthProvider; enabled: boolean }>(
      `/v1/oauth-config/${provider}/status`,
    );
    return response.data;
  },
};
