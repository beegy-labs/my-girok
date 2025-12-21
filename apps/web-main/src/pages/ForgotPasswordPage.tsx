import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TextInput, Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import { Mail, Key, ArrowLeft } from 'lucide-react';

/**
 * ForgotPasswordPage - V0.0.1 AAA Workstation Design
 * Uses AuthLayout for unified auth page styling
 * UI-only implementation (API connection pending)
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Memoized submit handler (rules.md:275 - useCallback for ALL event handlers)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: Connect to API
    // Simulated success for UI demo
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1000);
  }, []);

  // Success state content
  if (success) {
    return (
      <AuthLayout
        title={t('forgotPassword.title', { defaultValue: 'Reset' })}
        subtitle={t('forgotPassword.subtitle', { defaultValue: 'Password Recovery' })}
        showTermsFooter={false}
      >
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-theme-bg-secondary border-2 border-theme-border-default flex items-center justify-center">
            <Mail className="w-8 h-8 text-theme-primary" />
          </div>
          <h2 className="text-2xl text-theme-text-primary mb-4 tracking-tight font-serif-title">
            {t('forgotPassword.checkEmail', { defaultValue: 'Check Your Email' })}
          </h2>
          <p className="text-sm text-theme-text-secondary mb-8 leading-relaxed">
            {t('forgotPassword.emailSent', {
              defaultValue: 'We sent a password reset link to your email address.',
            })}
          </p>
          <Link to="/login" className="block">
            <Button variant="secondary" size="lg" rounded="default" fullWidth>
              <ArrowLeft size={16} />
              {t('forgotPassword.backToLogin', { defaultValue: 'Back to Login' })}
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Form state content
  return (
    <AuthLayout
      title={t('forgotPassword.title', { defaultValue: 'Reset' })}
      subtitle={t('forgotPassword.subtitle', { defaultValue: 'Password Recovery' })}
      error={error}
      secondaryActions={
        <>
          <Link to="/login" className="block">
            <Button variant="secondary" size="lg" rounded="default" fullWidth>
              <ArrowLeft size={16} />
              {t('forgotPassword.backToLogin', { defaultValue: 'Back to Login' })}
            </Button>
          </Link>
          <Link to="/register" className="block">
            <Button variant="ghost" size="lg" rounded="default" fullWidth>
              <Key size={16} />
              {t('auth.registerHere', { defaultValue: 'Create Account' })}
            </Button>
          </Link>
        </>
      }
      showTermsFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-sm text-theme-text-secondary mb-6 leading-relaxed">
          {t('forgotPassword.description', {
            defaultValue:
              'Enter your email address and we will send you a link to reset your password.',
          })}
        </p>

        <TextInput
          id="email"
          label={t('auth.emailAddress', { defaultValue: 'Email' })}
          type="email"
          size="xl"
          icon={<Mail size={20} />}
          value={email}
          onChange={setEmail}
          required
          placeholder="you@example.com"
          autoComplete="email"
        />

        <Button
          variant="primary"
          type="submit"
          size="xl"
          disabled={loading}
          loading={loading}
          fullWidth
        >
          {t('forgotPassword.sendLink', { defaultValue: 'Send Reset Link' })}
        </Button>
      </form>
    </AuthLayout>
  );
}
