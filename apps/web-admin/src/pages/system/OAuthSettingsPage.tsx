import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Key, RefreshCw, AlertTriangle } from 'lucide-react';
import { OAuthProviderCard } from './components/OAuthProviderCard';
import { Button } from '../../components/atoms/Button';
import { Spinner } from '../../components/atoms/Spinner';
import { oauthApi, type OAuthProviderConfig, type UpdateCredentialsRequest } from '../../api/oauth';
import { AuthProvider } from '@my-girok/types';
import { useToast } from '../../hooks/useToast';

/**
 * OAuth Settings Page
 * Allows MASTER admins to configure OAuth providers (Google, Kakao, Naver, Apple)
 * Features:
 * - View all provider configurations
 * - Enable/disable providers
 * - Update OAuth credentials (client ID, secret, callback URL)
 * - Secrets are encrypted and masked
 */
export default function OAuthSettingsPage() {
  const [providers, setProviders] = useState<OAuthProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Load providers
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await oauthApi.getAllProviders();
      setProviders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load OAuth providers';
      setError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Handle toggle provider
  const handleToggle = useCallback(
    async (provider: AuthProvider, enabled: boolean) => {
      try {
        const updated = await oauthApi.toggleProvider(provider, enabled);
        setProviders((prev) => prev.map((p) => (p.provider === provider ? updated : p)));
        showToast({
          type: 'success',
          title: 'Provider updated',
          message: `${provider} has been ${enabled ? 'enabled' : 'disabled'}`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to toggle provider';
        showToast({
          type: 'error',
          title: 'Error',
          message: errorMessage,
        });
        throw err;
      }
    },
    [showToast],
  );

  // Handle update credentials
  const handleUpdate = useCallback(
    async (provider: AuthProvider, credentials: UpdateCredentialsRequest) => {
      try {
        const updated = await oauthApi.updateCredentials(provider, credentials);
        setProviders((prev) => prev.map((p) => (p.provider === provider ? updated : p)));
        showToast({
          type: 'success',
          title: 'Credentials updated',
          message: `${provider} credentials have been updated successfully`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update credentials';
        showToast({
          type: 'error',
          title: 'Error',
          message: errorMessage,
        });
        throw err;
      }
    },
    [showToast],
  );

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

          <Button variant="secondary" size="sm" onClick={loadProviders} disabled={loading}>
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
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="mx-auto text-theme-status-error-text mb-4" size={48} />
              <h3 className="text-lg font-semibold text-theme-text-primary mb-2">
                Failed to Load Providers
              </h3>
              <p className="text-theme-text-tertiary mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={loadProviders}>
                <RefreshCw size={16} />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Provider Cards Grid */}
        {!loading && !error && (
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
        {!loading && !error && (
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
