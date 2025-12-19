import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TextInput, Button, Alert } from '@my-girok/ui-components';
import { Mail, Key, ArrowLeft } from 'lucide-react';

/**
 * ForgotPasswordPage - V0.0.1 AAA Workstation Design
 * UI-only implementation (API connection pending)
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: Connect to API
    // Simulated success for UI demo
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-theme-bg-page flex flex-col transition-colors duration-200 pt-nav">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-20 mt-8">
        <div className="w-full max-w-md">
          {/* Header - V0.0.1 Editorial Style */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl text-theme-text-primary mb-3 tracking-editorial italic font-serif-title">
              {t('forgotPassword.title', { defaultValue: 'Reset' })}
            </h1>
            <p className="text-[11px] font-black uppercase tracking-brand text-theme-text-secondary font-mono-brand">
              {t('forgotPassword.subtitle', { defaultValue: 'Password Recovery' })}
            </p>
          </div>

          {/* Form Card - V0.0.1 Editorial Style */}
          <div className="bg-theme-bg-card border-2 border-theme-border-default rounded-editorial-lg p-10 md:p-14 shadow-theme-lg">
            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            {success ? (
              /* Success State */
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
                    <ArrowLeft className="w-5 h-5" />
                    {t('forgotPassword.backToLogin', { defaultValue: 'Back to Login' })}
                  </Button>
                </Link>
              </div>
            ) : (
              /* Form State */
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
                  size="lg"
                  icon={<Mail size={18} />}
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
                  rounded="editorial"
                  disabled={loading}
                  loading={loading}
                  fullWidth
                >
                  {t('forgotPassword.sendLink', { defaultValue: 'Send Reset Link' })}
                </Button>
              </form>
            )}

            {/* Back to Login Link */}
            {!success && (
              <div className="mt-8 flex flex-col gap-3">
                <Link to="/login" className="block">
                  <Button variant="secondary" size="lg" rounded="default" fullWidth>
                    <ArrowLeft className="w-4 h-4" />
                    {t('forgotPassword.backToLogin', { defaultValue: 'Back to Login' })}
                  </Button>
                </Link>
                <Link to="/register" className="block">
                  <Button variant="ghost" size="lg" rounded="default" fullWidth>
                    <Key className="w-4 h-4" />
                    {t('auth.registerHere', { defaultValue: 'Create Account' })}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
