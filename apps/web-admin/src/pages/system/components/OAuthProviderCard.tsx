import { useState, useCallback, memo } from 'react';
import { Card } from '../../../components/atoms/Card';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { AuthProvider } from '@my-girok/types';
import { Edit2, Save, X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import type { OAuthProviderConfig, UpdateCredentialsRequest } from '../../../api/oauth';

interface OAuthProviderCardProps {
  provider: OAuthProviderConfig;
  onToggle: (provider: AuthProvider, enabled: boolean) => Promise<void>;
  onUpdate: (provider: AuthProvider, credentials: UpdateCredentialsRequest) => Promise<void>;
}

// Provider metadata for display
const PROVIDER_METADATA: Record<
  string,
  { name: string; color: string; icon: string; description: string }
> = {
  GOOGLE: {
    name: 'Google',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '🔵',
    description: 'Sign in with Google OAuth 2.0',
  },
  KAKAO: {
    name: 'Kakao',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '💬',
    description: 'Sign in with Kakao Account',
  },
  NAVER: {
    name: 'Naver',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🟢',
    description: 'Sign in with Naver Account',
  },
  APPLE: {
    name: 'Apple',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '',
    description: 'Sign in with Apple ID',
  },
};

export const OAuthProviderCard = memo(
  ({ provider, onToggle, onUpdate }: OAuthProviderCardProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toggleLoading, setToggleLoading] = useState(false);

    // Form state
    const [clientId, setClientId] = useState(provider.clientId || '');
    const [clientSecret, setClientSecret] = useState('');
    const [callbackUrl, setCallbackUrl] = useState(provider.callbackUrl || '');

    const metadata = PROVIDER_METADATA[provider.provider] || {
      name: provider.provider,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: '📱',
      description: provider.description || '',
    };

    // Handle edit mode
    const handleEditClick = useCallback(() => {
      setClientId(provider.clientId || '');
      setClientSecret('');
      setCallbackUrl(provider.callbackUrl || '');
      setIsEditing(true);
    }, [provider]);

    // Handle cancel
    const handleCancel = useCallback(() => {
      setIsEditing(false);
      setClientSecret('');
      setShowSecret(false);
    }, []);

    // Handle save
    const handleSave = useCallback(async () => {
      setLoading(true);
      try {
        const updates: UpdateCredentialsRequest = {};
        if (clientId !== provider.clientId) updates.clientId = clientId;
        if (clientSecret) updates.clientSecret = clientSecret;
        if (callbackUrl !== provider.callbackUrl) updates.callbackUrl = callbackUrl;

        await onUpdate(provider.provider, updates);
        setIsEditing(false);
        setClientSecret('');
        setShowSecret(false);
      } finally {
        setLoading(false);
      }
    }, [provider, clientId, clientSecret, callbackUrl, onUpdate]);

    // Handle toggle
    const handleToggle = useCallback(async () => {
      setToggleLoading(true);
      try {
        await onToggle(provider.provider, !provider.enabled);
      } finally {
        setToggleLoading(false);
      }
    }, [provider, onToggle]);

    return (
      <Card className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 ${metadata.color}`}
            >
              <span className="text-2xl">{metadata.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary">{metadata.name}</h3>
              <p className="text-sm text-theme-text-tertiary">{metadata.description}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {provider.enabled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                <Check size={14} />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                <AlertCircle size={14} />
                Disabled
              </span>
            )}
          </div>
        </div>

        {/* Configuration Display/Edit */}
        <div className="space-y-4">
          {isEditing ? (
            <>
              {/* Edit Mode */}
              <Input
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter OAuth client ID"
              />

              <div>
                <label className="block text-sm font-medium text-theme-text-primary mb-2">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter new secret to update (leave empty to keep current)"
                    className="w-full px-4 py-2 pr-10 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Input
                label="Callback URL"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder="https://auth-bff.girok.dev/v1/oauth/..."
              />

              {/* Edit Actions */}
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSave} loading={loading}>
                  <Save size={14} />
                  Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={loading}>
                  <X size={14} />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Display Mode */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-theme-text-tertiary mb-1">Client ID</p>
                  <p className="text-theme-text-primary font-mono text-xs break-all">
                    {provider.clientId || 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-theme-text-tertiary mb-1">Client Secret</p>
                  <p className="text-theme-text-primary font-mono text-xs">
                    {provider.clientSecretMasked || 'Not configured'}
                  </p>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-theme-text-tertiary mb-1">Callback URL</p>
                <p className="text-theme-text-primary font-mono text-xs break-all">
                  {provider.callbackUrl || 'Not configured'}
                </p>
              </div>

              {/* Display Actions */}
              <div className="flex gap-2 pt-2 border-t border-theme-border-default">
                <Button variant="secondary" size="sm" onClick={handleEditClick}>
                  <Edit2 size={14} />
                  Edit Credentials
                </Button>
                <Button
                  variant={provider.enabled ? 'ghost' : 'primary'}
                  size="sm"
                  onClick={handleToggle}
                  loading={toggleLoading}
                >
                  {provider.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Last Updated Info */}
        {provider.updatedAt && (
          <div className="mt-4 pt-4 border-t border-theme-border-default text-xs text-theme-text-tertiary">
            Last updated: {new Date(provider.updatedAt).toLocaleString()}
            {provider.updatedBy && ` by ${provider.updatedBy}`}
          </div>
        )}
      </Card>
    );
  },
);

OAuthProviderCard.displayName = 'OAuthProviderCard';
