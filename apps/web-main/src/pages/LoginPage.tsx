import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, PrimaryButton, Card, PageContainer, Alert } from '../components/ui';

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
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="sm" centered>
      {/* Logo/Brand */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="flex items-center justify-center mb-3">
          <span className="text-2xl sm:text-3xl mr-2">📚</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-vintage-text-primary dark:text-dark-text-primary">
            My-Girok
          </h1>
        </div>
        <p className="text-vintage-text-secondary dark:text-dark-text-secondary text-sm">{t('auth.startRecording')}</p>
      </div>

      {/* Login Form */}
      <Card variant="primary" padding="lg" className="shadow-xl">
        {error && <Alert type="error" message={error} className="mb-6" />}

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

            <div className="flex items-center">
              <input
                id="rememberEmail"
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="w-4 h-4 text-vintage-primary dark:text-vintage-primary bg-vintage-bg-input dark:bg-dark-bg-secondary border-vintage-border-default dark:border-dark-border-default rounded focus:ring-vintage-primary dark:focus:ring-vintage-primary focus:ring-2"
              />
              <label htmlFor="rememberEmail" className="ml-2 text-sm text-vintage-text-secondary dark:text-dark-text-secondary">
                {t('auth.rememberEmail')}
              </label>
            </div>

            <PrimaryButton
              type="submit"
              disabled={loading}
              loading={loading}
              fullWidth
            >
              {t('auth.loginButton')}
            </PrimaryButton>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-vintage-border-subtle dark:border-dark-border-subtle">
            <p className="text-center text-sm text-vintage-text-secondary dark:text-dark-text-secondary">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="font-semibold text-vintage-primary dark:text-vintage-primary hover:text-vintage-primary-light dark:hover:text-vintage-primary-light transition-colors"
              >
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>
        </Card>

      {/* Footer Note */}
      <p className="text-center text-xs text-vintage-text-tertiary dark:text-dark-text-tertiary mt-6">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>
    </PageContainer>
  );
}
