import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  Monitor,
  Trash2,
  RefreshCw,
  Key,
  LogOut,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { logger } from '../utils/logger';
import type { AdminSession } from '@my-girok/types';

type MfaStep = 'idle' | 'setup' | 'verify' | 'backup' | 'disable' | 'regenerate';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { admin, setAuth } = useAdminAuthStore();

  // MFA State
  const [mfaStep, setMfaStep] = useState<MfaStep>('idle');
  const [mfaSetupData, setMfaSetupData] = useState<{
    qrCodeUri: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [regeneratePassword, setRegeneratePassword] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await authApi.getSessions();
      setSessions(data);
    } catch (err) {
      setSessionsError(t('settings.security.loadSessionsFailed'));
      logger.error('Failed to fetch sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  // MFA Handlers
  const handleSetupMfa = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const data = await authApi.setupMfa();
      setMfaSetupData(data);
      setMfaStep('setup');
    } catch (err) {
      setMfaError(t('settings.security.setupFailed'));
      logger.error('Failed to setup MFA', err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!verifyCode.trim()) {
      setMfaError(t('settings.security.codeRequired'));
      return;
    }

    setMfaLoading(true);
    setMfaError(null);
    try {
      const result = await authApi.verifyMfaSetup(verifyCode);
      if (result.success) {
        setMfaStep('backup');
        // Refresh admin info
        const updatedAdmin = await authApi.getMe();
        setAuth(updatedAdmin);
      } else {
        setMfaError(result.message || t('settings.security.invalidCode'));
      }
    } catch (err) {
      setMfaError(t('settings.security.verifyFailed'));
      logger.error('Failed to verify MFA', err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!disablePassword.trim()) {
      setMfaError(t('settings.security.passwordRequired'));
      return;
    }

    setMfaLoading(true);
    setMfaError(null);
    try {
      const result = await authApi.disableMfa(disablePassword);
      if (result.success) {
        setMfaStep('idle');
        setDisablePassword('');
        // Refresh admin info
        const updatedAdmin = await authApi.getMe();
        setAuth(updatedAdmin);
      } else {
        setMfaError(result.message || t('settings.security.wrongPassword'));
      }
    } catch (err) {
      setMfaError(t('settings.security.disableFailed'));
      logger.error('Failed to disable MFA', err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword.trim()) {
      setMfaError(t('settings.security.passwordRequired'));
      return;
    }

    setMfaLoading(true);
    setMfaError(null);
    try {
      const result = await authApi.regenerateBackupCodes(regeneratePassword);
      setNewBackupCodes(result.backupCodes);
      setMfaStep('backup');
      setRegeneratePassword('');
    } catch (err) {
      setMfaError(t('settings.security.regenerateFailed'));
      logger.error('Failed to regenerate backup codes', err);
    } finally {
      setMfaLoading(false);
    }
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy to clipboard', err);
    }
  }, []);

  const copyBackupCodes = () => {
    const codes = (mfaSetupData?.backupCodes || newBackupCodes).join('\n');
    copyToClipboard(codes);
  };

  // Session Handlers
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      logger.error('Failed to revoke session', err);
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      // Keep only current session
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err) {
      logger.error('Failed to revoke all sessions', err);
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const backupCodesToShow = mfaSetupData?.backupCodes || newBackupCodes;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text-primary">{t('settings.title')}</h1>
        <p className="text-theme-text-secondary mt-1">{t('settings.security.description')}</p>
      </div>

      {/* Security Section */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-theme-primary/10 flex items-center justify-center">
            <Shield className="text-theme-primary" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-theme-text-primary">
              {t('settings.security.title')}
            </h2>
            <p className="text-sm text-theme-text-secondary">
              {t('settings.security.mfaDescription')}
            </p>
          </div>
        </div>

        {/* MFA Status */}
        <div className="p-4 bg-theme-bg-secondary rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="text-theme-text-secondary" size={20} />
              <div>
                <p className="font-medium text-theme-text-primary">
                  {t('settings.security.twoFactorAuth')}
                </p>
                <p className="text-sm text-theme-text-secondary">
                  {admin?.mfaEnabled
                    ? t('settings.security.mfaEnabled')
                    : t('settings.security.mfaDisabled')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {admin?.mfaEnabled ? (
                <>
                  <span className="px-2 py-1 text-xs font-medium bg-theme-status-success-bg text-theme-status-success-text rounded">
                    {t('common.active')}
                  </span>
                  <button
                    onClick={() => setMfaStep('disable')}
                    disabled={mfaStep !== 'idle'}
                    className="px-3 py-1.5 text-sm border border-theme-status-error-text text-theme-status-error-text rounded-lg hover:bg-theme-status-error-bg transition-colors disabled:opacity-50"
                  >
                    {t('settings.security.disable')}
                  </button>
                  <button
                    onClick={() => setMfaStep('regenerate')}
                    disabled={mfaStep !== 'idle'}
                    className="px-3 py-1.5 text-sm border border-theme-border-default text-theme-text-secondary rounded-lg hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
                  >
                    <Key size={14} className="inline mr-1" />
                    {t('settings.security.regenerateCodes')}
                  </button>
                </>
              ) : (
                <>
                  <span className="px-2 py-1 text-xs font-medium bg-theme-bg-tertiary text-theme-text-tertiary rounded">
                    {t('common.inactive')}
                  </span>
                  <button
                    onClick={handleSetupMfa}
                    disabled={mfaLoading || mfaStep !== 'idle'}
                    className="px-3 py-1.5 text-sm bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50"
                  >
                    {mfaLoading ? t('common.loading') : t('settings.security.enable')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MFA Error */}
        {mfaError && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
            <AlertTriangle size={16} />
            <span className="text-sm">{mfaError}</span>
          </div>
        )}

        {/* MFA Setup Step */}
        {mfaStep === 'setup' && mfaSetupData && (
          <div className="mt-6 p-4 border border-theme-border-default rounded-lg">
            <h3 className="font-medium text-theme-text-primary mb-4">
              {t('settings.security.scanQrCode')}
            </h3>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* QR Code */}
              <div className="flex-shrink-0 p-4 bg-white rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mfaSetupData.qrCodeUri)}`}
                  alt="MFA QR Code"
                  className="w-40 h-40"
                />
              </div>

              {/* Manual Entry */}
              <div className="flex-1">
                <p className="text-sm text-theme-text-secondary mb-3">
                  {t('settings.security.manualEntry')}
                </p>
                <div className="flex items-center gap-2 p-3 bg-theme-bg-secondary rounded-lg font-mono text-sm">
                  <span className="flex-1 break-all">{mfaSetupData.secret}</span>
                  <button
                    onClick={() => copyToClipboard(mfaSetupData.secret)}
                    className="p-1.5 text-theme-text-secondary hover:text-theme-primary transition-colors"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setMfaStep('idle');
                  setMfaSetupData(null);
                  setMfaError(null);
                }}
                className="px-4 py-2 border border-theme-border-default text-theme-text-secondary rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setMfaStep('verify')}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}

        {/* MFA Verify Step */}
        {mfaStep === 'verify' && (
          <div className="mt-6 p-4 border border-theme-border-default rounded-lg">
            <h3 className="font-medium text-theme-text-primary mb-4">
              {t('settings.security.verifySetup')}
            </h3>
            <p className="text-sm text-theme-text-secondary mb-4">
              {t('settings.security.enterCodeFromApp')}
            </p>

            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full max-w-xs px-4 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary text-center text-2xl tracking-widest"
              maxLength={6}
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setMfaStep('setup');
                  setVerifyCode('');
                  setMfaError(null);
                }}
                className="px-4 py-2 border border-theme-border-default text-theme-text-secondary rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={handleVerifyMfa}
                disabled={mfaLoading || verifyCode.length !== 6}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50"
              >
                {mfaLoading ? t('common.loading') : t('settings.security.verify')}
              </button>
            </div>
          </div>
        )}

        {/* Backup Codes Step */}
        {mfaStep === 'backup' && backupCodesToShow.length > 0 && (
          <div className="mt-6 p-4 border border-theme-border-default rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Key className="text-theme-primary" size={20} />
              <h3 className="font-medium text-theme-text-primary">
                {t('settings.security.backupCodes')}
              </h3>
            </div>

            <div className="p-3 bg-theme-status-warning-bg text-theme-status-warning-text rounded-lg mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">{t('settings.security.backupCodesWarning')}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {backupCodesToShow.map((code, i) => (
                <div
                  key={i}
                  className="p-2 bg-theme-bg-secondary rounded font-mono text-sm text-center"
                >
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={copyBackupCodes}
              className="flex items-center gap-2 px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{t('settings.security.copyAll')}</span>
            </button>

            <div className="mt-6">
              <button
                onClick={() => {
                  setMfaStep('idle');
                  setMfaSetupData(null);
                  setNewBackupCodes([]);
                  setVerifyCode('');
                  setMfaError(null);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors"
              >
                {t('settings.security.done')}
              </button>
            </div>
          </div>
        )}

        {/* Disable MFA Step */}
        {mfaStep === 'disable' && (
          <div className="mt-6 p-4 border border-theme-status-error-text/30 bg-theme-status-error-bg/30 rounded-lg">
            <h3 className="font-medium text-theme-status-error-text mb-2">
              {t('settings.security.disableMfa')}
            </h3>
            <p className="text-sm text-theme-text-secondary mb-4">
              {t('settings.security.disableWarning')}
            </p>

            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder={t('settings.security.enterPassword')}
              className="w-full max-w-sm px-4 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setMfaStep('idle');
                  setDisablePassword('');
                  setMfaError(null);
                }}
                className="px-4 py-2 border border-theme-border-default text-theme-text-secondary rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={mfaLoading || !disablePassword}
                className="px-4 py-2 bg-theme-status-error-text text-white rounded-lg hover:bg-theme-status-error-text/90 transition-colors disabled:opacity-50"
              >
                {mfaLoading ? t('common.loading') : t('settings.security.confirmDisable')}
              </button>
            </div>
          </div>
        )}

        {/* Regenerate Backup Codes Step */}
        {mfaStep === 'regenerate' && (
          <div className="mt-6 p-4 border border-theme-border-default rounded-lg">
            <h3 className="font-medium text-theme-text-primary mb-2">
              {t('settings.security.regenerateBackupCodes')}
            </h3>
            <p className="text-sm text-theme-text-secondary mb-4">
              {t('settings.security.regenerateWarning')}
            </p>

            <input
              type="password"
              value={regeneratePassword}
              onChange={(e) => setRegeneratePassword(e.target.value)}
              placeholder={t('settings.security.enterPassword')}
              className="w-full max-w-sm px-4 py-2 border border-theme-border-default rounded-lg bg-theme-bg-input text-theme-text-primary"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setMfaStep('idle');
                  setRegeneratePassword('');
                  setMfaError(null);
                }}
                className="px-4 py-2 border border-theme-border-default text-theme-text-secondary rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRegenerateBackupCodes}
                disabled={mfaLoading || !regeneratePassword}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50"
              >
                {mfaLoading ? t('common.loading') : t('settings.security.regenerate')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions Section */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Monitor className="text-blue-500" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-text-primary">
                {t('settings.security.activeSessions')}
              </h2>
              <p className="text-sm text-theme-text-secondary">
                {t('settings.security.sessionsDescription')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              disabled={sessionsLoading}
              className="p-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={sessionsLoading ? 'animate-spin' : ''} />
            </button>
            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={revokingAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-theme-status-error-text text-theme-status-error-text rounded-lg hover:bg-theme-status-error-bg transition-colors disabled:opacity-50"
              >
                <LogOut size={14} />
                {revokingAll ? t('common.loading') : t('settings.security.revokeAll')}
              </button>
            )}
          </div>
        </div>

        {sessionsError && (
          <div className="flex items-center gap-2 p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg mb-4">
            <AlertTriangle size={16} />
            <span className="text-sm">{sessionsError}</span>
          </div>
        )}

        {sessionsLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin text-theme-primary" size={24} />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-theme-text-secondary py-8">
            {t('settings.security.noSessions')}
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border ${
                  session.isCurrent
                    ? 'border-theme-primary bg-theme-primary/5'
                    : 'border-theme-border-default bg-theme-bg-secondary'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Monitor className="text-theme-text-secondary mt-0.5" size={20} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-theme-text-primary">
                          {session.userAgent || t('settings.security.unknownDevice')}
                        </p>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-theme-primary text-white rounded">
                            {t('settings.security.currentSession')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-theme-text-secondary mt-1">
                        {session.ipAddress || t('settings.security.unknownIp')}
                      </p>
                      <p className="text-xs text-theme-text-tertiary mt-1">
                        {t('settings.security.lastActive')}: {formatDate(session.lastActivityAt)}
                      </p>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSession === session.id}
                      className="p-2 text-theme-status-error-text hover:bg-theme-status-error-bg rounded-lg transition-colors disabled:opacity-50"
                    >
                      {revokingSession === session.id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
