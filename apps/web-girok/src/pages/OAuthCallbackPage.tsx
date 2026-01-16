import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../layouts';
import { Button } from '@my-girok/ui-components';
import { Loader2, CheckCircle, XCircle, Home } from 'lucide-react';

type CallbackStatus = 'loading' | 'success' | 'error' | 'mfa_required';

/**
 * OAuthCallbackPage - Handles OAuth provider callback
 *
 * The BFF redirects here after OAuth authentication with query params:
 * - provider: The OAuth provider (google, kakao, naver, apple)
 * - status: success | error | mfa_required | not_implemented
 * - error: Error message if status is error
 *
 * On success, the session cookie is already set by the BFF.
 * We just need to fetch user info and redirect to the intended destination.
 */
export default function OAuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, setMfaChallenge } = useAuthStore();

  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Get params from URL
  const provider = searchParams.get('provider') || '';
  const callbackStatus = searchParams.get('status');
  const errorParam = searchParams.get('error');
  const challengeId = searchParams.get('challengeId');
  const methods = searchParams.get('methods');

  // Get return URL from sessionStorage (set before OAuth redirect)
  const returnUrl = sessionStorage.getItem('oauth_return_url') || '/';

  const handleSuccess = useCallback(async () => {
    try {
      // Fetch user info - session cookie is already set by BFF
      const { getCurrentUser } = await import('../api/auth');
      const user = await getCurrentUser();
      setAuth(user);

      // Clear stored return URL
      sessionStorage.removeItem('oauth_return_url');

      setStatus('success');

      // Redirect after a brief success message
      setTimeout(() => {
        navigate(returnUrl, { replace: true });
      }, 1500);
    } catch {
      setStatus('error');
      setErrorMessage(
        t('oauth.errorFetchingUser', { defaultValue: 'Failed to get user information' }),
      );
    }
  }, [setAuth, navigate, returnUrl, t]);

  const handleMfaRequired = useCallback(() => {
    if (challengeId) {
      const availableMethods = methods ? methods.split(',') : ['totp'];
      setMfaChallenge(challengeId, availableMethods);

      // Store return URL for after MFA
      sessionStorage.setItem('mfa_return_url', returnUrl);
      sessionStorage.removeItem('oauth_return_url');

      navigate('/login/mfa', { replace: true });
    } else {
      setStatus('error');
      setErrorMessage(t('oauth.mfaConfigError', { defaultValue: 'MFA configuration error' }));
    }
  }, [challengeId, methods, setMfaChallenge, navigate, returnUrl, t]);

  useEffect(() => {
    // Process callback status from BFF
    switch (callbackStatus) {
      case 'success':
        handleSuccess();
        break;

      case 'mfa_required':
        setStatus('mfa_required');
        handleMfaRequired();
        break;

      case 'error':
        setStatus('error');
        setErrorMessage(
          errorParam || t('oauth.genericError', { defaultValue: 'Authentication failed' }),
        );
        break;

      case 'not_implemented':
        setStatus('error');
        setErrorMessage(
          t('oauth.notImplemented', {
            provider: provider.charAt(0).toUpperCase() + provider.slice(1),
            defaultValue: `${provider} login is not yet available`,
          }),
        );
        break;

      default:
        // No status - might be a direct access, redirect to login
        navigate('/login', { replace: true });
    }
  }, [callbackStatus, errorParam, provider, handleSuccess, handleMfaRequired, navigate, t]);

  const handleRetry = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <Loader2 className="w-12 h-12 text-theme-primary animate-spin" />
            <p className="text-theme-text-secondary">
              {t('oauth.processing', { defaultValue: 'Processing authentication...' })}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-theme-text-primary font-medium">
              {t('oauth.success', { defaultValue: 'Successfully authenticated!' })}
            </p>
            <p className="text-theme-text-secondary text-sm">
              {t('oauth.redirecting', { defaultValue: 'Redirecting...' })}
            </p>
          </div>
        );

      case 'mfa_required':
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <Loader2 className="w-12 h-12 text-theme-primary animate-spin" />
            <p className="text-theme-text-secondary">
              {t('oauth.mfaRedirecting', { defaultValue: 'MFA required. Redirecting...' })}
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <XCircle className="w-12 h-12 text-red-500" />
            <p className="text-theme-text-primary font-medium text-center">{errorMessage}</p>
            <div className="flex gap-3 w-full">
              <Button variant="secondary" size="lg" fullWidth onClick={handleRetry}>
                {t('oauth.tryAgain', { defaultValue: 'Try Again' })}
              </Button>
              <Button variant="ghost" size="lg" fullWidth onClick={handleGoHome}>
                <Home size={16} />
                {t('oauth.goHome', { defaultValue: 'Go Home' })}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <AuthLayout
      title={t('oauth.title', { defaultValue: 'Authentication' })}
      subtitle={t('oauth.subtitle', { defaultValue: 'OAuth Sign In' })}
      showTermsFooter={false}
    >
      {renderContent()}
    </AuthLayout>
  );
}
