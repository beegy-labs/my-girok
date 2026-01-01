import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import { FileText, Users, Building2, TrendingUp, AlertCircle } from 'lucide-react';
import { legalApi, ConsentStats } from '../api/legal';
import { useAdminAuthStore } from '../stores/adminAuthStore';

interface StatCard {
  titleKey: string;
  value: string | number;
  icon: typeof FileText;
  color: string;
  change?: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { admin, hasPermission } = useAdminAuthStore();
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!hasPermission('legal:read')) {
        setLoading(false);
        return;
      }

      try {
        const data = await legalApi.getConsentStats();
        setStats(data);
      } catch (err) {
        setError(t('dashboard.failedToLoad'));
        logger.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [hasPermission, t]);

  const statCards: StatCard[] = stats
    ? [
        {
          titleKey: 'dashboard.totalConsents',
          value: stats.summary.totalConsents.toLocaleString(),
          icon: FileText,
          color: 'text-blue-600',
        },
        {
          titleKey: 'dashboard.totalUsers',
          value: stats.summary.totalUsers.toLocaleString(),
          icon: Users,
          color: 'text-green-600',
        },
        {
          titleKey: 'dashboard.agreementRate',
          value: `${(stats.summary.overallAgreementRate * 100).toFixed(1)}%`,
          icon: TrendingUp,
          color: 'text-purple-600',
        },
        {
          titleKey: 'dashboard.activeRegions',
          value: stats.byRegion.length,
          icon: Building2,
          color: 'text-orange-600',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text-primary">{t('dashboard.title')}</h1>
        <p className="text-theme-text-secondary mt-1">
          {t('dashboard.welcome', { name: admin?.name })}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6 animate-pulse"
            >
              <div className="h-10 w-10 bg-theme-bg-secondary rounded-lg mb-4" />
              <div className="h-4 bg-theme-bg-secondary rounded w-1/2 mb-2" />
              <div className="h-8 bg-theme-bg-secondary rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div
              key={card.titleKey}
              className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${card.color} bg-current/10`}
              >
                <card.icon size={20} className={card.color} />
              </div>
              <p className="text-sm text-theme-text-secondary">{t(card.titleKey)}</p>
              <p className="text-2xl font-bold text-theme-text-primary mt-1">{card.value}</p>
              {card.change && <p className="text-sm text-green-600 mt-2">{card.change}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Consent by type */}
      {stats && stats.byType.length > 0 && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('dashboard.consentsByType')}
          </h2>
          <div className="space-y-4">
            {stats.byType.map((item) => (
              <div key={item.type} className="flex items-center gap-4">
                <div className="w-32 text-sm text-theme-text-secondary">
                  {item.type.replace(/_/g, ' ')}
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-theme-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-theme-primary rounded-full"
                      style={{ width: `${item.rate * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right text-sm">
                  <span className="text-theme-text-primary font-medium">{item.agreed}</span>
                  <span className="text-theme-text-tertiary"> / {item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {stats && stats.recentActivity.length > 0 && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('dashboard.recentActivity')}
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {stats.recentActivity.slice(0, 14).map((day) => (
              <div key={day.date} className="text-center">
                <div className="text-xs text-theme-text-tertiary mb-1">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <div
                  className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                    day.agreed > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-theme-bg-secondary text-theme-text-tertiary'
                  }`}
                >
                  {day.agreed}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!hasPermission('legal:read') && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6 text-center">
          <p className="text-theme-text-secondary">
            {t('dashboard.noPermission')}
            <br />
            {t('dashboard.contactAdmin')}
          </p>
        </div>
      )}
    </div>
  );
}
