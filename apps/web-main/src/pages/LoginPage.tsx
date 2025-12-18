import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button, Alert } from '@my-girok/ui-components';

const SAVED_EMAIL_COOKIE = 'my-girok-saved-email';
const COOKIE_EXPIRY_DAYS = 30;

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Load saved email from cookie on component mount
  useEffect(() => {
    const savedEmail = Cookies.get(SAVED_EMAIL_COOKIE);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // Handle navigation after successful login (React 19 compatibility)
  useEffect(() => {
    if (loginSuccess) {
      navigate('/');
    }
  }, [loginSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setAuth(response.user, response.accessToken, response.refreshToken);
      setLoginSuccess(true); // Trigger navigation via useEffect (React 19 compatibility)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || t('errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-theme-bg-page flex flex-col items-center justify-center px-4 py-8"
      style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Brand - Editorial monospace style */}
        <div className="text-center mb-8 sm:mb-10">
          <span
            className="inline-block text-xs tracking-[0.3em] text-theme-text-muted mb-4 uppercase"
            style={{ fontFamily: 'var(--font-family-mono-brand)' }}
          >
            {t('auth.welcomeBack')}
          </span>
          <h1
            className="text-3xl sm:text-4xl text-theme-text-primary mb-3 tracking-tight"
            style={{ fontFamily: 'var(--font-family-serif-title)' }}
          >
            Girok
          </h1>
          <p className="text-theme-text-secondary text-sm">{t('auth.startRecording')}</p>
        </div>

        {/* Login Form - V24.5 Editorial Card (border-2, p-10) */}
        <div className="bg-theme-bg-card border-2 border-theme-border-default rounded-[40px] p-10 shadow-theme-lg">
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextInput
              id="email"
              label={t('auth.emailAddress')}
              type="email"
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
              value={password}
              onChange={setPassword}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {/* Checkbox with 44x44px touch target for WCAG 2.5.5 accessibility */}
            <label
              htmlFor="rememberEmail"
              className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none group"
            >
              <span className="relative flex items-center justify-center w-11 h-11">
                <input
                  id="rememberEmail"
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="absolute w-11 h-11 opacity-0 cursor-pointer peer"
                />
                <span
                  className="w-5 h-5 border-2 border-theme-border-default rounded bg-theme-bg-input transition-colors peer-checked:bg-theme-primary peer-checked:border-theme-primary peer-focus-visible:ring-2 peer-focus-visible:ring-theme-focus-ring peer-focus-visible:ring-offset-2"
                  aria-hidden="true"
                >
                  {rememberEmail && (
                    <svg
                      className="w-full h-full text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
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

            <Button variant="primary" type="submit" disabled={loading} loading={loading} fullWidth>
              {t('auth.loginButton')}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-theme-border-subtle">
            <p className="text-center text-sm text-theme-text-secondary">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="font-semibold text-theme-primary hover:text-theme-primary-light transition-colors"
              >
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-theme-text-tertiary mt-6">
          {t('auth.termsAgreement')}
        </p>
      </div>
    </div>
  );
}
