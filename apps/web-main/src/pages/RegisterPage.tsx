import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { register } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button, Alert } from '@my-girok/ui-components';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Handle navigation after successful registration (React 19 compatibility)
  useEffect(() => {
    if (registerSuccess) {
      navigate('/');
    }
  }, [registerSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register({ email, username, password, name });
      setAuth(response.user, response.accessToken, response.refreshToken);
      setRegisterSuccess(true); // Trigger navigation via useEffect (React 19 compatibility)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || t('errors.registrationFailed'));
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
            CREATE YOUR ARCHIVE
          </span>
          <h1
            className="text-3xl sm:text-4xl text-theme-text-primary mb-3 tracking-tight"
            style={{ fontFamily: 'var(--font-family-serif-title)' }}
          >
            Girok
          </h1>
          <p className="text-theme-text-secondary text-sm">{t('auth.createYourSpace')}</p>
        </div>

        {/* Register Form - Editorial Card */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10 shadow-theme-lg">
          <h2
            className="text-xl sm:text-2xl text-theme-text-primary mb-6 tracking-tight"
            style={{ fontFamily: 'var(--font-family-serif-title)' }}
          >
            {t('auth.registerTitle')}
          </h2>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <TextInput
              id="name"
              label={t('auth.name')}
              type="text"
              value={name}
              onChange={setName}
              required
              placeholder="홍길동"
              autoComplete="name"
            />

            <TextInput
              id="username"
              label={t('auth.usernameHint')}
              type="text"
              value={username}
              onChange={(value: string) =>
                setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, ''))
              }
              required
              placeholder="hongkildong"
              hint={`📖 ${t('auth.usernameRule')}`}
              autoComplete="username"
            />

            <TextInput
              id="email"
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={setEmail}
              required
              placeholder="your@email.com"
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
              hint={t('auth.passwordRule')}
              autoComplete="new-password"
            />

            <Button variant="primary" type="submit" disabled={loading} loading={loading} fullWidth>
              {loading ? t('auth.registering') : t('auth.registerButton')}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-theme-border-subtle">
            <p className="text-center text-sm text-theme-text-secondary">
              {t('auth.hasAccount')}{' '}
              <Link
                to="/login"
                className="font-semibold text-theme-primary hover:text-theme-primary-light transition-colors"
              >
                {t('auth.loginHere')}
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
