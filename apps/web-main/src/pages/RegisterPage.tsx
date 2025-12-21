import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { register } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import { Mail, Lock, User, AtSign, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * RegisterPage - V0.0.1 AAA Workstation Design
 * Uses AuthLayout for unified auth page styling
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
    <AuthLayout
      title={t('auth.register', { defaultValue: 'Register' })}
      subtitle={t('auth.createArchive', { defaultValue: 'Create Your Archive' })}
      error={error}
      secondaryActions={
        <Link to="/login" className="block">
          <Button variant="secondary" size="lg" rounded="default" fullWidth>
            <ArrowLeft size={16} />
            {t('auth.loginHere')}
          </Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <TextInput
          id="name"
          label={t('auth.name')}
          type="text"
          size="xl"
          icon={<User size={20} />}
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
          size="xl"
          icon={<AtSign size={20} />}
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
          hint={t('auth.passwordRule')}
          autoComplete="new-password"
        />

        <Button
          variant="primary"
          type="submit"
          size="xl"
          disabled={loading}
          loading={loading}
          fullWidth
          icon={<ArrowRight size={18} />}
        >
          {loading ? t('auth.registering') : t('auth.registerButton')}
        </Button>
      </form>
    </AuthLayout>
  );
}
