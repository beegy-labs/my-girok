import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button, Alert } from '@my-girok/ui-components';
import { Mail, Lock, ArrowRight, UserPlus, Key } from 'lucide-react';

const SAVED_EMAIL_COOKIE = 'my-girok-saved-email';
const COOKIE_EXPIRY_DAYS = 30;

/**
 * LoginPage - V25.8 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
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
      className="min-h-screen bg-theme-bg-page flex flex-col transition-colors duration-700"
      style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
    >
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-20 mt-8">
        <div className="w-full max-w-md">
          {/* Header - V25.8 Editorial Style */}
          <div className="text-center mb-10">
            <h1
              className="text-4xl sm:text-5xl text-theme-text-primary mb-3 tracking-tighter italic"
              style={{ fontFamily: 'var(--font-family-serif-title)' }}
            >
              Login
            </h1>
            <p
              className="text-[11px] font-black uppercase tracking-[0.3em] text-theme-text-secondary"
              style={{ fontFamily: 'var(--font-family-mono-brand)' }}
            >
              Archive Access
            </p>
          </div>

          {/* Form Card - V25.8 Editorial Style */}
          <div className="bg-theme-bg-card border-2 border-theme-border-default rounded-[48px] p-10 md:p-14 shadow-theme-lg">
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
                size="lg"
                icon={<Mail size={18} />}
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
                size="lg"
                icon={<Lock size={18} />}
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

              <Button
                variant="primary"
                type="submit"
                size="xl"
                rounded="editorial"
                disabled={loading}
                loading={loading}
                fullWidth
                icon={<ArrowRight size={18} />}
              >
                {t('auth.loginButton')}
              </Button>
            </form>

            {/* Secondary Actions - V25.8 Style */}
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/register" className="block">
                <Button variant="secondary" size="lg" rounded="default" fullWidth>
                  <UserPlus size={16} />
                  {t('auth.registerHere')}
                </Button>
              </Link>
              <Link to="/forgot-password" className="block">
                <Button variant="ghost" size="lg" rounded="default" fullWidth>
                  <Key size={16} />
                  {t('auth.forgotPassword', { defaultValue: 'Forgot Password' })}
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-theme-text-tertiary mt-6">
            {t('auth.termsAgreement')}
          </p>
        </div>
      </main>
    </div>
  );
}
