import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, SectionBadge } from '@my-girok/ui-components';
import { revokeAllSessions } from '../../api/auth';
import Footer from '../../components/Footer';
import {
  Smartphone,
  Monitor,
  Globe,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  LogOut,
} from 'lucide-react';

/**
 * SessionsPage - Manage active sessions
 *
 * Allows users to:
 * - View current session info
 * - Revoke all other sessions
 *
 * Note: Full active sessions list requires backend endpoint implementation
 */
export default function SessionsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get current device info from user agent
  const deviceInfo = {
    browser: getBrowserName(),
    os: getOSName(),
    device: getDeviceType(),
  };

  const handleRevokeAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await revokeAllSessions();
      if (response.success) {
        setSuccess(
          t('sessions.revokeSuccess', {
            count: response.revokedCount,
            defaultValue: `Successfully revoked ${response.revokedCount || 0} other sessions`,
          }),
        );
      } else {
        setError(
          response.message ||
            t('sessions.revokeFailed', { defaultValue: 'Failed to revoke sessions' }),
        );
      }
    } catch {
      setError(t('sessions.revokeFailed', { defaultValue: 'Failed to revoke sessions' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  return (
    <>
      <main className="min-h-screen flex flex-col bg-theme-bg-page transition-colors duration-200">
        <div className="w-full lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back Link */}
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-theme-text-secondary hover:text-theme-text-primary transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            {t('sessions.backToSettings', { defaultValue: 'Back to Settings' })}
          </Link>

          {/* Header */}
          <header className="mb-12 sm:mb-16">
            <SectionBadge className="mb-4">{t('badge.archiveSupport')}</SectionBadge>
            <h1 className="text-3xl sm:text-4xl text-theme-text-primary tracking-editorial italic mb-2 font-serif-title">
              {t('sessions.title', { defaultValue: 'Active Sessions' })}
            </h1>
            <p className="text-base text-theme-text-secondary">
              {t('sessions.description', { defaultValue: 'Manage your active login sessions' })}
            </p>
          </header>

          <div className="space-y-6 sm:space-y-8">
            {/* Current Session Card */}
            <section className="bg-theme-bg-card border border-theme-border-default rounded-soft p-8 sm:p-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-theme-text-primary mb-1">
                    {t('sessions.currentSession', { defaultValue: 'Current Session' })}
                  </h2>
                  <p className="text-sm text-theme-text-secondary">
                    {t('sessions.thisDevice', {
                      defaultValue: 'This is your current active session',
                    })}
                  </p>
                </div>
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-theme-bg-surface border border-theme-border-default">
                <div className="flex items-center gap-3">
                  {deviceInfo.device === 'mobile' ? (
                    <Smartphone className="w-5 h-5 text-theme-text-tertiary" />
                  ) : (
                    <Monitor className="w-5 h-5 text-theme-text-tertiary" />
                  )}
                  <div>
                    <p className="text-xs text-theme-text-tertiary">
                      {t('sessions.device', { defaultValue: 'Device' })}
                    </p>
                    <p className="text-sm text-theme-text-primary">{deviceInfo.os}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-theme-text-tertiary" />
                  <div>
                    <p className="text-xs text-theme-text-tertiary">
                      {t('sessions.browser', { defaultValue: 'Browser' })}
                    </p>
                    <p className="text-sm text-theme-text-primary">{deviceInfo.browser}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-theme-text-tertiary">
                      {t('sessions.status', { defaultValue: 'Status' })}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {t('sessions.active', { defaultValue: 'Active' })}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Revoke All Sessions */}
            <section className="bg-theme-bg-card border border-theme-border-default rounded-soft p-8 sm:p-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-theme-text-primary mb-1">
                    {t('sessions.revokeOthers', { defaultValue: 'Sign Out Other Sessions' })}
                  </h2>
                  <p className="text-sm text-theme-text-secondary">
                    {t('sessions.revokeDescription', {
                      defaultValue:
                        'Sign out all other active sessions except this one. Use this if you suspect unauthorized access.',
                    })}
                  </p>
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle size={16} />
                    <p className="text-sm">{success}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle size={16} />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleRevokeAll}
                loading={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                <LogOut size={16} />
                {t('sessions.revokeAllButton', { defaultValue: 'Sign Out All Other Sessions' })}
              </Button>
            </section>

            {/* Security Tips */}
            <section className="bg-theme-bg-card border border-theme-border-default rounded-soft p-8 sm:p-10">
              <h2 className="text-lg font-medium text-theme-text-primary mb-4">
                {t('sessions.securityTips', { defaultValue: 'Security Tips' })}
              </h2>
              <ul className="space-y-3 text-sm text-theme-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-theme-primary mt-1">•</span>
                  {t('sessions.tip1', {
                    defaultValue: 'Sign out of sessions on devices you no longer use',
                  })}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-theme-primary mt-1">•</span>
                  {t('sessions.tip2', {
                    defaultValue:
                      'If you see unfamiliar sessions, change your password immediately',
                  })}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-theme-primary mt-1">•</span>
                  {t('sessions.tip3', {
                    defaultValue: 'Enable two-factor authentication for extra security',
                  })}
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Helper functions to parse user agent
function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function getOSName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function getDeviceType(): 'mobile' | 'desktop' {
  const ua = navigator.userAgent;
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    return 'mobile';
  }
  return 'desktop';
}
