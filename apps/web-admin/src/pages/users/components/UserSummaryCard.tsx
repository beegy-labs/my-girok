import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Clock, Eye, MousePointer2, Globe, Monitor } from 'lucide-react';
import { Card } from '../../../components/atoms/Card';
import type { UserSummary } from '../../../api/analytics';

interface UserSummaryCardProps {
  summary: UserSummary;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export const UserSummaryCard = memo<UserSummaryCardProps>(({ summary }) => {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('analytics.totalSessions', 'Total Sessions'),
      value: summary.totalSessions,
      icon: <User className="w-5 h-5" />,
    },
    {
      label: t('analytics.totalDuration', 'Total Duration'),
      value: formatDuration(summary.totalDuration),
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: t('analytics.totalPageViews', 'Total Page Views'),
      value: summary.totalPageViews.toLocaleString(),
      icon: <Eye className="w-5 h-5" />,
    },
    {
      label: t('analytics.totalClicks', 'Total Clicks'),
      value: summary.totalClicks.toLocaleString(),
      icon: <MousePointer2 className="w-5 h-5" />,
    },
  ];

  return (
    <Card>
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 bg-theme-bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-theme-text-tertiary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-theme-text-primary mb-1">{summary.email}</h2>
          <div className="text-sm text-theme-text-tertiary">
            {t('analytics.activeFrom', 'Active from {{date}}', {
              date: formatDate(summary.firstSessionAt),
            })}
          </div>
          <div className="text-sm text-theme-text-tertiary">
            {t('analytics.lastActive', 'Last active: {{date}}', {
              date: formatDate(summary.lastSessionAt),
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="flex justify-center mb-2 text-theme-text-tertiary">{stat.icon}</div>
            <div className="text-2xl font-bold text-theme-text-primary mb-1">{stat.value}</div>
            <div className="text-xs text-theme-text-tertiary">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 pt-4 border-t border-theme-border-default">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-theme-text-tertiary" />
          <span className="text-sm text-theme-text-secondary">
            {t('analytics.countries', 'Countries')}:{' '}
            <span className="font-medium text-theme-text-primary">{summary.countries.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-theme-text-tertiary" />
          <span className="text-sm text-theme-text-secondary">
            {t('analytics.devices', 'Devices')}:{' '}
            <span className="font-medium text-theme-text-primary">{summary.devices.length}</span>
          </span>
        </div>
      </div>
    </Card>
  );
});

UserSummaryCard.displayName = 'UserSummaryCard';
