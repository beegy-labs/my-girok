/**
 * SessionAnalyticsPage
 *
 * Analytics dashboard for session recordings
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Clock, MousePointer2, Eye, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../../../components/atoms/Card';
import apiClient from '../../../api/client';

// Device colors for pie chart
const DEVICE_COLORS: Record<string, string> = {
  desktop: 'var(--color-primary)',
  mobile: 'var(--color-status-success)',
  tablet: 'var(--color-status-warning)',
};

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
  [key: string]: string | number;
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
            {deviceStats.length === 0 ? (
              <p className="text-center text-theme-text-tertiary py-4">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceStats}
                    dataKey="count"
                    nameKey="deviceType"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {deviceStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DEVICE_COLORS[entry.deviceType] || 'var(--color-gray-400)'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top Pages */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Top Pages</h3>
            {pageStats.length === 0 ? (
              <p className="text-center text-theme-text-tertiary py-4">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={pageStats.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis type="number" stroke="var(--color-text-secondary)" />
                  <YAxis
                    type="category"
                    dataKey="page"
                    width={200}
                    stroke="var(--color-text-secondary)"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-background-card)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="visits" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
