import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { logger } from '../../utils/logger';
import { Loader2, AlertCircle, Settings, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { servicesApi, ServiceListResponse } from '../../api/services';

export default function ServicesPage() {
  const [data, setData] = useState<ServiceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await servicesApi.listServices();
      setData(result);
    } catch (err) {
      setError('Failed to load services');
      logger.error('Operation failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">Services</h1>
          <p className="text-theme-text-secondary mt-1">
            Manage services and their consent requirements
          </p>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Slug</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((service) => (
                <tr key={service.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-theme-bg-secondary rounded-lg flex items-center justify-center">
                        <Settings size={20} className="text-theme-text-tertiary" />
                      </div>
                      <div>
                        <p className="font-medium text-theme-text-primary">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-theme-text-secondary truncate max-w-xs">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="px-2 py-1 bg-theme-bg-secondary rounded text-sm">
                      {service.slug}
                    </code>
                  </td>
                  <td>
                    {service.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <CheckCircle size={14} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        <XCircle size={14} />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/services/${service.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-theme-text-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
                    >
                      Manage
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-theme-text-secondary">
                    No services found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
