import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { servicesApi, ServiceFeature, CreateServiceFeatureDto } from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Modal } from '../../components/molecules/Modal';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { useAuditEvent } from '../../hooks';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';

interface ServiceFeaturesTabProps {
  serviceId: string;
}

export default function ServiceFeaturesTab({ serviceId }: ServiceFeaturesTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const { trackFormSubmit } = useAuditEvent();
  const canEdit = hasPermission('service:update');

  const [features, setFeatures] = useState<ServiceFeature[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ServiceFeature | null>(null);
  const [deletingFeature, setDeletingFeature] = useState<ServiceFeature | null>(null);

  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    isLoading: loading,
  } = useApiError({
    context: 'ServiceFeaturesTab',
    showToast: false,
  });

  // Form state
  const [formData, setFormData] = useState<CreateServiceFeatureDto>({
    code: '',
    name: '',
    description: '',
    category: 'general',
    isActive: true,
    isDefault: false,
  });

  const fetchFeatures = useCallback(async () => {
    const result = await executeWithErrorHandling(() =>
      servicesApi.listServiceFeatures(serviceId, {
        includeInactive: true,
        includeChildren: true,
      }),
    );

    if (result) {
      setFeatures(result.data);
    }
  }, [serviceId, executeWithErrorHandling]);

  const createMutation = useApiMutation({
    mutationFn: (data: CreateServiceFeatureDto) =>
      servicesApi.createServiceFeature(serviceId, data),
    successToast: 'Feature created successfully',
    onSuccess: () => {
      setShowModal(false);
      fetchFeatures();
    },
    context: 'CreateServiceFeature',
  });

  const updateMutation = useApiMutation({
    mutationFn: (data: { id: string; update: any }) =>
      servicesApi.updateServiceFeature(serviceId, data.id, data.update),
    successToast: 'Feature updated successfully',
    onSuccess: () => {
      setShowModal(false);
      fetchFeatures();
    },
    context: 'UpdateServiceFeature',
  });

  const deleteMutation = useApiMutation({
    mutationFn: (id: string) => servicesApi.deleteServiceFeature(serviceId, id),
    successToast: 'Feature deleted successfully',
    onSuccess: () => {
      setDeletingFeature(null);
      fetchFeatures();
    },
    context: 'DeleteServiceFeature',
  });

  const toggleActiveMutation = useApiMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      servicesApi.updateServiceFeature(serviceId, data.id, { isActive: data.isActive }),
    successToast: 'Feature status updated successfully',
    onSuccess: fetchFeatures,
    context: 'ToggleServiceFeature',
  });

  const saving = createMutation.isLoading || updateMutation.isLoading;

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenModal = (feature?: ServiceFeature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        code: feature.code,
        name: feature.name,
        description: feature.description || '',
        category: feature.category,
        parentId: feature.parentId || undefined,
        displayOrder: feature.displayOrder,
        isActive: feature.isActive,
        isDefault: feature.isDefault,
        icon: feature.icon || undefined,
        color: feature.color || undefined,
      });
    } else {
      setEditingFeature(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        category: 'general',
        isActive: true,
        isDefault: false,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editingFeature) {
      await updateMutation.mutate({
        id: editingFeature.id,
        update: {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
          isDefault: formData.isDefault,
          icon: formData.icon,
          color: formData.color,
        },
      });
      trackFormSubmit('ServiceFeatureForm', 'update', !updateMutation.isError);
    } else {
      await createMutation.mutate(formData);
      trackFormSubmit('ServiceFeatureForm', 'create', !createMutation.isError);
    }
  };

  const handleDelete = async () => {
    if (!deletingFeature) return;
    await deleteMutation.mutate(deletingFeature.id);
  };

  const handleToggleActive = async (feature: ServiceFeature) => {
    await toggleActiveMutation.mutate({ id: feature.id, isActive: !feature.isActive });
  };

  const renderFeature = (feature: ServiceFeature, depth = 0): React.ReactNode => {
    const hasChildren = feature.children && feature.children.length > 0;
    const isExpanded = expandedIds.has(feature.id);

    return (
      <div key={feature.id}>
        <div
          className={`flex items-center gap-3 px-4 py-3 hover:bg-theme-bg-secondary transition-colors ${
            depth > 0 ? 'border-l-2 border-theme-border-default ml-6' : ''
          }`}
        >
          {/* Expand/Collapse button */}
          <button
            onClick={() => hasChildren && toggleExpand(feature.id)}
            className={`p-1 rounded ${hasChildren ? 'hover:bg-theme-bg-primary' : 'invisible'}`}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-theme-text-tertiary" />
            ) : (
              <ChevronRight size={16} className="text-theme-text-tertiary" />
            )}
          </button>

          {/* Feature info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-theme-text-primary">{feature.name}</span>
              <code className="px-1.5 py-0.5 bg-theme-bg-secondary rounded text-xs text-theme-text-secondary">
                {feature.code}
              </code>
              <span className="px-1.5 py-0.5 bg-theme-primary/10 rounded text-xs text-theme-primary">
                {feature.category}
              </span>
            </div>
            {feature.description && (
              <p className="text-sm text-theme-text-secondary truncate">{feature.description}</p>
            )}
          </div>

          {/* Status toggle */}
          <button
            onClick={() => canEdit && handleToggleActive(feature)}
            disabled={!canEdit}
            className="p-1 rounded hover:bg-theme-bg-primary"
          >
            {feature.isActive ? (
              <ToggleRight size={24} className="text-green-500" />
            ) : (
              <ToggleLeft size={24} className="text-theme-text-tertiary" />
            )}
          </button>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-1">
              <button
                onClick={() => handleOpenModal(feature)}
                className="p-1.5 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-primary rounded"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeletingFeature(feature)}
                className="p-1.5 text-theme-text-secondary hover:text-theme-status-error-text hover:bg-theme-status-error-bg rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="pl-4">
            {feature.children!.map((child) => renderFeature(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
          <h3 className="text-lg font-semibold text-theme-text-primary">
            {t('services.features')}
          </h3>
          <p className="text-sm text-theme-text-secondary">{t('services.featuresDesc')}</p>
        </div>
        {canEdit && (
          <Button onClick={() => handleOpenModal()} icon={Plus} trackingName="AddFeature">
            {t('services.addFeature')}
          </Button>
        )}
      </div>

      {/* Features list */}
      <Card className="p-0 divide-y divide-theme-border-default">
        {features.length === 0 ? (
          <div className="p-8 text-center text-theme-text-secondary">
            {t('services.noFeatures')}
          </div>
        ) : (
          features.map((feature) => renderFeature(feature))
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingFeature ? t('services.editFeature') : t('services.addFeature')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.featureCode')}
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              disabled={!!editingFeature}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.featureName')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.featureDescription')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              {t('services.featureCategory')}
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary text-theme-text-primary"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 accent-theme-primary"
              />
              <span className="text-sm text-theme-text-primary">{t('common.active')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData((p) => ({ ...p, isDefault: e.target.checked }))}
                className="w-4 h-4 accent-theme-primary"
              />
              <span className="text-sm text-theme-text-primary">{t('services.isDefault')}</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border-default">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingFeature ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingFeature}
        onCancel={() => setDeletingFeature(null)}
        onConfirm={handleDelete}
        title={t('services.deleteFeatureTitle')}
        message={t('services.deleteFeatureMessage', { name: deletingFeature?.name })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </div>
  );
}
