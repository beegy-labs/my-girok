import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Shield, Key, ArrowLeft } from 'lucide-react';
import { authApi, resetRedirectFlag } from '../api';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import type { MfaMethod } from '@my-girok/types';

export default function MfaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { mfaChallenge, setAuth, clearMfaChallenge, isAuthenticated } = useAdminAuthStore();

  const [code, setCode] = useState('');
  const [method, setMethod] = useState<MfaMethod>('totp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no MFA challenge or already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { from?: Location } })?.from?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else if (!mfaChallenge) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, mfaChallenge, navigate, location.state]);

  const handleBack = () => {
    clearMfaChallenge();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;

    setError(null);
    setLoading(true);

    try {
      const response = await authApi.loginMfa({
        challengeId: mfaChallenge.challengeId,
        code,
        method,
      });

      if (!response.success) {
        setError(response.message || t('auth.mfa.invalidCode'));
        return;
      }

      if (response.admin) {
        resetRedirectFlag(); // Reset the redirect flag after successful login
        setAuth(response.admin);
        const from =
          (location.state as { from?: { from?: Location } })?.from?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.mfa.invalidCode'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mfaChallenge) {
    return null;
  }

  const availableMethods = mfaChallenge.availableMethods as MfaMethod[];
  const hasBackupCode = availableMethods.includes('backup_code');

  return (
    <div className="min-h-screen bg-theme-bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-primary/10 rounded-full mb-4">
            <Shield size={32} className="text-theme-primary" />
          </div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('auth.mfa.title')}</h1>
          <p className="mt-2 text-theme-text-secondary">{t('auth.mfa.subtitle')}</p>
        </div>

        {/* MFA Form */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Method selector (if backup codes available) */}
            {hasBackupCode && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('totp')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    method === 'totp'
                      ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                      : 'border-theme-border-default text-theme-text-secondary hover:border-theme-border-hover'
                  }`}
                >
                  <Shield size={18} />
                  <span className="text-sm font-medium">{t('auth.mfa.methodTotp')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('backup_code')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    method === 'backup_code'
                      ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                      : 'border-theme-border-default text-theme-text-secondary hover:border-theme-border-hover'
                  }`}
                >
                  <Key size={18} />
                  <span className="text-sm font-medium">{t('auth.mfa.methodBackup')}</span>
                </button>
              </div>
            )}

            {/* Code input */}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-theme-text-primary mb-2"
              >
                {method === 'totp' ? t('auth.mfa.codeLabel') : t('auth.mfa.backupCodeLabel')}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoComplete="one-time-code"
                inputMode={method === 'totp' ? 'numeric' : 'text'}
                pattern={method === 'totp' ? '[0-9]*' : undefined}
                maxLength={method === 'totp' ? 6 : 24}
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-theme-primary text-center text-2xl tracking-widest font-mono"
                placeholder={method === 'totp' ? '000000' : 'XXXX-XXXX-XXXX'}
              />
              <p className="mt-2 text-xs text-theme-text-tertiary">
                {method === 'totp' ? t('auth.mfa.codeHint') : t('auth.mfa.backupCodeHint')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < (method === 'totp' ? 6 : 8)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-btn-primary-from to-btn-primary-to text-btn-primary-text font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              <span>{loading ? t('auth.mfa.verifying') : t('auth.mfa.verify')}</span>
            </button>
          </form>

          {/* Back to login */}
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 w-full flex items-center justify-center gap-2 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">{t('auth.mfa.backToLogin')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
