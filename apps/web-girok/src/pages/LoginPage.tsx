import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { login, initiateOAuth, getEnabledOAuthProviders } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import { Mail, Lock, UserPlus, Key, Loader2 } from 'lucide-react';
import { AuthProvider, type OAuthProvider } from '@my-girok/types';

const SAVED_EMAIL_COOKIE = 'my-girok-saved-email';
const COOKIE_EXPIRY_DAYS = 30;

// OAuth provider icons
const OAuthIcons = {
  GOOGLE: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  ),
  KAKAO: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.58 2 11c0 2.8 1.86 5.25 4.64 6.64-.15.54-.98 3.49-1.01 3.71 0 0-.02.12.06.17.08.05.17.02.17.02.23-.03 2.67-1.74 3.09-2.04.68.1 1.38.15 2.05.15 5.52 0 10-3.58 10-8s-4.48-8-10-8z"
      />
    </svg>
  ),
  NAVER: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"
      />
    </svg>
  ),
  APPLE: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  ),
};

/**
 * LoginPage - V0.0.1 AAA Workstation Design
 * Uses AuthLayout for unified auth page styling
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, setMfaChallenge, isAuthenticated } = useAuthStore();

  // Get returnUrl from query params, validate it's a local path for security
  const returnUrl = useMemo(() => {
    const url = searchParams.get('returnUrl');
    // Only allow local paths (starting with /) to prevent open redirect attacks
    if (url && url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return '/';
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, returnUrl]);

  // Load saved email from cookie on component mount
  useEffect(() => {
    const savedEmail = Cookies.get(SAVED_EMAIL_COOKIE);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // Fetch enabled OAuth providers on mount
  useEffect(() => {
    const fetchEnabledProviders = async () => {
      try {
        setLoadingProviders(true);
        const response = await getEnabledOAuthProviders();
        const providerNames = response.providers.map((p) => p.provider);
        setEnabledProviders(providerNames);
      } catch (error) {
        // Gracefully handle error - show no OAuth buttons if endpoint fails
        console.error('Failed to fetch enabled OAuth providers:', error);
        setEnabledProviders([]);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchEnabledProviders();
  }, []);

  // Memoized remember email handler (2025 React best practice)
  const handleRememberEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberEmail(e.target.checked);
  }, []);

  // Handle OAuth login
  const handleOAuthLogin = useCallback(
    (provider: OAuthProvider) => {
      // Store returnUrl in session storage for OAuth callback
      sessionStorage.setItem('oauth_return_url', returnUrl);
      initiateOAuth(provider);
    },
    [returnUrl],
  );

  // Memoized submit handler (rules.md:275 - useCallback for ALL event handlers)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        // Save email to cookie if remember is checked
        if (rememberEmail) {
          Cookies.set(SAVED_EMAIL_COOKIE, email, { expires: COOKIE_EXPIRY_DAYS });
        } else {
          Cookies.remove(SAVED_EMAIL_COOKIE);
        }

        const response = await login({ email, password });

        if (!response.success) {
          setError(response.message || t('errors.loginFailed'));
          return;
        }

        // MFA required - redirect to MFA page
        if (response.mfaRequired && response.challengeId) {
          setMfaChallenge(response.challengeId, response.availableMethods || ['totp']);
          navigate('/login/mfa', {
            state: { returnUrl },
            replace: true,
          });
          return;
        }

        // Login complete - session cookie is set by the server
        if (response.user) {
          setAuth(response.user);
          navigate(returnUrl, { replace: true });
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || t('errors.loginFailed'));
      } finally {
        setLoading(false);
      }
    },
    [email, password, rememberEmail, setAuth, setMfaChallenge, navigate, returnUrl, t],
  );

  return (
    <AuthLayout
      title={t('auth.login')}
      subtitle={t('auth.archiveAccess')}
      error={error}
      secondaryActions={
        <>
          <Link to="/consent" className="block">
            <Button variant="secondary" size="lg" rounded="default" fullWidth>
              <UserPlus size={16} />
              {t('auth.registerHere')}
            </Button>
          </Link>
          <Link to="/forgot-password" className="block">
            <Button variant="ghost" size="lg" rounded="default" fullWidth>
              <Key size={16} />
              {t('auth.forgotPassword')}
            </Button>
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <TextInput
          id="email"
          label={t('auth.emailAddress')}
          type="email"
          size="xl"
          icon={<Mail size={20} />}
          value={email}
          onChange={setEmail}
          required
          placeholder="you@example.com"
          autoComplete="email"
        />

        <TextInput
          id="password"
          label={t('auth.password')}
          type="password"
          size="xl"
          icon={<Lock size={20} />}
          showPasswordToggle
          value={password}
          onChange={setPassword}
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {/* Checkbox with 44x44px touch target for WCAG 2.5.5 accessibility */}
        <label
          htmlFor="rememberEmail"
          className="flex items-center gap-4 min-h-touch-aa cursor-pointer select-none group"
        >
          <span className="relative flex items-center justify-center w-11 h-11">
            <input
              id="rememberEmail"
              type="checkbox"
              checked={rememberEmail}
              onChange={handleRememberEmailChange}
              className="absolute w-11 h-11 opacity-0 cursor-pointer peer"
            />
            <span
              className="w-5 h-5 border-2 border-theme-border-default rounded bg-theme-bg-input transition-colors peer-checked:bg-theme-primary peer-checked:border-theme-primary peer-focus-visible:ring-[4px] peer-focus-visible:ring-theme-focus-ring peer-focus-visible:ring-offset-4"
              aria-hidden="true"
            >
              {rememberEmail && (
                <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </span>
          <span className="text-sm text-theme-text-secondary">{t('auth.rememberEmail')}</span>
        </label>

        <Button
          variant="primary"
          type="submit"
          size="xl"
          disabled={loading}
          loading={loading}
          fullWidth
        >
          {t('auth.loginButton')}
        </Button>

        {/* OAuth Section - Only show if providers are available */}
        {!loadingProviders && enabledProviders.length > 0 && (
          <>
            {/* OAuth Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-theme-border-default" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-theme-bg-page text-theme-text-tertiary">
                  {t('auth.orContinueWith')}
                </span>
              </div>
            </div>

            {/* Dynamic OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {enabledProviders.includes('GOOGLE') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => handleOAuthLogin(AuthProvider.GOOGLE)}
                  className="flex items-center justify-center gap-2"
                >
                  {OAuthIcons.GOOGLE}
                  <span>Google</span>
                </Button>
              )}
              {enabledProviders.includes('KAKAO') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => handleOAuthLogin(AuthProvider.KAKAO)}
                  className="flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#000000]"
                >
                  {OAuthIcons.KAKAO}
                  <span>Kakao</span>
                </Button>
              )}
              {enabledProviders.includes('NAVER') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => handleOAuthLogin(AuthProvider.NAVER)}
                  className="flex items-center justify-center gap-2 bg-[#03C75A] hover:bg-[#02B350] text-white"
                >
                  {OAuthIcons.NAVER}
                  <span>Naver</span>
                </Button>
              )}
              {enabledProviders.includes('APPLE') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => handleOAuthLogin(AuthProvider.APPLE)}
                  className="flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white"
                >
                  {OAuthIcons.APPLE}
                  <span>Apple</span>
                </Button>
              )}
            </div>
          </>
        )}

        {/* OAuth Loading State */}
        {loadingProviders && (
          <div className="flex items-center justify-center gap-2 py-4 text-theme-text-tertiary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">{t('auth.loadingProviders')}</span>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
