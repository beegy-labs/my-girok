import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle, Ban, XCircle } from 'lucide-react';
import {
  tenantApi,
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  UpdateStatusRequest,
} from '../../api/tenant';
import { useAdminAuthStore } from '../../stores/adminAuthStore';

const TENANT_TYPES = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'COMMERCE', label: 'Commerce' },
  { value: 'ADBID', label: 'AdBid' },
  { value: 'POSTBACK', label: 'Postback' },
  { value: 'AGENCY', label: 'Agency' },
] as const;

export default function TenantEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<Tenant['type']>('INTERNAL');
  const [status, setStatus] = useState<Tenant['status']>('PENDING');
  const [settings, setSettings] = useState('{}');
  const [adminCount, setAdminCount] = useState(0);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTenant();
    }
  }, [id]);

  const fetchTenant = async () => {
    setLoading(true);
    setError(null);

    try {
      const tenant = await tenantApi.get(id!);
      setName(tenant.name);
      setSlug(tenant.slug);
      setType(tenant.type);
      setStatus(tenant.status);
      setSettings(JSON.stringify(tenant.settings || {}, null, 2));
      setAdminCount(tenant.adminCount);
      setApprovedAt(tenant.approvedAt);
    } catch (err) {
      setError('Failed to load tenant');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let parsedSettings = {};
      try {
        parsedSettings = JSON.parse(settings);
      } catch {
        setError('Invalid JSON in settings');
        setSaving(false);
        return;
      }

      if (isNew) {
        const data: CreateTenantRequest = {
          name,
          slug,
          type,
          settings: parsedSettings,
        };
        await tenantApi.create(data);
      } else {
        const data: UpdateTenantRequest = {
          name,
          settings: parsedSettings,
        };
        await tenantApi.update(id!, data);
      }

      navigate('/tenants');
    } catch (err) {
      setError(isNew ? 'Failed to create tenant' : 'Failed to update tenant');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: Tenant['status'], reason?: string) => {
    if (!id) return;

    setStatusUpdating(true);
    setError(null);

    try {
      const data: UpdateStatusRequest = { status: newStatus, reason };
      const updated = await tenantApi.updateStatus(id, data);
      setStatus(updated.status);
      setApprovedAt(updated.approvedAt);
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const canCreate = hasPermission('tenant:create');
  const canApprove = hasPermission('tenant:approve');
  const canSuspend = hasPermission('tenant:suspend');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/tenants"
          className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {isNew ? 'Create Tenant' : 'Edit Tenant'}
          </h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-error/10 text-theme-error rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Status actions (for existing tenants) */}
      {!isNew && (
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">Status</h2>

          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : status === 'SUSPENDED'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
              }`}
            >
              {status}
            </span>

            {approvedAt && (
              <span className="text-sm text-theme-text-tertiary">
                Approved on {new Date(approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {status === 'PENDING' && canApprove && (
              <button
                onClick={() => handleStatusUpdate('ACTIVE')}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>Approve</span>
              </button>
            )}

            {status === 'ACTIVE' && canSuspend && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for suspension:');
                  if (reason !== null) {
                    handleStatusUpdate('SUSPENDED', reason);
                  }
                }}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Ban size={16} />
                )}
                <span>Suspend</span>
              </button>
            )}

            {status === 'SUSPENDED' && canApprove && (
              <button
                onClick={() => handleStatusUpdate('ACTIVE')}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>Reactivate</span>
              </button>
            )}

            {status !== 'TERMINATED' && canSuspend && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to terminate this tenant? This action cannot be undone.',
                    )
                  ) {
                    handleStatusUpdate('TERMINATED');
                  }
                }}
                disabled={statusUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {statusUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                <span>Terminate</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">Tenant Information</h2>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Company Name"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              disabled={!isNew}
              required
              placeholder="company-slug"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary font-mono disabled:opacity-50"
            />
            <p className="mt-1 text-sm text-theme-text-tertiary">
              URL-safe identifier. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Tenant['type'])}
              disabled={!isNew}
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary disabled:opacity-50"
            >
              {TENANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              Settings (JSON)
            </label>
            <textarea
              value={settings}
              onChange={(e) => setSettings(e.target.value)}
              rows={4}
              placeholder="{}"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary font-mono text-sm resize-none"
            />
          </div>

          {!isNew && (
            <div className="pt-4 border-t border-theme-border">
              <p className="text-sm text-theme-text-tertiary">
                <span className="font-medium">Admins:</span> {adminCount}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/tenants"
            className="px-6 py-3 border border-theme-border rounded-lg hover:bg-theme-bg-secondary transition-colors"
          >
            Cancel
          </Link>
          {(isNew ? canCreate : true) && (
            <button
              type="submit"
              disabled={saving || !name || !slug}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-btn-primary-text-color rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
