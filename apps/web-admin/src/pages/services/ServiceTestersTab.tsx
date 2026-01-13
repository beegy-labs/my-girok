import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Plus, Trash2, Users, Shield, Clock } from 'lucide-react';
import { servicesApi, TesterUser, TesterAdmin } from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Modal } from '../../components/molecules/Modal';
import { useAuditEvent } from '../../hooks';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';

interface ServiceTestersTabProps {
  serviceId: string;
}

export default function ServiceTestersTab({ serviceId }: ServiceTestersTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const { trackFormSubmit } = useAuditEvent();
  const canEdit = hasPermission('service:update');

  const [userTesters, setUserTesters] = useState<TesterUser[]>([]);
  const [adminTesters, setAdminTesters] = useState<TesterAdmin[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'admins'>('users');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTester, setDeletingTester] = useState<{
    type: 'user' | 'admin';
    id: string;
    name: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceTestersTab',
    showToast: false,
  });

  const createUserTesterMutation = useApiMutation({
    mutationFn: (data: any) => servicesApi.createUserTester(serviceId, data),
    successToast: 'User tester added successfully',
    onSuccess: () => {
      setShowAddModal(false);
      setFormData({
        userId: '',
        adminId: '',
        bypassAll: true,
        bypassDomain: false,
        bypassIP: false,
        bypassRate: false,
        note: '',
        expiresAt: '',
        reason: '',
      });
      fetchData();
    },
    context: 'CreateUserTester',
  });

  const createAdminTesterMutation = useApiMutation({
    mutationFn: (data: any) => servicesApi.createAdminTester(serviceId, data),
    successToast: 'Admin tester added successfully',
    onSuccess: () => {
      setShowAddModal(false);
      setFormData({
        userId: '',
        adminId: '',
        bypassAll: true,
        bypassDomain: false,
        bypassIP: false,
        bypassRate: false,
        note: '',
        expiresAt: '',
        reason: '',
      });
      fetchData();
    },
    context: 'CreateAdminTester',
  });

  const deleteUserTesterMutation = useApiMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      servicesApi.deleteUserTester(serviceId, data.id, data.reason),
    successToast: 'User tester removed successfully',
    onSuccess: () => {
      setDeletingTester(null);
      setDeleteReason('');
      fetchData();
    },
    context: 'DeleteUserTester',
  });

  const deleteAdminTesterMutation = useApiMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      servicesApi.deleteAdminTester(serviceId, data.id, data.reason),
    successToast: 'Admin tester removed successfully',
    onSuccess: () => {
      setDeletingTester(null);
      setDeleteReason('');
      fetchData();
    },
    context: 'DeleteAdminTester',
  });

  const saving = createUserTesterMutation.isLoading || createAdminTesterMutation.isLoading;

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    adminId: '',
    bypassAll: true,
    bypassDomain: false,
    bypassIP: false,
    bypassRate: false,
    note: '',
    expiresAt: '',
    reason: '',
  });

  const fetchData = useCallback(async () => {
    const result = await executeWithErrorHandling(async () => {
      const [usersResult, adminsResult] = await Promise.all([
        servicesApi.listUserTesters(serviceId),
        servicesApi.listAdminTesters(serviceId),
      ]);
      return { usersResult, adminsResult };
    });

    if (result) {
      setUserTesters(result.usersResult.data);
      setAdminTesters(result.adminsResult.data);
    }
  }, [serviceId, executeWithErrorHandling]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!formData.reason.trim()) {
      return;
    }

    if (activeTab === 'users') {
      await createUserTesterMutation.mutate({
        userId: formData.userId,
        bypassAll: formData.bypassAll,
        bypassDomain: formData.bypassDomain,
        bypassIP: formData.bypassIP,
        bypassRate: formData.bypassRate,
        note: formData.note || undefined,
        expiresAt: formData.expiresAt || undefined,
        reason: formData.reason,
      });
      trackFormSubmit('TesterForm', 'create', !createUserTesterMutation.isError);
    } else {
      await createAdminTesterMutation.mutate({
        adminId: formData.adminId,
        bypassAll: formData.bypassAll,
        bypassDomain: formData.bypassDomain,
        note: formData.note || undefined,
        expiresAt: formData.expiresAt || undefined,
        reason: formData.reason,
      });
      trackFormSubmit('TesterForm', 'create', !createAdminTesterMutation.isError);
    }
  };

  const handleDelete = async () => {
    if (!deletingTester || !deleteReason.trim()) return;

    if (deletingTester.type === 'user') {
      await deleteUserTesterMutation.mutate({ id: deletingTester.id, reason: deleteReason });
    } else {
      await deleteAdminTesterMutation.mutate({ id: deletingTester.id, reason: deleteReason });
    }
  };

  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return t('services.noExpiry');
    const date = new Date(dateStr);
    const now = new Date();
    if (date < now) return t('services.expired');
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-theme-text-primary">{t('services.testers')}</h3>
          <p className="text-sm text-theme-text-secondary">{t('services.testersDesc')}</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowAddModal(true)} icon={Plus} trackingName="AddTester">
            {t('services.addTester')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-theme-border-default">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-theme-primary text-theme-primary'
              : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary'
          }`}
        >
          <Users size={18} />
          <span>{t('services.userTesters')}</span>
          <span className="px-1.5 py-0.5 bg-theme-bg-secondary rounded text-xs">
            {userTesters.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'admins'
              ? 'border-theme-primary text-theme-primary'
              : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary'
          }`}
        >
          <Shield size={18} />
          <span>{t('services.adminTesters')}</span>
          <span className="px-1.5 py-0.5 bg-theme-bg-secondary rounded text-xs">
            {adminTesters.length}
          </span>
        </button>
      </div>

      {/* Testers List */}
      <Card className="p-0 divide-y divide-theme-border-default">
        {activeTab === 'users' ? (
          userTesters.length === 0 ? (
            <div className="p-8 text-center text-theme-text-secondary">
              {t('services.noUserTesters')}
            </div>
          ) : (
            userTesters.map((tester) => (
              <div key={tester.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-theme-bg-secondary flex items-center justify-center">
                  {tester.user.avatar ? (
                    <img
                      src={tester.user.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-theme-text-tertiary">
                      {tester.user.name?.[0] || tester.user.email[0].toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-theme-text-primary">
                    {tester.user.name || tester.user.email}
                  </div>
                  <div className="text-sm text-theme-text-secondary">{tester.user.email}</div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {tester.bypassAll && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      All
                    </span>
                  )}
                  {tester.bypassDomain && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      Domain
                    </span>
                  )}
                  {tester.bypassIP && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      IP
                    </span>
                  )}
                  {tester.bypassRate && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                      Rate
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
                  <Clock size={14} />
                  <span>{formatExpiry(tester.expiresAt)}</span>
                </div>

                {canEdit && (
                  <button
                    onClick={() =>
                      setDeletingTester({
                        type: 'user',
                        id: tester.userId,
                        name: tester.user.name || tester.user.email,
                      })
                    }
                    className="p-1.5 text-theme-text-secondary hover:text-theme-status-error-text hover:bg-theme-status-error-bg rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )
        ) : adminTesters.length === 0 ? (
          <div className="p-8 text-center text-theme-text-secondary">
            {t('services.noAdminTesters')}
          </div>
        ) : (
          adminTesters.map((tester) => (
            <div key={tester.id} className="flex items-center gap-4 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                <span className="text-lg font-medium text-theme-primary">
                  {tester.admin.name[0].toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-theme-text-primary">{tester.admin.name}</div>
                <div className="text-sm text-theme-text-secondary">{tester.admin.email}</div>
              </div>

              <div className="flex flex-wrap gap-1">
                {tester.bypassAll && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    All
                  </span>
                )}
                {tester.bypassDomain && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    Domain
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
                <Clock size={14} />
                <span>{formatExpiry(tester.expiresAt)}</span>
              </div>

              {canEdit && (
                <button
                  onClick={() =>
                    setDeletingTester({
                      type: 'admin',
                      id: tester.adminId,
                      name: tester.admin.name,
                    })
                  }
                  className="p-1.5 text-theme-text-secondary hover:text-theme-status-error-text hover:bg-theme-status-error-bg rounded"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('services.addTester')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {activeTab === 'users' ? t('services.userId') : t('services.adminId')}
            </label>
            <input
              type="text"
              value={activeTab === 'users' ? formData.userId : formData.adminId}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  [activeTab === 'users' ? 'userId' : 'adminId']: e.target.value,
                }))
              }
              placeholder="UUID"
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text-secondary">
              {t('services.bypassOptions')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.bypassAll}
                onChange={(e) => setFormData((p) => ({ ...p, bypassAll: e.target.checked }))}
                className="w-4 h-4 accent-theme-primary"
              />
              <span className="text-sm text-theme-text-primary">{t('services.bypassAll')}</span>
            </label>
            {activeTab === 'users' && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.bypassDomain}
                    onChange={(e) => setFormData((p) => ({ ...p, bypassDomain: e.target.checked }))}
                    className="w-4 h-4 accent-theme-primary"
                  />
                  <span className="text-sm text-theme-text-primary">
                    {t('services.bypassDomain')}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.bypassIP}
                    onChange={(e) => setFormData((p) => ({ ...p, bypassIP: e.target.checked }))}
                    className="w-4 h-4 accent-theme-primary"
                  />
                  <span className="text-sm text-theme-text-primary">{t('services.bypassIP')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.bypassRate}
                    onChange={(e) => setFormData((p) => ({ ...p, bypassRate: e.target.checked }))}
                    className="w-4 h-4 accent-theme-primary"
                  />
                  <span className="text-sm text-theme-text-primary">
                    {t('services.bypassRate')}
                  </span>
                </label>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.expiresAt')}
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.note')}
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.reason')} *
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border-default">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              {t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingTester}
        onClose={() => {
          setDeletingTester(null);
          setDeleteReason('');
        }}
        title={t('services.removeTester')}
      >
        <div className="space-y-4">
          <p className="text-theme-text-secondary">
            {t('services.removeTesterMessage', { name: deletingTester?.name })}
          </p>
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.reason')} *
            </label>
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border-default">
            <Button
              variant="secondary"
              onClick={() => {
                setDeletingTester(null);
                setDeleteReason('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={!deleteReason.trim()}>
              {t('common.remove')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
