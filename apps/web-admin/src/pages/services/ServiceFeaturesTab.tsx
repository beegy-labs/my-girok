import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
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

interface ServiceFeaturesTabProps {
  serviceId: string;
}

export default function ServiceFeaturesTab({ serviceId }: ServiceFeaturesTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const { trackFormSubmit } = useAuditEvent();
  const canEdit = hasPermission('service:update');

  const [features, setFeatures] = useState<ServiceFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ServiceFeature | null>(null);
  const [deletingFeature, setDeletingFeature] = useState<ServiceFeature | null>(null);
  const [saving, setSaving] = useState(false);

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
    setLoading(true);
    setError(null);

    try {
      const result = await servicesApi.listServiceFeatures(serviceId, {
        includeInactive: true,
        includeChildren: true,
      });
      setFeatures(result.data);
    } catch (err) {
      setError(t('services.loadFeaturesFailed'));
      logger.error('Failed to fetch service features', { serviceId, error: err });
    } finally {
      setLoading(false);
    }
  }, [serviceId, t]);

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
    setSaving(true);
    setError(null);

    try {
      if (editingFeature) {
        await servicesApi.updateServiceFeature(serviceId, editingFeature.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
          isDefault: formData.isDefault,
          icon: formData.icon,
          color: formData.color,
        });
        trackFormSubmit('ServiceFeatureForm', 'update', true);
      } else {
        await servicesApi.createServiceFeature(serviceId, formData);
        trackFormSubmit('ServiceFeatureForm', 'create', true);
      }
      setShowModal(false);
      fetchFeatures();
    } catch (err) {
      setError(t('services.saveFeatureFailed'));
      trackFormSubmit('ServiceFeatureForm', editingFeature ? 'update' : 'create', false);
      logger.error('Failed to save service feature', {
        serviceId,
        featureId: editingFeature?.id,
        error: err,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFeature) return;

    try {
      await servicesApi.deleteServiceFeature(serviceId, deletingFeature.id);
      setDeletingFeature(null);
      fetchFeatures();
    } catch (err) {
      setError(t('services.deleteFeatureFailed'));
      logger.error('Failed to delete service feature', {
        serviceId,
        featureId: deletingFeature.id,
        error: err,
      });
    }
  };

  const handleToggleActive = async (feature: ServiceFeature) => {
    try {
      await servicesApi.updateServiceFeature(serviceId, feature.id, {
        isActive: !feature.isActive,
      });
      fetchFeatures();
    } catch (err) {
      setError(t('services.updateFeatureFailed'));
      logger.error('Failed to toggle feature status', {
        serviceId,
        featureId: feature.id,
        error: err,
      });
    }
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
          <span>{error}</span>
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
