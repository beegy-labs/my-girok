import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Plus,
  Pencil,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
} from 'lucide-react';
import { tenantApi, Tenant, TenantListResponse } from '../../api/tenant';
import { useAdminAuthStore } from '../../stores/adminAuthStore';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const STATUS_ICONS = {
  PENDING: Clock,
  ACTIVE: CheckCircle,
  SUSPENDED: Ban,
  TERMINATED: XCircle,
};

const STATUS_COLORS = {
  PENDING: 'text-yellow-600 bg-yellow-100',
  ACTIVE: 'text-green-600 bg-green-100',
  SUSPENDED: 'text-orange-600 bg-orange-100',
  TERMINATED: 'text-red-600 bg-red-100',
};

export default function TenantsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TenantListResponse = await tenantApi.list({
        page,
        limit: 20,
        status: status || undefined,
        search: search || undefined,
      });

      setTenants(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError('Failed to load tenants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTenants();
  };

  const canCreate = hasPermission('tenant:create');
  const canEdit = hasPermission('tenant:approve') || hasPermission('tenant:suspend');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">Tenants</h1>
          <p className="text-theme-text-secondary mt-1">
            Manage partner organizations and their access
          </p>
        </div>
        {canCreate && (
          <Link
            to="/tenants/new"
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text-color rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>New Tenant</span>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-theme-bg-card border border-theme-border rounded-xl p-4">
        <Filter size={18} className="text-theme-text-tertiary" />

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug"
              className="pl-10 pr-4 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary text-sm w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-theme-primary text-btn-primary-text-color rounded-lg text-sm hover:opacity-90"
          >
            Search
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm text-theme-text-tertiary">
          {total} tenant{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-error/10 text-theme-error rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border rounded-xl overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Type</th>
              <th>Status</th>
              <th>Admins</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-theme-text-tertiary" />
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-theme-text-tertiary">
                  No tenants found
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => {
                const StatusIcon = STATUS_ICONS[tenant.status];
                return (
                  <tr key={tenant.id}>
                    <td className="font-medium text-theme-text-primary">{tenant.name}</td>
                    <td className="text-theme-text-secondary font-mono text-sm">{tenant.slug}</td>
                    <td>
                      <span className="px-2 py-1 bg-theme-bg-secondary rounded text-xs font-medium">
                        {tenant.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[tenant.status]}`}
                      >
                        <StatusIcon size={12} />
                        {tenant.status}
                      </span>
                    </td>
                    <td className="text-theme-text-secondary">{tenant.adminCount}</td>
                    <td className="text-theme-text-secondary">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                          className="p-2 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-theme-border rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-theme-text-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-theme-border rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
