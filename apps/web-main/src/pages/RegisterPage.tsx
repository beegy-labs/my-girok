import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { register } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { TextInput, Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import { Mail, Lock, User, AtSign, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { ConsentType } from '@my-girok/types';
import type { UserLocaleInfo } from '../utils/regionDetection';

/**
 * Consent state type
 */
type ConsentState = Partial<Record<ConsentType, boolean>>;

/**
 * RegisterPage - Step 2 of Registration Flow
 * Account information collection after consent
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
  const [consents, setConsents] = useState<ConsentState | null>(null);
  const [localeInfo, setLocaleInfo] = useState<UserLocaleInfo | null>(null);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Load consents and locale info from sessionStorage on mount
  useEffect(() => {
    const storedConsents = sessionStorage.getItem('registration_consents');
    const storedLocaleInfo = sessionStorage.getItem('registration_locale_info');

    if (!storedConsents) {
      // Redirect to consent page if no consents found
      navigate('/consent', { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(storedConsents) as ConsentState;
      // Validate required consents
      if (!parsed[ConsentType.TERMS_OF_SERVICE] || !parsed[ConsentType.PRIVACY_POLICY]) {
        navigate('/consent', { replace: true });
        return;
      }
      setConsents(parsed);

      // Parse locale info if available
      if (storedLocaleInfo) {
        const parsedLocale = JSON.parse(storedLocaleInfo) as UserLocaleInfo;
        setLocaleInfo(parsedLocale);
      }
    } catch {
      navigate('/consent', { replace: true });
    }
  }, [navigate]);

  // Memoized username sanitizer (2025 best practice)
  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }, []);

  // Memoized submit handler (2025 best practice)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!consents) {
        navigate('/consent', { replace: true });
        return;
      }

      setLoading(true);

      try {
        const response = await register({
          email,
          username,
          password,
          name,
          consents: Object.entries(consents)
            .filter(([, agreed]) => agreed)
            .map(([type]) => ({ type: type as ConsentType, agreed: true })),
          // Include locale info for region-based consent policy
          language: localeInfo?.language,
          country: localeInfo?.country,
          timezone: localeInfo?.timezone,
        });
        // Clear stored data after successful registration
        sessionStorage.removeItem('registration_consents');
        sessionStorage.removeItem('registration_locale_info');
        setAuth(response.user, response.accessToken, response.refreshToken);
        navigate('/'); // Direct navigation (2025 best practice)
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || t('errors.registrationFailed'));
      } finally {
        setLoading(false);
      }
    },
    [email, username, password, name, consents, setAuth, navigate, t],
  );

  // Show nothing while loading consents
  if (consents === null) {
    return null;
  }

  // Count agreed consents for display
  const agreedCount = Object.values(consents).filter(Boolean).length;

  return (
    <AuthLayout
      title={t('auth.register', { defaultValue: 'Register' })}
      subtitle={t('auth.createArchive', { defaultValue: 'Create Your Archive' })}
      error={error}
      secondaryActions={
        <Link to="/consent" className="block">
          <Button variant="secondary" size="lg" rounded="default" fullWidth>
            <ArrowLeft size={16} />
            {t('auth.backToConsent', { defaultValue: 'Back to Consent' })}
          </Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consent Summary Badge */}
        <div className="flex items-center gap-2 p-3 bg-theme-status-success/10 rounded-lg border border-theme-status-success/20">
          <CheckCircle size={18} className="text-theme-status-success shrink-0" />
          <span className="text-sm text-theme-text-primary">
            {t('consent.agreedCount', {
              defaultValue: '{{count}} consents agreed',
              count: agreedCount,
            })}
          </span>
          <Link to="/consent" className="text-xs text-theme-primary hover:underline ml-auto">
            {t('consent.modify', { defaultValue: 'Modify' })}
          </Link>
        </div>

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
