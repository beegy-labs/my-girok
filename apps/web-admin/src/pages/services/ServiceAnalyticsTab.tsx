import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  FileText,
  ClipboardList,
  Globe,
  Languages,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useApiError } from '../../hooks/useApiError';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { legalApi } from '../../api/legal';
import { servicesApi } from '../../api/services';

interface ServiceAnalyticsTabProps {
  serviceId: string;
}

interface ServiceMetrics {
  documentCount: number;
  consentRequirementCount: number;
  countryCount: number;
  localeCount: number;
  documentsByType: Array<{ type: string; count: number }>;
  consentsByCountry: Array<{ country: string; count: number }>;
}

const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TERMS_OF_SERVICE: 'Terms',
  PRIVACY_POLICY: 'Privacy',
  MARKETING: 'Marketing',
  THIRD_PARTY: 'Third Party',
  LOCATION: 'Location',
};

export default function ServiceAnalyticsTab({ serviceId }: ServiceAnalyticsTabProps) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceAnalyticsTab',
    showToast: false,
  });

  const fetchMetrics = useCallback(async () => {
    const result = await executeWithErrorHandling(async () => {
      // Fetch all data in parallel
      const [documentsRes, consentsRes, countriesRes, localesRes] = await Promise.all([
        legalApi.listDocuments({ serviceId, limit: 100 }),
        servicesApi.listConsentRequirements(serviceId),
        servicesApi.listServiceCountries(serviceId),
        servicesApi.listServiceLocales(serviceId),
      ]);

      // Calculate document counts by type
      const docsByType: Record<string, number> = {};
      documentsRes.items.forEach((doc) => {
        docsByType[doc.type] = (docsByType[doc.type] || 0) + 1;
      });

      // Calculate consent requirements by country
      const consentsByCountry: Record<string, number> = {};
      consentsRes.data.forEach((consent) => {
        const country = consent.countryCode || 'Global';
        consentsByCountry[country] = (consentsByCountry[country] || 0) + 1;
      });

      return {
        documentCount: documentsRes.total,
        consentRequirementCount: consentsRes.data.length,
        countryCount: countriesRes.data.length,
        localeCount: localesRes.data.length,
        documentsByType: Object.entries(docsByType).map(([type, count]) => ({
          type,
          count,
        })),
        consentsByCountry: Object.entries(consentsByCountry).map(([country, count]) => ({
          country,
          count,
        })),
      };
    });

    if (result) {
      setMetrics(result);
    }
  }, [serviceId, executeWithErrorHandling]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const chartData = useMemo(() => {
    if (!metrics) return { documentsByType: [], consentsByCountry: [] };

    return {
      documentsByType: metrics.documentsByType.map((item) => ({
        name: DOCUMENT_TYPE_LABELS[item.type] || item.type.replace(/_/g, ' '),
        count: item.count,
      })),
      consentsByCountry: metrics.consentsByCountry.map((item, index) => ({
        name: item.country,
        value: item.count,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    };
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertCircle size={48} className="text-theme-status-error-text" />
        <p className="text-theme-text-secondary">{errorMessage}</p>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90"
        >
          <RefreshCw size={16} />
          {t('common.tryAgain')}
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme-text-primary">{metrics.documentCount}</p>
              <p className="text-sm text-theme-text-secondary">{t('services.totalDocuments')}</p>
            </div>
          </div>
        </div>

        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <ClipboardList size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme-text-primary">
                {metrics.consentRequirementCount}
              </p>
              <p className="text-sm text-theme-text-secondary">{t('services.totalConsents')}</p>
            </div>
          </div>
        </div>

        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Globe size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme-text-primary">{metrics.countryCount}</p>
              <p className="text-sm text-theme-text-secondary">{t('services.activeCountries')}</p>
            </div>
          </div>
        </div>

        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-100 rounded-lg">
              <Languages size={24} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme-text-primary">{metrics.localeCount}</p>
              <p className="text-sm text-theme-text-secondary">{t('services.activeLocales')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents by Type */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            {t('services.documentsByType')}
          </h3>
          {chartData.documentsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.documentsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-theme-text-tertiary">
              {t('services.noDocumentsChart')}
            </div>
          )}
        </div>

        {/* Consents by Country */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            {t('services.consentsByCountry')}
          </h3>
          {chartData.consentsByCountry.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData.consentsByCountry}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.consentsByCountry.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-theme-text-tertiary">
              {t('services.noConsentsChart')}
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          {t('common.refresh')}
        </button>
      </div>
    </div>
  );
}
