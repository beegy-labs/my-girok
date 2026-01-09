import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button, TextInput } from '@my-girok/ui-components';
import { useAuthStore } from '../../stores/authStore';
import {
  setupMfa,
  verifyMfaSetup,
  disableMfa,
  getBackupCodesCount,
  regenerateBackupCodes,
} from '../../api/auth';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

type SetupStep = 'idle' | 'setup' | 'verify' | 'backup' | 'disable';

/**
 * SecuritySettings - MFA management component
 *
 * Allows users to:
 * - Enable MFA (shows QR code and backup codes)
 * - Disable MFA (requires password)
 * - View remaining backup codes count
 * - Regenerate backup codes
 */
export default function SecuritySettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled ?? false);
  const [backupCodesCount, setBackupCodesCount] = useState<number | null>(null);

  // Setup flow state
  const [step, setStep] = useState<SetupStep>('idle');
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch backup codes count on mount if MFA is enabled
  useEffect(() => {
    if (mfaEnabled) {
      getBackupCodesCount()
        .then((res) => setBackupCodesCount(res.remainingCount))
        .catch(() => setBackupCodesCount(null));
    }
  }, [mfaEnabled]);

  // Start MFA setup
  const handleStartSetup = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await setupMfa();
      setQrCodeUri(response.qrCodeUri);
      setSecret(response.secret);
      setBackupCodes(response.backupCodes);
      setStep('setup');
    } catch {
      setError(t('security.mfa.setupFailed', { defaultValue: 'Failed to start MFA setup' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Verify MFA setup
  const handleVerify = useCallback(async () => {
    if (!verifyCode.trim()) {
      setError(
        t('security.mfa.codeRequired', { defaultValue: 'Please enter the verification code' }),
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await verifyMfaSetup(verifyCode);
      if (response.success) {
        setStep('backup');
        setMfaEnabled(true);
      } else {
        setError(
          response.message ||
            t('security.mfa.invalidCode', { defaultValue: 'Invalid verification code' }),
        );
      }
    } catch {
      setError(t('security.mfa.verifyFailed', { defaultValue: 'Verification failed' }));
    } finally {
      setLoading(false);
    }
  }, [verifyCode, t]);

  // Disable MFA
  const handleDisable = useCallback(async () => {
    if (!password.trim()) {
      setError(t('security.mfa.passwordRequired', { defaultValue: 'Please enter your password' }));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await disableMfa(password);
      if (response.success) {
        setMfaEnabled(false);
        setBackupCodesCount(null);
        setStep('idle');
        setPassword('');
      } else {
        setError(
          response.message ||
            t('security.mfa.disableFailed', { defaultValue: 'Failed to disable MFA' }),
        );
      }
    } catch {
      setError(t('security.mfa.disableFailed', { defaultValue: 'Failed to disable MFA' }));
    } finally {
      setLoading(false);
    }
  }, [password, t]);

  // Regenerate backup codes
  const handleRegenerateBackupCodes = useCallback(async () => {
    if (!password.trim()) {
      setError(t('security.mfa.passwordRequired', { defaultValue: 'Please enter your password' }));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await regenerateBackupCodes(password);
      if (response.backupCodes) {
        setBackupCodes(response.backupCodes);
        setBackupCodesCount(response.backupCodes.length);
        setStep('backup');
        setPassword('');
      }
    } catch {
      setError(
        t('security.mfa.regenerateFailed', { defaultValue: 'Failed to regenerate backup codes' }),
      );
    } finally {
      setLoading(false);
    }
  }, [password, t]);

  // Copy code to clipboard
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Copy all codes
  const handleCopyAllCodes = useCallback(() => {
    const allCodes = backupCodes.join('\n');
    navigator.clipboard.writeText(allCodes);
    setCopiedCode('all');
    setTimeout(() => setCopiedCode(null), 2000);
  }, [backupCodes]);

  // Cancel setup
  const handleCancel = useCallback(() => {
    setStep('idle');
    setVerifyCode('');
    setPassword('');
    setError('');
    setQrCodeUri('');
    setSecret('');
    setBackupCodes([]);
  }, []);

  // Navigate to active sessions
  const handleViewSessions = useCallback(() => {
    navigate('/settings/sessions');
  }, [navigate]);

  // Render MFA status badge
  const renderStatusBadge = () => {
    if (mfaEnabled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
          <ShieldCheck size={14} />
          {t('security.mfa.enabled', { defaultValue: 'Enabled' })}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-medium">
        <ShieldOff size={14} />
        {t('security.mfa.disabled', { defaultValue: 'Disabled' })}
      </span>
    );
  };

  // Render idle state (MFA status overview)
  const renderIdleState = () => (
    <div className="space-y-6">
      {/* MFA Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-theme-bg-surface">
            <Shield className="w-6 h-6 text-theme-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-theme-text-primary">
              {t('security.mfa.title', { defaultValue: 'Two-Factor Authentication' })}
            </h3>
            <p className="text-sm text-theme-text-secondary">
              {t('security.mfa.description', {
                defaultValue: 'Add an extra layer of security to your account',
              })}
            </p>
          </div>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Backup codes count */}
      {mfaEnabled && backupCodesCount !== null && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-theme-bg-surface border border-theme-border-default">
          <Key className="w-5 h-5 text-theme-text-secondary" />
          <div className="flex-1">
            <p className="text-sm text-theme-text-primary">
              {t('security.mfa.backupCodesRemaining', {
                count: backupCodesCount,
                defaultValue: `${backupCodesCount} backup codes remaining`,
              })}
            </p>
            {backupCodesCount < 3 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {t('security.mfa.lowBackupCodes', {
                  defaultValue: 'Consider regenerating your backup codes',
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {mfaEnabled ? (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep('disable')}
              className="flex items-center gap-2"
            >
              <ShieldOff size={16} />
              {t('security.mfa.disable', { defaultValue: 'Disable MFA' })}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setStep('backup');
                setPassword('');
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              {t('security.mfa.regenerateBackupCodes', { defaultValue: 'Regenerate Backup Codes' })}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartSetup}
            loading={loading}
            className="flex items-center gap-2"
          >
            <ShieldCheck size={16} />
            {t('security.mfa.enable', { defaultValue: 'Enable MFA' })}
          </Button>
        )}
      </div>

      {/* Active Sessions Link */}
      <div className="pt-4 border-t border-theme-border-default">
        <button
          onClick={handleViewSessions}
          className="flex items-center gap-3 w-full p-4 rounded-lg bg-theme-bg-surface hover:bg-theme-bg-hover transition-colors text-left"
        >
          <Smartphone className="w-5 h-5 text-theme-text-secondary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-theme-text-primary">
              {t('security.sessions.title', { defaultValue: 'Active Sessions' })}
            </p>
            <p className="text-xs text-theme-text-secondary">
              {t('security.sessions.description', {
                defaultValue: 'View and manage your active sessions',
              })}
            </p>
          </div>
          <span className="text-theme-text-tertiary">→</span>
        </button>
      </div>
    </div>
  );

  // Render setup step (QR code)
  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-theme-text-primary mb-2">
          {t('security.mfa.scanQrCode', { defaultValue: 'Scan QR Code' })}
        </h3>
        <p className="text-sm text-theme-text-secondary">
          {t('security.mfa.scanQrCodeDescription', {
            defaultValue:
              'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
          })}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-lg">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUri)}`}
            alt="MFA QR Code"
            className="w-48 h-48"
          />
        </div>
      </div>

      {/* Manual entry secret */}
      <div className="p-4 rounded-lg bg-theme-bg-surface border border-theme-border-default">
        <p className="text-xs text-theme-text-secondary mb-2">
          {t('security.mfa.manualEntry', { defaultValue: "Can't scan? Enter this code manually:" })}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-theme-text-primary bg-theme-bg-input px-3 py-2 rounded">
            {secret}
          </code>
          <Button variant="ghost" size="sm" onClick={() => handleCopyCode(secret)}>
            {copiedCode === secret ? <CheckCircle size={16} /> : <Copy size={16} />}
          </Button>
        </div>
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={() => setStep('verify')}>
        {t('security.mfa.next', { defaultValue: 'Next' })}
      </Button>

      <Button variant="ghost" size="lg" fullWidth onClick={handleCancel}>
        {t('common.cancel', { defaultValue: 'Cancel' })}
      </Button>
    </div>
  );

  // Render verify step
  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-theme-text-primary mb-2">
          {t('security.mfa.verifySetup', { defaultValue: 'Verify Setup' })}
        </h3>
        <p className="text-sm text-theme-text-secondary">
          {t('security.mfa.verifyDescription', {
            defaultValue: 'Enter the 6-digit code from your authenticator app to complete setup',
          })}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <TextInput
        id="verify-code"
        label={t('security.mfa.verificationCode', { defaultValue: 'Verification Code' })}
        type="text"
        size="xl"
        icon={<Shield size={20} />}
        value={verifyCode}
        onChange={setVerifyCode}
        placeholder="000000"
        autoComplete="one-time-code"
        autoFocus
      />

      <Button variant="primary" size="lg" fullWidth onClick={handleVerify} loading={loading}>
        {t('security.mfa.verify', { defaultValue: 'Verify' })}
      </Button>

      <Button variant="ghost" size="lg" fullWidth onClick={() => setStep('setup')}>
        {t('common.back', { defaultValue: 'Back' })}
      </Button>
    </div>
  );

  // Render backup codes step
  const renderBackupCodesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-theme-text-primary mb-2">
          {backupCodes.length > 0 && step === 'backup' && !mfaEnabled
            ? t('security.mfa.setupComplete', { defaultValue: 'MFA Enabled!' })
            : t('security.mfa.backupCodes', { defaultValue: 'Backup Codes' })}
        </h3>
        <p className="text-sm text-theme-text-secondary">
          {t('security.mfa.backupCodesDescription', {
            defaultValue:
              'Save these backup codes in a secure place. You can use them to access your account if you lose your phone.',
          })}
        </p>
      </div>

      {/* Regenerate form if no codes yet */}
      {backupCodes.length === 0 && mfaEnabled && (
        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle size={16} />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <TextInput
            id="regenerate-password"
            label={t('security.mfa.enterPassword', {
              defaultValue: 'Enter your password to regenerate',
            })}
            type="password"
            size="xl"
            icon={<Lock size={20} />}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleRegenerateBackupCodes}
            loading={loading}
          >
            {t('security.mfa.regenerate', { defaultValue: 'Regenerate Codes' })}
          </Button>

          <Button variant="ghost" size="lg" fullWidth onClick={handleCancel}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
        </div>
      )}

      {/* Display backup codes */}
      {backupCodes.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-theme-bg-surface border border-theme-border-default">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-theme-bg-input"
              >
                <code className="font-mono text-sm text-theme-text-primary">{code}</code>
                <button
                  onClick={() => handleCopyCode(code)}
                  className="p-1 hover:bg-theme-bg-hover rounded transition-colors"
                >
                  {copiedCode === code ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} className="text-theme-text-tertiary" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <Button variant="secondary" size="lg" fullWidth onClick={handleCopyAllCodes}>
            {copiedCode === 'all' ? (
              <>
                <CheckCircle size={16} />
                {t('security.mfa.copied', { defaultValue: 'Copied!' })}
              </>
            ) : (
              <>
                <Copy size={16} />
                {t('security.mfa.copyAll', { defaultValue: 'Copy All Codes' })}
              </>
            )}
          </Button>

          <Button variant="primary" size="lg" fullWidth onClick={handleCancel}>
            {t('security.mfa.done', { defaultValue: 'Done' })}
          </Button>
        </>
      )}
    </div>
  );

  // Render disable step
  const renderDisableStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <ShieldOff className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-theme-text-primary mb-2">
          {t('security.mfa.disableTitle', { defaultValue: 'Disable Two-Factor Authentication' })}
        </h3>
        <p className="text-sm text-theme-text-secondary">
          {t('security.mfa.disableWarning', {
            defaultValue:
              'This will make your account less secure. Are you sure you want to continue?',
          })}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <TextInput
        id="disable-password"
        label={t('security.mfa.confirmPassword', { defaultValue: 'Confirm your password' })}
        type="password"
        size="xl"
        icon={<Lock size={20} />}
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleDisable}
        loading={loading}
        className="bg-red-600 hover:bg-red-700"
      >
        {t('security.mfa.confirmDisable', { defaultValue: 'Disable MFA' })}
      </Button>

      <Button variant="ghost" size="lg" fullWidth onClick={handleCancel}>
        {t('common.cancel', { defaultValue: 'Cancel' })}
      </Button>
    </div>
  );

  // Main render
  return (
    <div>
      <h2 className="text-xl font-medium text-theme-text-primary mb-2">
        {t('security.title', { defaultValue: 'Security' })}
      </h2>
      <p className="text-sm text-theme-text-secondary mb-6">
        {t('security.description', { defaultValue: 'Manage your account security settings' })}
      </p>

      {loading && step === 'idle' ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
        </div>
      ) : (
        <>
          {step === 'idle' && renderIdleState()}
          {step === 'setup' && renderSetupStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'backup' && renderBackupCodesStep()}
          {step === 'disable' && renderDisableStep()}
        </>
      )}
    </div>
  );
}
