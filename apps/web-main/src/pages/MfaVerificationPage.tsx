import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loginMfa } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../layouts';
import { TextInput, Button } from '@my-girok/ui-components';
import { Shield, Key, ArrowLeft } from 'lucide-react';
import type { MfaMethod } from '@my-girok/types';

// MFA method display info
const MFA_METHODS: Record<MfaMethod, { icon: typeof Shield; label: string; placeholder: string }> =
  {
    totp: {
      icon: Shield,
      label: 'mfa.totpMethod',
      placeholder: '000000',
    },
    backup_code: {
      icon: Key,
      label: 'mfa.backupCodeMethod',
      placeholder: 'XXXX-XXXX',
    },
  };

/**
 * MfaVerificationPage - Complete MFA challenge during login
 *
 * Displays available MFA methods and allows user to verify with:
 * - TOTP (Authenticator app)
 * - Backup code
 *
 * Expects mfaChallenge to be set in authStore from login response.
 */
export default function MfaVerificationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { mfaChallenge, setAuth, clearMfaChallenge } = useAuthStore();

  const [code, setCode] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod>('totp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get return URL from location state or sessionStorage
  const returnUrl = useMemo(() => {
    const stateUrl = (location.state as { returnUrl?: string })?.returnUrl;
    const storedUrl = sessionStorage.getItem('mfa_return_url');
    return stateUrl || storedUrl || '/';
  }, [location.state]);

  // Available methods from challenge
  const availableMethods = useMemo(() => {
    if (!mfaChallenge?.availableMethods) return ['totp'] as MfaMethod[];
    return mfaChallenge.availableMethods as MfaMethod[];
  }, [mfaChallenge]);

  // Redirect if no MFA challenge
  useEffect(() => {
    if (!mfaChallenge) {
      navigate('/login', { replace: true });
    }
  }, [mfaChallenge, navigate]);

  // Set default method to first available
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(selectedMethod)) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  const handleMethodChange = useCallback((method: MfaMethod) => {
    setSelectedMethod(method);
    setCode('');
    setError('');
  }, []);

  const handleBackToLogin = useCallback(() => {
    clearMfaChallenge();
    sessionStorage.removeItem('mfa_return_url');
    navigate('/login', { replace: true });
  }, [clearMfaChallenge, navigate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!mfaChallenge?.challengeId) {
        setError(
          t('mfa.noChallengeError', {
            defaultValue: 'No MFA challenge found. Please login again.',
          }),
        );
        return;
      }

      if (!code.trim()) {
        setError(t('mfa.codeRequired', { defaultValue: 'Please enter your verification code' }));
        return;
      }

      setError('');
      setLoading(true);

      try {
        const response = await loginMfa({
          challengeId: mfaChallenge.challengeId,
          code: code.trim(),
          method: selectedMethod,
        });

        if (!response.success) {
          setError(
            response.message ||
              t('mfa.verificationFailed', { defaultValue: 'Verification failed' }),
          );
          return;
        }

        if (response.user) {
          setAuth(response.user);
          clearMfaChallenge();
          sessionStorage.removeItem('mfa_return_url');
          navigate(returnUrl, { replace: true });
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(
          err.response?.data?.message ||
            t('mfa.verificationFailed', { defaultValue: 'Verification failed' }),
        );
      } finally {
        setLoading(false);
      }
    },
    [mfaChallenge, code, selectedMethod, setAuth, clearMfaChallenge, navigate, returnUrl, t],
  );

  if (!mfaChallenge) {
    return null; // Will redirect in useEffect
  }

  const currentMethodInfo = MFA_METHODS[selectedMethod];
  const MethodIcon = currentMethodInfo.icon;

  return (
    <AuthLayout
      title={t('mfa.title', { defaultValue: 'Verification' })}
      subtitle={t('mfa.subtitle', { defaultValue: 'Two-Factor Authentication' })}
      error={error}
      secondaryActions={
        <Button variant="ghost" size="lg" rounded="default" fullWidth onClick={handleBackToLogin}>
          <ArrowLeft size={16} />
          {t('mfa.backToLogin', { defaultValue: 'Back to Login' })}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Method selector - only show if multiple methods available */}
        {availableMethods.length > 1 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-theme-text-secondary">
              {t('mfa.selectMethod', { defaultValue: 'Verification Method' })}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableMethods.map((method) => {
                const info = MFA_METHODS[method];
                const Icon = info.icon;
                const isSelected = selectedMethod === method;

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleMethodChange(method)}
                    className={`
                      flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors
                      ${
                        isSelected
                          ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                          : 'border-theme-border-default bg-theme-bg-surface text-theme-text-secondary hover:border-theme-border-hover'
                      }
                    `}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-medium">
                      {t(info.label, {
                        defaultValue: method === 'totp' ? 'Authenticator' : 'Backup Code',
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Code input */}
        <div className="space-y-2">
          <TextInput
            id="mfa-code"
            label={t(selectedMethod === 'totp' ? 'mfa.enterTotpCode' : 'mfa.enterBackupCode', {
              defaultValue: selectedMethod === 'totp' ? 'Enter 6-digit code' : 'Enter backup code',
            })}
            type="text"
            size="xl"
            icon={<MethodIcon size={20} />}
            value={code}
            onChange={setCode}
            required
            placeholder={currentMethodInfo.placeholder}
            autoComplete="one-time-code"
            autoFocus
          />
          <p className="text-sm text-theme-text-tertiary">
            {selectedMethod === 'totp'
              ? t('mfa.totpHint', { defaultValue: 'Enter the code from your authenticator app' })
              : t('mfa.backupHint', { defaultValue: 'Enter one of your backup codes' })}
          </p>
        </div>

        <Button
          variant="primary"
          type="submit"
          size="xl"
          disabled={loading || !code.trim()}
          loading={loading}
          fullWidth
        >
          {t('mfa.verify', { defaultValue: 'Verify' })}
        </Button>
      </form>
    </AuthLayout>
  );
}
