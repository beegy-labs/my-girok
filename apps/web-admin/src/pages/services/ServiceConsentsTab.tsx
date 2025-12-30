import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import {
  servicesApi,
  ConsentRequirement,
  CreateConsentRequirementDto,
  UpdateConsentRequirementDto,
} from '../../api/services';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { COUNTRY_OPTIONS } from '../../config/country.config';

const CONSENT_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING_EMAIL',
  'MARKETING_PUSH',
  'MARKETING_PUSH_NIGHT',
  'MARKETING_SMS',
  'PERSONALIZED_ADS',
  'THIRD_PARTY_SHARING',
  'CROSS_BORDER_TRANSFER',
  'CROSS_SERVICE_SHARING',
];

const DOCUMENT_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING_POLICY',
  'PERSONALIZED_ADS',
];

interface EditingRequirement {
  id?: string;
  countryCode: string;
  consentType: string;
  isRequired: boolean;
  documentType: string;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
}

const emptyRequirement: EditingRequirement = {
  countryCode: 'KR',
  consentType: 'TERMS_OF_SERVICE',
  isRequired: true,
  documentType: 'TERMS_OF_SERVICE',
  displayOrder: 0,
  labelKey: '',
  descriptionKey: '',
};

interface ServiceConsentsTabProps {
  serviceId: string;
}

export default function ServiceConsentsTab({ serviceId }: ServiceConsentsTabProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('service:update');

  const [requirements, setRequirements] = useState<ConsentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRequirement>(emptyRequirement);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await servicesApi.listConsentRequirements(
        serviceId,
        selectedCountry || undefined,
      );
      setRequirements(result.data);
    } catch (err) {
      setError(t('services.loadConsentsFailed'));
      logger.error('Failed to fetch consent requirements', {
        serviceId,
        countryCode: selectedCountry,
        error: err,
      });
    } finally {
      setLoading(false);
    }
  }, [serviceId, selectedCountry, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartAdd = () => {
    setEditForm({ ...emptyRequirement });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (req: ConsentRequirement) => {
    setEditForm({
      id: req.id,
      countryCode: req.countryCode,
      consentType: req.consentType,
      isRequired: req.isRequired,
      documentType: req.documentType,
      displayOrder: req.displayOrder,
      labelKey: req.labelKey,
      descriptionKey: req.descriptionKey,
    });
    setEditingId(req.id);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setEditForm(emptyRequirement);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (isAdding) {
        const dto: CreateConsentRequirementDto = {
          countryCode: editForm.countryCode,
          consentType: editForm.consentType,
          isRequired: editForm.isRequired,
          documentType: editForm.documentType,
          displayOrder: editForm.displayOrder,
          labelKey: editForm.labelKey,
          descriptionKey: editForm.descriptionKey,
        };
        await servicesApi.createConsentRequirement(serviceId, dto);
      } else if (editingId) {
        const dto: UpdateConsentRequirementDto = {
          isRequired: editForm.isRequired,
          documentType: editForm.documentType,
          displayOrder: editForm.displayOrder,
          labelKey: editForm.labelKey,
          descriptionKey: editForm.descriptionKey,
        };
        await servicesApi.updateConsentRequirement(serviceId, editingId, dto);
      }
      handleCancelEdit();
      await fetchData();
    } catch (err) {
      logger.error('Failed to save consent requirement', {
        serviceId,
        consentId: editingId,
        error: err,
      });
      setError(t('services.saveConsentFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('services.deleteConsentConfirm'))) return;

    try {
      await servicesApi.deleteConsentRequirement(serviceId, id);
      await fetchData();
    } catch (err) {
      logger.error('Failed to delete consent requirement', {
        serviceId,
        consentId: id,
        error: err,
      });
      setError(t('services.deleteConsentFailed'));
    }
  };

  if (loading && requirements.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filter and add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm text-theme-text-secondary">
            {t('services.filterByCountry')}:
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
          >
            <option value="">{t('common.allCountries')}</option>
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button
            onClick={handleStartAdd}
            disabled={isAdding}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={18} />
            <span>{t('services.addConsent')}</span>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('services.addConsentTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.countryCode')}
              </label>
              <select
                value={editForm.countryCode}
                onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value })}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.consentType')}
              </label>
              <select
                value={editForm.consentType}
                onChange={(e) => setEditForm({ ...editForm, consentType: e.target.value })}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              >
                {CONSENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.documentType')}
              </label>
              <select
                value={editForm.documentType}
                onChange={(e) => setEditForm({ ...editForm, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.required')}
              </label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={editForm.isRequired}
                    onChange={() => setEditForm({ ...editForm, isRequired: true })}
                    className="w-4 h-4"
                  />
                  <span className="text-theme-text-primary">{t('common.required')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!editForm.isRequired}
                    onChange={() => setEditForm({ ...editForm, isRequired: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-theme-text-primary">{t('common.optional')}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.displayOrder')}
              </label>
              <input
                type="number"
                value={editForm.displayOrder}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })
                }
                min="0"
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.labelKey')}
              </label>
              <input
                type="text"
                value={editForm.labelKey}
                onChange={(e) => setEditForm({ ...editForm, labelKey: e.target.value })}
                placeholder="e.g., consent.terms.label"
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('services.descriptionKey')}
              </label>
              <input
                type="text"
                value={editForm.descriptionKey}
                onChange={(e) => setEditForm({ ...editForm, descriptionKey: e.target.value })}
                placeholder="e.g., consent.terms.description"
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editForm.labelKey || !editForm.descriptionKey}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{t('common.save')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Consent Requirements Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('services.country')}</th>
              <th>{t('services.consentType')}</th>
              <th>{t('services.documentType')}</th>
              <th>{t('services.required')}</th>
              <th>{t('services.order')}</th>
              <th>{t('services.labelKey')}</th>
              {canEdit && <th className="text-right">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) =>
              editingId === req.id ? (
                <tr key={req.id} className="bg-theme-bg-secondary">
                  <td>
                    <code className="px-2 py-1 bg-theme-bg-page rounded text-sm">
                      {req.countryCode}
                    </code>
                  </td>
                  <td>
                    <code className="px-2 py-1 bg-theme-bg-page rounded text-sm">
                      {req.consentType}
                    </code>
                  </td>
                  <td>
                    <select
                      value={editForm.documentType}
                      onChange={(e) => setEditForm({ ...editForm, documentType: e.target.value })}
                      className="px-2 py-1 border border-theme-border-default rounded bg-theme-bg-card text-theme-text-primary text-sm"
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          checked={editForm.isRequired}
                          onChange={() => setEditForm({ ...editForm, isRequired: true })}
                          className="w-3 h-3"
                        />
                        <span className="text-sm">{t('common.yes')}</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          checked={!editForm.isRequired}
                          onChange={() => setEditForm({ ...editForm, isRequired: false })}
                          className="w-3 h-3"
                        />
                        <span className="text-sm">{t('common.no')}</span>
                      </label>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editForm.displayOrder}
                      onChange={(e) =>
                        setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })
                      }
                      min="0"
                      className="w-16 px-2 py-1 border border-theme-border-default rounded bg-theme-bg-card text-theme-text-primary text-sm"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editForm.labelKey}
                      onChange={(e) => setEditForm({ ...editForm, labelKey: e.target.value })}
                      className="w-full px-2 py-1 border border-theme-border-default rounded bg-theme-bg-card text-theme-text-primary text-sm"
                    />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 hover:bg-theme-bg-page rounded transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                      >
                        {saving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={req.id}>
                  <td>
                    <code className="px-2 py-1 bg-theme-bg-secondary rounded text-sm">
                      {req.countryCode}
                    </code>
                  </td>
                  <td>
                    <span className="text-theme-text-primary">
                      {req.consentType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="text-theme-text-secondary text-sm">
                      {req.documentType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {req.isRequired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        <CheckCircle size={14} />
                        {t('common.required')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        <XCircle size={14} />
                        {t('common.optional')}
                      </span>
                    )}
                  </td>
                  <td className="text-theme-text-secondary">{req.displayOrder}</td>
                  <td>
                    <code className="px-2 py-1 bg-theme-bg-secondary rounded text-xs">
                      {req.labelKey}
                    </code>
                  </td>
                  {canEdit && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEdit(req)}
                          className="p-1.5 hover:bg-theme-bg-secondary rounded transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ),
            )}
            {requirements.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 7 : 6}
                  className="text-center py-8 text-theme-text-secondary"
                >
                  {t('services.noConsents')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
