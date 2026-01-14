/**
 * SessionAnalyticsPage
 *
 * Analytics dashboard for session recordings
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Clock, MousePointer2, Eye, Loader2 } from 'lucide-react';
import { Card } from '../../../components/atoms/Card';
import apiClient from '../../../api/client';

interface SessionStats {
  totalSessions: number;
  avgDuration: number;
  totalPageViews: number;
  totalClicks: number;
  uniqueUsers: number;
}

interface DeviceStats {
  deviceType: string;
  count: number;
  avgDuration: number;
}

interface PageStats {
  page: string;
  visits: number;
  avgDuration: number;
}

export default function SessionAnalyticsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [pageStats, setPageStats] = useState<PageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [statsRes, devicesRes, pagesRes] = await Promise.all([
        apiClient.get('/recordings/analytics/stats', { params: dateRange }),
        apiClient.get('/recordings/analytics/devices', { params: dateRange }),
        apiClient.get('/recordings/analytics/pages', { params: dateRange }),
      ]);

      setStats(statsRes.data);
      setDeviceStats(devicesRes.data);
      setPageStats(pagesRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {t('sessionRecordings.analytics', 'Session Analytics')}
          </h1>
          <p className="text-theme-text-secondary mt-1">
            {t('sessionRecordings.analyticsDescription', 'Overview of user sessions and behavior')}
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary"
          />
          <span className="text-theme-text-tertiary">-</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-theme-text-secondary">Total Sessions</p>
              <p className="text-2xl font-bold text-theme-text-primary">
                {stats?.totalSessions.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-theme-text-secondary">Unique Users</p>
              <p className="text-2xl font-bold text-theme-text-primary">
                {stats?.uniqueUsers.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-theme-text-secondary">Avg Duration</p>
              <p className="text-2xl font-bold text-theme-text-primary">
                {Math.floor((stats?.avgDuration || 0) / 60)}m
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-theme-text-secondary">Page Views</p>
              <p className="text-2xl font-bold text-theme-text-primary">
                {stats?.totalPageViews.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <MousePointer2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-theme-text-secondary">Total Clicks</p>
              <p className="text-2xl font-bold text-theme-text-primary">
                {stats?.totalClicks.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Device Breakdown</h3>
            <div className="space-y-3">
              {deviceStats.map((device) => (
                <div key={device.deviceType} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="capitalize text-theme-text-primary font-medium">
                      {device.deviceType}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-theme-text-primary font-semibold">
                      {device.count.toLocaleString()}
                    </div>
                    <div className="text-xs text-theme-text-tertiary">
                      Avg: {Math.floor(device.avgDuration / 60)}m
                    </div>
                  </div>
                </div>
              ))}
              {deviceStats.length === 0 && (
                <p className="text-center text-theme-text-tertiary py-4">No data available</p>
              )}
            </div>
          </div>
        </Card>

        {/* Top Pages */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Top Pages</h3>
            <div className="space-y-3">
              {pageStats.map((page, index) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="text-theme-text-primary font-mono text-sm truncate">
                      {page.page}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-theme-text-primary font-semibold">
                      {page.visits.toLocaleString()}
                    </div>
                    <div className="text-xs text-theme-text-tertiary">
                      Avg: {Math.floor(page.avgDuration / 60)}m
                    </div>
                  </div>
                </div>
              ))}
              {pageStats.length === 0 && (
                <p className="text-center text-theme-text-tertiary py-4">No data available</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
