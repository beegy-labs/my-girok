import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useOAuthProviders,
  useToggleOAuthProvider,
  useUpdateOAuthCredentials,
} from './useOAuthProviders';
import { oauthApi } from '../api/oauth';
import type { OAuthProviderConfig } from '../api/oauth';
import { AuthProvider } from '@my-girok/types';
import React from 'react';

// Mock dependencies
vi.mock('../api/oauth');
vi.mock('@my-girok/ui-components', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Test data
const mockProviders: OAuthProviderConfig[] = [
  {
    provider: AuthProvider.GOOGLE,
    enabled: true,
    clientId: 'test-client-id',
    clientSecretMasked: '****1234',
    callbackUrl: 'https://auth-bff.girok.dev/v1/oauth/google/callback',
    displayName: 'Google',
    updatedAt: new Date('2024-01-01'),
  },
  {
    provider: AuthProvider.KAKAO,
    enabled: false,
    displayName: 'Kakao',
    updatedAt: new Date('2024-01-01'),
  },
];

describe('useOAuthProviders', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useOAuthProviders', () => {
    it('should fetch OAuth providers successfully', async () => {
      vi.mocked(oauthApi.getAllProviders).mockResolvedValue(mockProviders);

      const { result } = renderHook(() => useOAuthProviders(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProviders);
      expect(oauthApi.getAllProviders).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch');
      vi.mocked(oauthApi.getAllProviders).mockRejectedValue(error);

      const { result } = renderHook(() => useOAuthProviders(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useToggleOAuthProvider', () => {
    it('should toggle provider successfully', async () => {
      const updatedProvider: OAuthProviderConfig = {
        ...mockProviders[0],
        enabled: false,
      };

      vi.mocked(oauthApi.toggleProvider).mockResolvedValue(updatedProvider);

      const { result } = renderHook(() => useToggleOAuthProvider(), { wrapper });

      result.current.mutate({
        provider: AuthProvider.GOOGLE,
        enabled: false,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(oauthApi.toggleProvider).toHaveBeenCalledWith(AuthProvider.GOOGLE, false);
    });

    it('should handle toggle error', async () => {
      const error = new Error('Failed to toggle');
      vi.mocked(oauthApi.toggleProvider).mockRejectedValue(error);

      const { result } = renderHook(() => useToggleOAuthProvider(), { wrapper });

      result.current.mutate({
        provider: AuthProvider.GOOGLE,
        enabled: false,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdateOAuthCredentials', () => {
    it('should update credentials successfully', async () => {
      const updatedProvider: OAuthProviderConfig = {
        ...mockProviders[0],
        clientId: 'new-client-id',
      };

      vi.mocked(oauthApi.updateCredentials).mockResolvedValue(updatedProvider);

      const { result } = renderHook(() => useUpdateOAuthCredentials(), { wrapper });

      const credentials = {
        clientId: 'new-client-id',
        clientSecret: 'new-secret',
      };

      result.current.mutate({
        provider: AuthProvider.GOOGLE,
        credentials,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(oauthApi.updateCredentials).toHaveBeenCalledWith(AuthProvider.GOOGLE, credentials);
    });

    it('should handle update error', async () => {
      const error = new Error('Failed to update');
      vi.mocked(oauthApi.updateCredentials).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateOAuthCredentials(), { wrapper });

      result.current.mutate({
        provider: AuthProvider.GOOGLE,
        credentials: { clientId: 'test' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });
});
