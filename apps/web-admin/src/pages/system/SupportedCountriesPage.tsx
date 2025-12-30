import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import {
  Globe,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  CheckCircle,
  XCircle,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import {
  globalSettingsApi,
  SupportedCountry,
  CreateSupportedCountryDto,
} from '../../api/globalSettings';
import { useAdminAuthStore } from '../../stores/adminAuthStore';

export default function SupportedCountriesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('settings:update');

  const [countries, setCountries] = useState<SupportedCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSupportedCountryDto>({
    code: '',
    name: '',
    nativeName: '',
    flagEmoji: '',
    isActive: true,
    displayOrder: 0,
  });

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await globalSettingsApi.listCountries();
      setCountries(result.data);
    } catch (err) {
      setError(t('settings.loadCountriesFailed'));
      logger.error('Failed to fetch supported countries', err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const handleAdd = async () => {
    if (!formData.code || !formData.name) return;

    setSaving(true);
    setError(null);

    try {
      await globalSettingsApi.createCountry({
        ...formData,
        code: formData.code.toUpperCase(),
      });
      setShowAddForm(false);
      setFormData({
        code: '',
        name: '',
        nativeName: '',
        flagEmoji: '',
        isActive: true,
        displayOrder: 0,
      });
      fetchCountries();
    } catch (err) {
      setError(t('settings.saveCountryFailed'));
      logger.error('Failed to create country', { code: formData.code, error: err });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (code: string) => {
    setSaving(true);
    setError(null);

    try {
      await globalSettingsApi.updateCountry(code, {
        name: formData.name,
        nativeName: formData.nativeName || undefined,
        flagEmoji: formData.flagEmoji || undefined,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
      });
      setEditingCode(null);
      fetchCountries();
    } catch (err) {
      setError(t('settings.saveCountryFailed'));
      logger.error('Failed to update country', { code, error: err });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(t('settings.deleteCountryConfirm'))) return;

    setSaving(true);
    setError(null);

    try {
      await globalSettingsApi.deleteCountry(code);
      fetchCountries();
    } catch (err) {
      setError(t('settings.deleteCountryFailed'));
      logger.error('Failed to delete country', { code, error: err });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (country: SupportedCountry) => {
    setSaving(true);
    setError(null);

    try {
      await globalSettingsApi.updateCountry(country.code, {
        isActive: !country.isActive,
      });
      fetchCountries();
    } catch (err) {
      setError(t('settings.saveCountryFailed'));
      logger.error('Failed to toggle country status', { code: country.code, error: err });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (country: SupportedCountry) => {
    setEditingCode(country.code);
    setFormData({
      code: country.code,
      name: country.name,
      nativeName: country.nativeName || '',
      flagEmoji: country.flagEmoji || '',
      isActive: country.isActive,
      displayOrder: country.displayOrder,
    });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {t('settings.supportedCountriesTitle')}
          </h1>
          <p className="text-theme-text-secondary mt-1">
            {t('settings.supportedCountriesDescription')}
          </p>
        </div>
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90"
          >
            <Plus size={16} />
            <span>{t('settings.addCountry')}</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('settings.addNewCountry')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('settings.countryCode')} *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="KR"
                maxLength={2}
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('settings.countryName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="South Korea"
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('settings.nativeName')}
              </label>
              <input
                type="text"
                value={formData.nativeName}
                onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
                placeholder="대한민국"
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('settings.flagEmoji')}
              </label>
              <input
                type="text"
                value={formData.flagEmoji}
                onChange={(e) => setFormData({ ...formData, flagEmoji: e.target.value })}
                placeholder="🇰🇷"
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                {t('settings.displayOrder')}
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
                min={0}
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-theme-text-secondary hover:text-theme-text-primary"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleAdd}
              disabled={!formData.code || !formData.name || saving}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{t('common.save')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Countries List */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-theme-bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                {t('settings.countryCode')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                {t('settings.countryName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-theme-text-secondary">
                {t('settings.nativeName')}
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-theme-text-secondary">
                {t('common.status')}
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-theme-text-secondary">
                {t('settings.displayOrder')}
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-right text-sm font-medium text-theme-text-secondary">
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-default">
            {countries.map((country) => (
              <tr key={country.id} className="hover:bg-theme-bg-secondary/50">
                {editingCode === country.code ? (
                  <>
                    <td className="px-4 py-3">
                      <span className="font-mono text-theme-text-primary">{country.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-2 py-1 bg-theme-bg-secondary border border-theme-border-default rounded text-theme-text-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.nativeName}
                        onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
                        className="w-full px-2 py-1 bg-theme-bg-secondary border border-theme-border-default rounded text-theme-text-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          formData.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formData.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {formData.isActive ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) =>
                          setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                        }
                        min={0}
                        className="w-16 px-2 py-1 bg-theme-bg-secondary border border-theme-border-default rounded text-center text-theme-text-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingCode(null)}
                          className="p-1 text-theme-text-tertiary hover:text-theme-text-primary"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => handleUpdate(country.code)}
                          disabled={saving}
                          className="p-1 text-theme-primary hover:opacity-80"
                        >
                          {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{country.flagEmoji}</span>
                        <span className="font-mono text-theme-text-primary">{country.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-text-primary">{country.name}</td>
                    <td className="px-4 py-3 text-theme-text-secondary">{country.nativeName}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => canEdit && handleToggleActive(country)}
                        disabled={!canEdit || saving}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          country.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        } ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      >
                        {country.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {country.isActive ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-theme-text-secondary">
                      {country.displayOrder}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditing(country)}
                            className="p-1 text-theme-text-tertiary hover:text-theme-primary"
                            title={t('common.edit')}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(country.code)}
                            disabled={saving}
                            className="p-1 text-theme-text-tertiary hover:text-theme-status-error-text"
                            title={t('common.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {countries.length === 0 && (
          <div className="text-center py-12 text-theme-text-secondary">
            <Globe size={48} className="mx-auto mb-4 text-theme-text-tertiary" />
            <p>{t('settings.noCountries')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
