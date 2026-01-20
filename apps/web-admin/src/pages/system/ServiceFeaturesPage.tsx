import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Grid3X3,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ChevronRight,
  ChevronDown,
  Power,
  PowerOff,
} from 'lucide-react';
import { servicesApi } from '../../api/services';
import type {
  ServiceFeature,
  CreateServiceFeatureDto,
  UpdateServiceFeatureDto,
} from '@my-girok/types';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Card } from '../../components/atoms/Card';
import { ServiceSelector } from '../../components/molecules/ServiceSelector';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { Modal } from '../../components/molecules/Modal';

interface FeatureNodeProps {
  feature: ServiceFeature;
  onEdit: (feature: ServiceFeature) => void;
  onDelete: (feature: ServiceFeature) => void;
  onToggleActive: (feature: ServiceFeature) => void;
  onManagePermissions: (feature: ServiceFeature) => void;
  onAddChild: (parentFeature: ServiceFeature) => void;
  canEdit: boolean;
  maxDepth: number;
}

function FeatureNode({
  feature,
  onEdit,
  onDelete,
  onToggleActive,
  onManagePermissions,
  onAddChild,
  canEdit,
  maxDepth,
}: FeatureNodeProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = feature.children && feature.children.length > 0;
  const canAddChild = feature.depth < maxDepth;

  return (
    <div className="border border-theme-border rounded-lg">
      <div
        className={`flex items-center justify-between p-3 ${
          feature.isActive ? 'bg-theme-bg-secondary' : 'bg-theme-bg-tertiary opacity-60'
        }`}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-theme-text-tertiary hover:text-theme-text-primary"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {feature.icon && <span className="text-lg">{feature.icon}</span>}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-theme-text-primary">{feature.name}</span>
              <span className="text-xs text-theme-text-tertiary font-mono">({feature.code})</span>
              {feature.isDefault && (
                <span className="text-xs bg-theme-primary/20 text-theme-primary px-2 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
            {feature.description && (
              <p className="text-sm text-theme-text-secondary mt-1">{feature.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleActive(feature)}
            disabled={!canEdit}
            className={`p-2 rounded hover:bg-theme-bg-tertiary ${
              feature.isActive ? 'text-theme-success' : 'text-theme-text-tertiary'
            }`}
            title={feature.isActive ? t('common.deactivate') : t('common.reactivate')}
          >
            {feature.isActive ? <Power size={16} /> : <PowerOff size={16} />}
          </button>

          {canAddChild && canEdit && (
            <button
              onClick={() => onAddChild(feature)}
              className="p-2 rounded hover:bg-theme-bg-tertiary text-theme-text-tertiary"
              title={t('serviceFeatures.addChildFeature')}
            >
              <Plus size={16} />
            </button>
          )}

          <button
            onClick={() => onManagePermissions(feature)}
            className="p-2 rounded hover:bg-theme-bg-tertiary text-theme-text-tertiary"
            title={t('serviceFeatures.managePermissions')}
          >
            <Shield size={16} />
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => onEdit(feature)}
                className="p-2 rounded hover:bg-theme-bg-tertiary text-theme-text-tertiary"
                title={t('common.edit')}
              >
                <Edit2 size={16} />
              </button>

              <button
                onClick={() => onDelete(feature)}
                className="p-2 rounded hover:bg-theme-bg-tertiary text-theme-error"
                title={t('common.delete')}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="p-3 pl-8 space-y-2">
          {feature.children!.map((child) => (
            <FeatureNode
              key={child.id}
              feature={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              onManagePermissions={onManagePermissions}
              onAddChild={onAddChild}
              canEdit={canEdit}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServiceFeaturesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('service:update');

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [features, setFeatures] = useState<ServiceFeature[]>([]);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ServiceFeature | null>(null);
  const [parentFeature, setParentFeature] = useState<ServiceFeature | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<ServiceFeature | null>(null);

  const [featureForm, setFeatureForm] = useState<Partial<CreateServiceFeatureDto>>({
    code: '',
    name: '',
    description: '',
    category: '',
    parentId: undefined,
    displayOrder: 0,
    isActive: true,
    isDefault: false,
    icon: '',
    color: '',
  });

  const MAX_DEPTH = 4;

  const { executeWithErrorHandling } = useApiError({
    context: 'ServiceFeaturesPage.loadFeatures',
    retry: true,
  });

  const loadFeatures = useCallback(
    async (serviceId: string) => {
      const result = await executeWithErrorHandling(async () => {
        return await servicesApi.listServiceFeatures(serviceId, { includeChildren: true });
      });

      if (result) {
        setFeatures(result.data);
      }
    },
    [executeWithErrorHandling],
  );

  const createMutation = useApiMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: CreateServiceFeatureDto }) =>
      servicesApi.createServiceFeature(serviceId, data),
    context: 'ServiceFeaturesPage.create',
    onSuccess: () => {
      setShowFeatureModal(false);
      setEditingFeature(null);
      setParentFeature(null);
      if (selectedServiceId) {
        loadFeatures(selectedServiceId);
      }
    },
  });

  const updateMutation = useApiMutation({
    mutationFn: ({
      serviceId,
      id,
      data,
    }: {
      serviceId: string;
      id: string;
      data: UpdateServiceFeatureDto;
    }) => servicesApi.updateServiceFeature(serviceId, id, data),
    context: 'ServiceFeaturesPage.update',
    onSuccess: () => {
      setShowFeatureModal(false);
      setEditingFeature(null);
      if (selectedServiceId) {
        loadFeatures(selectedServiceId);
      }
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: ({ serviceId, id }: { serviceId: string; id: string }) =>
      servicesApi.deleteServiceFeature(serviceId, id),
    context: 'ServiceFeaturesPage.delete',
    onSuccess: () => {
      setShowDeleteConfirm(false);
      setSelectedFeature(null);
      if (selectedServiceId) {
        loadFeatures(selectedServiceId);
      }
    },
  });

  useEffect(() => {
    if (selectedServiceId) {
      loadFeatures(selectedServiceId);
    }
  }, [selectedServiceId, loadFeatures]);

  const closeFeatureModal = useCallback(() => {
    setShowFeatureModal(false);
    setEditingFeature(null);
    setParentFeature(null);
  }, []);

  const handleAddRootFeature = () => {
    setEditingFeature(null);
    setParentFeature(null);
    setFeatureForm({
      code: '',
      name: '',
      description: '',
      category: '',
      parentId: undefined,
      displayOrder: 0,
      isActive: true,
      isDefault: false,
      icon: '',
      color: '',
    });
    setShowFeatureModal(true);
  };

  const handleAddChildFeature = (parent: ServiceFeature) => {
    setEditingFeature(null);
    setParentFeature(parent);
    setFeatureForm({
      code: '',
      name: '',
      description: '',
      category: parent.category,
      parentId: parent.id,
      displayOrder: 0,
      isActive: true,
      isDefault: false,
      icon: '',
      color: '',
    });
    setShowFeatureModal(true);
  };

  const handleEdit = (feature: ServiceFeature) => {
    setEditingFeature(feature);
    setParentFeature(null);
    setFeatureForm({
      code: feature.code,
      name: feature.name,
      description: feature.description || '',
      category: feature.category,
      parentId: feature.parentId || undefined,
      displayOrder: feature.displayOrder,
      isActive: feature.isActive,
      isDefault: feature.isDefault,
      icon: feature.icon || '',
      color: feature.color || '',
    });
    setShowFeatureModal(true);
  };

  const handleDelete = (feature: ServiceFeature) => {
    setSelectedFeature(feature);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = (feature: ServiceFeature) => {
    if (!selectedServiceId) return;

    updateMutation.mutate({
      serviceId: selectedServiceId,
      id: feature.id,
      data: { isActive: !feature.isActive },
    });
  };

  const handleManagePermissions = (feature: ServiceFeature) => {
    setSelectedFeature(feature);
    setShowPermissionModal(true);
  };

  const handleSaveFeature = () => {
    if (!selectedServiceId) return;

    if (editingFeature) {
      updateMutation.mutate({
        serviceId: selectedServiceId,
        id: editingFeature.id,
        data: featureForm,
      });
    } else {
      createMutation.mutate({
        serviceId: selectedServiceId,
        data: featureForm as CreateServiceFeatureDto,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedServiceId || !selectedFeature) return;

    deleteMutation.mutate({
      serviceId: selectedServiceId,
      id: selectedFeature.id,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Grid3X3 className="text-theme-primary" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-theme-text-primary">
              {t('serviceFeatures.title')}
            </h1>
            <p className="text-sm text-theme-text-secondary">{t('serviceFeatures.description')}</p>
          </div>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <label className="block text-sm font-medium text-theme-text-secondary mb-2">
          {t('serviceFeatures.selectService')}
        </label>
        <ServiceSelector value={selectedServiceId} onChange={setSelectedServiceId} />
      </Card>

      {selectedServiceId && (
        <>
          <Card className="mb-4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-theme-text-secondary">
                {t('serviceFeatures.featureTree')} ({features.length}{' '}
                {t('serviceFeatures.featureTree').toLowerCase()})
              </div>
              {canEdit && (
                <Button onClick={handleAddRootFeature} size="sm">
                  <Plus size={16} />
                  {t('serviceFeatures.addRootFeature')}
                </Button>
              )}
            </div>
          </Card>

          <div className="space-y-2">
            {features.length === 0 ? (
              <Card className="p-8 text-center">
                <Grid3X3 className="mx-auto mb-4 text-theme-text-tertiary" size={48} />
                <p className="text-theme-text-secondary">{t('serviceFeatures.noFeatures')}</p>
              </Card>
            ) : (
              features.map((feature) => (
                <FeatureNode
                  key={feature.id}
                  feature={feature}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                  onManagePermissions={handleManagePermissions}
                  onAddChild={handleAddChildFeature}
                  canEdit={canEdit}
                  maxDepth={MAX_DEPTH}
                />
              ))
            )}
          </div>
        </>
      )}

      {!selectedServiceId && (
        <Card className="p-8 text-center">
          <Grid3X3 className="mx-auto mb-4 text-theme-text-tertiary" size={48} />
          <p className="text-theme-text-secondary">{t('serviceFeatures.selectService')}</p>
        </Card>
      )}

      {/* Feature Form Modal */}
      <Modal
        isOpen={showFeatureModal}
        onClose={closeFeatureModal}
        title={
          editingFeature
            ? t('serviceFeatures.editFeature')
            : parentFeature
              ? t('serviceFeatures.addChildFeature')
              : t('serviceFeatures.addRootFeature')
        }
      >
        <div className="space-y-4">
          {parentFeature && (
            <div className="p-3 bg-theme-bg-secondary rounded border border-theme-border">
              <p className="text-sm text-theme-text-secondary mb-1">
                {t('serviceFeatures.parentFeature')}:
              </p>
              <p className="font-medium text-theme-text-primary">{parentFeature.name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              {t('serviceFeatures.featureKey')} *
            </label>
            <Input
              value={featureForm.code}
              onChange={(e) => setFeatureForm({ ...featureForm, code: e.target.value })}
              disabled={!!editingFeature}
              placeholder="feature_key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              {t('serviceFeatures.featureName')} *
            </label>
            <Input
              value={featureForm.name}
              onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
              placeholder="Feature Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              {t('serviceFeatures.featureDescription')}
            </label>
            <textarea
              value={featureForm.description}
              onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
              className="w-full p-2 border border-theme-border rounded bg-theme-bg-primary text-theme-text-primary"
              rows={3}
              placeholder="Feature description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                {t('serviceFeatures.featureCategory')}
              </label>
              <Input
                value={featureForm.category}
                onChange={(e) => setFeatureForm({ ...featureForm, category: e.target.value })}
                placeholder="category"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                {t('serviceFeatures.featureIcon')}
              </label>
              <Input
                value={featureForm.icon}
                onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })}
                placeholder="🎯"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={featureForm.isActive}
                onChange={(e) => setFeatureForm({ ...featureForm, isActive: e.target.checked })}
              />
              <span className="text-sm text-theme-text-secondary">
                {t('serviceFeatures.isActive')}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={featureForm.isDefault}
                onChange={(e) => setFeatureForm({ ...featureForm, isDefault: e.target.checked })}
              />
              <span className="text-sm text-theme-text-secondary">Default</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={closeFeatureModal}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveFeature}
              disabled={
                !featureForm.code ||
                !featureForm.name ||
                createMutation.isLoading ||
                updateMutation.isLoading
              }
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permission Modal (Placeholder) */}
      <Modal
        isOpen={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          setSelectedFeature(null);
        }}
        title={t('serviceFeatures.managePermissions')}
      >
        <div className="space-y-4">
          {selectedFeature && (
            <>
              <div className="p-3 bg-theme-bg-secondary rounded border border-theme-border">
                <p className="text-sm text-theme-text-secondary mb-1">Feature:</p>
                <p className="font-medium text-theme-text-primary">{selectedFeature.name}</p>
              </div>

              <p className="text-sm text-theme-text-secondary">
                Permission management UI will be implemented here.
              </p>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => {
                setShowPermissionModal(false);
                setSelectedFeature(null);
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedFeature(null);
        }}
        onConfirm={handleConfirmDelete}
        title={t('serviceFeatures.deleteConfirm')}
        message={t('serviceFeatures.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </div>
  );
}
