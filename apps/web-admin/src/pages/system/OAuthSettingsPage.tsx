import { Helmet } from 'react-helmet-async';
import { Key, RefreshCw, AlertTriangle } from 'lucide-react';
import { OAuthProviderCard } from './components/OAuthProviderCard';
import { Button } from '../../components/atoms/Button';
import { Spinner } from '../../components/atoms/Spinner';
import type { UpdateCredentialsRequest } from '../../api/oauth';
import { AuthProvider } from '@my-girok/types';
import {
  useOAuthProviders,
  useToggleOAuthProvider,
  useUpdateOAuthCredentials,
  useRefreshOAuthProviders,
} from '../../hooks/useOAuthProviders';

/**
 * OAuth Settings Page
 * Allows MASTER admins to configure OAuth providers (Google, Kakao, Naver, Apple)
 * Features:
 * - View all provider configurations
 * - Enable/disable providers
 * - Update OAuth credentials (client ID, secret, callback URL)
 * - Secrets are encrypted and masked
 *
 * Uses TanStack Query for data fetching and caching
 */
export default function OAuthSettingsPage() {
  const { data: providers, isLoading, isError, error } = useOAuthProviders();
  const toggleProvider = useToggleOAuthProvider();
  const updateCredentials = useUpdateOAuthCredentials();
  const refreshProviders = useRefreshOAuthProviders();

  // Handle toggle provider
  const handleToggle = async (provider: AuthProvider, enabled: boolean) => {
    await toggleProvider.mutateAsync({ provider, enabled });
  };

  // Handle update credentials
  const handleUpdate = async (provider: AuthProvider, credentials: UpdateCredentialsRequest) => {
    await updateCredentials.mutateAsync({ provider, credentials });
  };

  return (
    <>
      <Helmet>
        <title>OAuth Settings - My Girok Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-theme-primary/10 rounded-xl">
              <Key className="text-theme-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-text-primary">OAuth Settings</h1>
              <p className="text-sm text-theme-text-tertiary">
                Manage OAuth provider configurations for user authentication
              </p>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={refreshProviders} disabled={isLoading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">Security Notice</p>
            <p className="text-amber-800 dark:text-amber-300">
              OAuth client secrets are encrypted using AES-256-GCM and stored securely. Only the
              last 4 characters are shown for verification. When updating credentials, ensure you
              copy them from the official OAuth provider console.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="mx-auto text-theme-status-error-text mb-4" size={48} />
              <h3 className="text-lg font-semibold text-theme-text-primary mb-2">
                Failed to Load Providers
              </h3>
              <p className="text-theme-text-tertiary mb-4">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <Button variant="primary" size="sm" onClick={refreshProviders}>
                <RefreshCw size={16} />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Provider Cards Grid */}
        {!isLoading && !isError && providers && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {providers.map((provider) => (
              <OAuthProviderCard
                key={provider.provider}
                provider={provider}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

        {/* Help Section */}
        {!isLoading && !isError && (
          <div className="mt-8 p-6 bg-theme-bg-secondary border border-theme-border-default rounded-lg">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
              OAuth Provider Setup Guide
            </h3>
            <div className="space-y-4 text-sm text-theme-text-secondary">
              <div>
                <h4 className="font-medium text-theme-text-primary mb-2">Google OAuth 2.0</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit Google Cloud Console → APIs & Services → Credentials</li>
                  <li>Create OAuth 2.0 Client ID (Web application)</li>
                  <li>Add authorized redirect URIs</li>
                  <li>Copy Client ID and Client Secret to this page</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-theme-text-primary mb-2">Kakao Login</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit Kakao Developers → My Application</li>
                  <li>Navigate to Kakao Login settings</li>
                  <li>Set Redirect URI</li>
                  <li>Copy REST API Key (Client ID) and Client Secret</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-theme-text-primary mb-2">Naver Login</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit Naver Developers → Application → Register</li>
                  <li>Set Callback URL</li>
                  <li>Copy Client ID and Client Secret</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-theme-text-primary mb-2">Sign in with Apple</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit Apple Developer → Certificates, Identifiers & Profiles</li>
                  <li>Create Services ID and configure Sign In with Apple</li>
                  <li>Set Return URLs</li>
                  <li>Generate Client Secret using private key (JWT-based)</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
