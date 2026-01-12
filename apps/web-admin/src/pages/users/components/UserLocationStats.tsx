import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { Card } from '../../../components/atoms/Card';
import { LocationBadge } from '../../system/session-recordings/components/LocationBadge';
import type { UserLocationStats as LocationStats } from '../../../api/analytics';

interface UserLocationStatsProps {
  locations: LocationStats[];
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export const UserLocationStats = memo<UserLocationStatsProps>(({ locations, loading = false }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
          {t('analytics.locationStats', 'Location Statistics')}
        </h3>
        <div className="text-center py-8 text-theme-text-tertiary">
          {t('analytics.noLocationData', 'No location data available')}
        </div>
      </Card>
    );
  }

  const maxCount = Math.max(...locations.map((loc) => loc.sessionCount));

  return (
    <Card>
      <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
        {t('analytics.locationStats', 'Location Statistics')}
      </h3>
      <div className="space-y-3">
        {locations.map((location) => (
          <div key={location.countryCode} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <LocationBadge countryCode={location.countryCode} showText={false} />
                <span className="text-sm font-medium text-theme-text-primary truncate">
                  {location.countryName || location.countryCode}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-theme-text-secondary">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(location.totalDuration)}
                </span>
                <span className="font-medium text-theme-text-primary">
                  {location.sessionCount}{' '}
                  <span className="text-xs text-theme-text-tertiary">
                    ({location.percentage.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
            <div className="w-full bg-theme-bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(location.sessionCount / maxCount) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

UserLocationStats.displayName = 'UserLocationStats';
