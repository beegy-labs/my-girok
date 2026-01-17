import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oauthApi, type OAuthProviderConfig, type UpdateCredentialsRequest } from '../api/oauth';
import { AuthProvider } from '@my-girok/types';
import { useToast } from '@my-girok/ui-components';

// Query keys for cache management
export const oauthQueryKeys = {
  all: ['oauth'] as const,
  providers: () => [...oauthQueryKeys.all, 'providers'] as const,
  provider: (provider: AuthProvider) => [...oauthQueryKeys.all, 'provider', provider] as const,
};

/**
 * Hook to fetch all OAuth provider configurations
 * Uses TanStack Query for automatic caching and refetching
 */
export function useOAuthProviders() {
  return useQuery({
    queryKey: oauthQueryKeys.providers(),
    queryFn: () => oauthApi.getAllProviders(),
  });
}

/**
 * Hook to fetch a specific OAuth provider configuration
 */
export function useOAuthProvider(provider: AuthProvider) {
  return useQuery({
    queryKey: oauthQueryKeys.provider(provider),
    queryFn: () => oauthApi.getProvider(provider),
  });
}

/**
 * Hook to toggle OAuth provider enabled/disabled status
 * Automatically updates cache on success
 */
export function useToggleOAuthProvider() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ provider, enabled }: { provider: AuthProvider; enabled: boolean }) =>
      oauthApi.toggleProvider(provider, enabled),
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData<OAuthProviderConfig[]>(oauthQueryKeys.providers(), (old) => {
        if (!old) return [data];
        return old.map((p) => (p.provider === variables.provider ? data : p));
      });

      showToast({
        type: 'success',
        title: 'Provider updated',
        message: `${variables.provider} has been ${variables.enabled ? 'enabled' : 'disabled'}`,
      });
    },
    onError: (error: Error, variables) => {
      showToast({
        type: 'error',
        title: 'Failed to toggle provider',
        message:
          error.message ||
          `Unable to ${variables.enabled ? 'enable' : 'disable'} ${variables.provider}`,
      });
    },
  });
}

/**
 * Hook to update OAuth provider credentials
 * Automatically updates cache on success
 */
export function useUpdateOAuthCredentials() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      provider,
      credentials,
    }: {
      provider: AuthProvider;
      credentials: UpdateCredentialsRequest;
    }) => oauthApi.updateCredentials(provider, credentials),
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData<OAuthProviderConfig[]>(oauthQueryKeys.providers(), (old) => {
        if (!old) return [data];
        return old.map((p) => (p.provider === variables.provider ? data : p));
      });

      // Also update individual provider cache if exists
      queryClient.setQueryData(oauthQueryKeys.provider(variables.provider), data);

      showToast({
        type: 'success',
        title: 'Credentials updated',
        message: `${variables.provider} credentials have been updated successfully`,
      });
    },
    onError: (error: Error, variables) => {
      showToast({
        type: 'error',
        title: 'Failed to update credentials',
        message: error.message || `Unable to update ${variables.provider} credentials`,
      });
    },
  });
}

/**
 * Hook to manually refetch OAuth providers
 * Useful for refresh button functionality
 */
export function useRefreshOAuthProviders() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: oauthQueryKeys.providers() });
  };
}
