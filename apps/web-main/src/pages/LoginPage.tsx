import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import { Mail, Lock, ArrowRight, UserPlus, Key } from 'lucide-react';

const SAVED_EMAIL_COOKIE = 'my-girok-saved-email';
const COOKIE_EXPIRY_DAYS = 30;

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

  // Memoized remember email handler (2025 React best practice)
  const handleRememberEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberEmail(e.target.checked);
  }, []);

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
        setAuth(response.user, response.accessToken, response.refreshToken);
        navigate('/'); // Direct navigation (2025 best practice)
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || t('errors.loginFailed'));
      } finally {
        setLoading(false);
      }
    },
    [email, password, rememberEmail, setAuth, navigate, t],
  );

  return (
    <AuthLayout
      title={t('auth.login', { defaultValue: 'Login' })}
      subtitle={t('auth.archiveAccess', { defaultValue: 'Archive Access' })}
      error={error}
      secondaryActions={
        <>
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
          icon={<ArrowRight size={18} />}
        >
          {t('auth.loginButton')}
        </Button>
      </form>
    </AuthLayout>
  );
}
