import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { register } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, PrimaryButton, Card } from '../components/ui';

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
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <span className="text-3xl mr-2">📚</span>
            <h1 className="text-4xl font-bold text-amber-900 dark:text-dark-text-primary">
              My-Girok
            </h1>
          </div>
          <p className="text-gray-600 dark:text-dark-text-secondary text-sm">{t('auth.createYourSpace')}</p>
        </div>

        {/* Register Form */}
        <Card variant="primary" padding="lg" className="shadow-xl">
          <h2 className="text-2xl font-bold text-amber-900 dark:text-dark-text-primary mb-6">{t('auth.registerTitle')}</h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
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
              onChange={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
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

            <PrimaryButton
              type="submit"
              disabled={loading}
              loading={loading}
              fullWidth
            >
              {loading ? t('auth.registering') : t('auth.registerButton')}
            </PrimaryButton>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border-subtle">
            <p className="text-center text-sm text-gray-600 dark:text-dark-text-secondary">
              {t('auth.hasAccount')}{' '}
              <Link
                to="/login"
                className="font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
              >
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-500 dark:text-dark-text-tertiary mt-6">
          {t('auth.termsAgreement')}
        </p>
      </div>
    </div>
  );
}
