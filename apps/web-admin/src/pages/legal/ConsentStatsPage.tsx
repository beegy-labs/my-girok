import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { legalApi } from '../../api/legal';

type DateRange = '7d' | '30d' | '90d';

interface ConsentStats {
  byType: Array<{
    type: string;
    total: number;
    agreed: number;
    rate: number;
  }>;
  byRegion: Array<{
    region: string;
    total: number;
  }>;
  recentActivity: Array<{
    date: string;
    agreed: number;
    withdrawn: number;
  }>;
}

const REGION_COLORS: Record<string, string> = {
  KR: '#3B82F6',
  JP: '#EF4444',
  US: '#10B981',
  GB: '#8B5CF6',
  IN: '#F59E0B',
  EU: '#EC4899',
  DEFAULT: '#6B7280',
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
  TERMS_OF_SERVICE: 'Terms',
  PRIVACY_POLICY: 'Privacy',
  MARKETING_EMAIL: 'Marketing Email',
  MARKETING_PUSH: 'Push Notifications',
  MARKETING_PUSH_NIGHT: 'Night Push',
  PERSONALIZED_ADS: 'Personalized Ads',
  THIRD_PARTY_SHARING: '3rd Party Sharing',
};

export default function ConsentStatsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await legalApi.getConsentStats(dateRange);
      setStats(response);
    } catch (err) {
      setError(t('common.error'));
      console.error('Failed to fetch consent stats:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartData = useMemo(() => {
    if (!stats) return { byType: [], byRegion: [], trend: [] };

    return {
      byType: stats.byType.map((item) => ({
        name: CONSENT_TYPE_LABELS[item.type] || item.type,
        agreed: item.agreed,
        total: item.total,
        rate: item.rate,
      })),
      byRegion: stats.byRegion.map((item) => ({
        name: item.region,
        value: item.total,
        fill: REGION_COLORS[item.region] || REGION_COLORS.DEFAULT,
      })),
      trend: stats.recentActivity.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
        }),
        agreed: item.agreed,
        withdrawn: item.withdrawn,
        net: item.agreed - item.withdrawn,
      })),
    };
  }, [stats]);

  const handleExport = useCallback(async () => {
    if (!stats) return;

    const csvContent = [
      ['Type', 'Total', 'Agreed', 'Rate'],
      ...stats.byType.map((item) => [item.type, item.total, item.agreed, `${item.rate}%`]),
      [],
      ['Region', 'Total'],
      ...stats.byRegion.map((item) => [item.region, item.total]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-stats-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-theme-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-theme-error">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors"
        >
          {t('common.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('legal.consentStats')}</h1>
          <p className="text-theme-text-secondary mt-1">
            Analyze consent trends and regional distribution
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center gap-2 bg-theme-bg-card border border-theme-border rounded-lg p-1">
            {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-theme-primary text-white'
                    : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-theme-border rounded-lg hover:bg-theme-bg-secondary transition-colors"
          >
            <Download size={18} />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consent Rate by Type */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            Consent Rate by Type
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Rate']}
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="rate" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            Regional Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.byRegion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {chartData.byRegion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString(), 'Users']}
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-theme-bg-card border border-theme-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            Consent Activity Trend
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="agreed"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Agreed"
                />
                <Line
                  type="monotone"
                  dataKey="withdrawn"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                  name="Withdrawn"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Net Change"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats?.byType.slice(0, 4).map((item) => (
          <div
            key={item.type}
            className="bg-theme-bg-card border border-theme-border rounded-xl p-4"
          >
            <p className="text-sm text-theme-text-secondary">
              {CONSENT_TYPE_LABELS[item.type] || item.type}
            </p>
            <p className="text-2xl font-bold text-theme-text-primary mt-1">{item.rate}%</p>
            <p className="text-xs text-theme-text-tertiary mt-1">
              {item.agreed.toLocaleString()} / {item.total.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
