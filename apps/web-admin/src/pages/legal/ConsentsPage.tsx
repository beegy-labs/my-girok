import { useEffect, useState, useCallback } from 'react';
import { Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { legalApi, ConsentStats } from '../../api/legal';
import { useApiError } from '../../hooks/useApiError';

export default function ConsentsPage() {
  const [stats, setStats] = useState<ConsentStats | null>(null);

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'ConsentsPage.fetchStats',
  });

  const fetchStats = useCallback(async () => {
    const data = await executeWithErrorHandling(() => legalApi.getConsentStats());
    if (data) {
      setStats(data);
    }
  }, [executeWithErrorHandling]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">User Consents</h1>
          <p className="text-theme-text-secondary mt-1">
            Overview of user consent agreements and statistics
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors">
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <p className="text-sm text-theme-text-secondary">Total Consents</p>
          <p className="text-3xl font-bold text-theme-text-primary mt-2">
            {stats.summary.totalConsents.toLocaleString()}
          </p>
        </div>
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <p className="text-sm text-theme-text-secondary">Unique Users</p>
          <p className="text-3xl font-bold text-theme-text-primary mt-2">
            {stats.summary.totalUsers.toLocaleString()}
          </p>
        </div>
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <p className="text-sm text-theme-text-secondary">Overall Agreement Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {(stats.summary.overallAgreementRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Consent by type */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <h2 className="text-lg font-semibold text-theme-text-primary mb-4">Consents by Type</h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Consent Type</th>
                <th className="text-right">Total</th>
                <th className="text-right">Agreed</th>
                <th className="text-right">Withdrawn</th>
                <th className="text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.byType.map((item) => (
                <tr key={item.type}>
                  <td className="font-medium">{item.type.replace(/_/g, ' ')}</td>
                  <td className="text-right text-theme-text-secondary">
                    {item.total.toLocaleString()}
                  </td>
                  <td className="text-right text-green-600">{item.agreed.toLocaleString()}</td>
                  <td className="text-right text-red-600">{item.withdrawn.toLocaleString()}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={
                          item.rate >= 0.8
                            ? 'text-green-600'
                            : item.rate >= 0.5
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }
                      >
                        {(item.rate * 100).toFixed(1)}%
                      </span>
                      {item.rate >= 0.8 ? (
                        <TrendingUp size={16} className="text-green-600" />
                      ) : (
                        <TrendingDown size={16} className="text-red-600" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consent by region */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <h2 className="text-lg font-semibold text-theme-text-primary mb-4">Consents by Region</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.byRegion.map((item) => (
            <div key={item.region} className="p-4 bg-theme-bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold text-theme-text-primary">
                {item.total.toLocaleString()}
              </p>
              <p className="text-sm text-theme-text-secondary mt-1">{item.region}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
          Recent Activity (Last 30 Days)
        </h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Agreed</th>
                <th className="text-right">Withdrawn</th>
                <th className="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentActivity.slice(0, 10).map((day) => (
                <tr key={day.date}>
                  <td className="text-theme-text-primary">
                    {new Date(day.date).toLocaleDateString('en', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="text-right text-green-600">+{day.agreed}</td>
                  <td className="text-right text-red-600">-{day.withdrawn}</td>
                  <td className="text-right">
                    <span
                      className={
                        day.agreed - day.withdrawn >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {day.agreed - day.withdrawn >= 0 ? '+' : ''}
                      {day.agreed - day.withdrawn}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
