import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { register } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button, Alert } from '@my-girok/ui-components';
import { Mail, Lock, User, AtSign, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * RegisterPage - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Memoized username sanitizer (2025 best practice)
  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }, []);

  // Memoized submit handler (2025 best practice)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const response = await register({ email, username, password, name });
        setAuth(response.user, response.accessToken, response.refreshToken);
        navigate('/'); // Direct navigation (2025 best practice)
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || t('errors.registrationFailed'));
      } finally {
        setLoading(false);
      }
    },
    [email, username, password, name, setAuth, navigate, t],
  );

  return (
    <main className="min-h-screen bg-theme-bg-page flex flex-col transition-colors duration-200 pt-nav">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-20 mt-8">
        <div className="w-full max-w-md">
          {/* Header - V0.0.1 Editorial Style */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl text-theme-text-primary mb-3 tracking-editorial italic font-serif-title">
              {t('auth.register', { defaultValue: 'Register' })}
            </h1>
            <p className="text-[11px] font-black uppercase tracking-brand text-theme-text-secondary font-mono-brand">
              {t('auth.createArchive', { defaultValue: 'Create Your Archive' })}
            </p>
          </div>

          {/* Form Card - V0.0.1 Editorial Style */}
          <div className="bg-theme-bg-card border-2 border-theme-border-default rounded-editorial-lg p-10 md:p-14 shadow-theme-lg">
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
                size="lg"
                icon={<User size={18} />}
                value={name}
                onChange={setName}
                required
                placeholder="John Doe"
                autoComplete="name"
              />

              <TextInput
                id="username"
                label={t('auth.usernameHint')}
                type="text"
                size="lg"
                icon={<AtSign size={18} />}
                value={username}
                onChange={handleUsernameChange}
                required
                placeholder="johndoe"
                hint={t('auth.usernameRule')}
                autoComplete="username"
              />

              <TextInput
                id="email"
                label={t('auth.email')}
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
                hint={t('auth.passwordRule')}
                autoComplete="new-password"
              />

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
                {loading ? t('auth.registering') : t('auth.registerButton')}
              </Button>
            </form>

            {/* Back to Login - V0.0.1 Style */}
            <div className="mt-8">
              <Link to="/login" className="block">
                <Button variant="secondary" size="lg" rounded="default" fullWidth>
                  <ArrowLeft size={16} />
                  {t('auth.loginHere')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-theme-text-tertiary mt-6">
            {t('auth.termsAgreement')}
          </p>
        </div>
      </div>
    </main>
  );
}
