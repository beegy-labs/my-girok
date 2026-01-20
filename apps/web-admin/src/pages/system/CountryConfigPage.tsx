import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Save, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { countryConfigApi } from '../../api/countryConfig';
import type {
  CountryConfig,
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
} from '@my-girok/types';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { useApiError } from '../../hooks/useApiError';
import { useApiMutation } from '../../hooks/useApiMutation';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Card } from '../../components/atoms/Card';
import { CountrySelector } from '../../components/molecules/CountrySelector';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-theme-border rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-theme-bg-secondary hover:bg-theme-bg-tertiary transition-colors"
      >
        <h3 className="font-semibold text-theme-text-primary">{title}</h3>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function CountryConfigPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthStore();
  const canEdit = hasPermission('settings:update');

  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [config, setConfig] = useState<CountryConfig | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState<Partial<CreateCountryConfigDto>>({
    countryCode: '',
    countryName: '',
    countryNameNative: '',
    region: '',
    subregion: '',
    currencyCode: '',
    currencySymbol: '',
    defaultTimezone: '',
    timezones: [],
    standardWorkHoursPerWeek: 40,
    standardWorkDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    overtimeAllowed: false,
    maxOvertimeHoursPerWeek: 0,
    minAnnualLeaveDays: 0,
    statutorySickDays: 0,
    maternityLeaveWeeks: 0,
    paternityLeaveWeeks: 0,
    taxYearStartMonth: 1,
    taxIdFormat: '',
    dataPrivacyLaw: '',
    employmentLawNotes: '',
    isActive: true,
  });

  const [newTimezone, setNewTimezone] = useState('');

  const { executeWithErrorHandling } = useApiError({
    context: 'CountryConfigPage.loadConfig',
    retry: true,
  });

  const loadConfig = useCallback(
    async (countryCode: string) => {
      const result = await executeWithErrorHandling(async () => {
        return await countryConfigApi.getByCode(countryCode);
      });

      if (result) {
        setConfig(result);
        setFormData(result);
      }
    },
    [executeWithErrorHandling],
  );

  const createMutation = useApiMutation({
    mutationFn: (data: CreateCountryConfigDto) => countryConfigApi.create(data),
    context: 'CountryConfigPage.create',
    onSuccess: (result) => {
      setShowAddForm(false);
      setSelectedCountryCode(result.countryCode);
      loadConfig(result.countryCode);
    },
  });

  const updateMutation = useApiMutation({
    mutationFn: ({ code, data }: { code: string; data: UpdateCountryConfigDto }) =>
      countryConfigApi.update(code, data),
    context: 'CountryConfigPage.update',
    onSuccess: () => {
      if (selectedCountryCode) {
        loadConfig(selectedCountryCode);
      }
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: (code: string) => countryConfigApi.delete(code),
    context: 'CountryConfigPage.delete',
    onSuccess: () => {
      setSelectedCountryCode(null);
      setConfig(null);
      setShowDeleteConfirm(false);
    },
  });

  useEffect(() => {
    if (selectedCountryCode && !showAddForm) {
      loadConfig(selectedCountryCode);
    }
  }, [selectedCountryCode, showAddForm, loadConfig]);

  const handleSave = () => {
    if (showAddForm) {
      createMutation.mutate(formData as CreateCountryConfigDto);
    } else if (selectedCountryCode) {
      updateMutation.mutate({
        code: selectedCountryCode,
        data: formData,
      });
    }
  };

  const handleDelete = () => {
    if (selectedCountryCode) {
      deleteMutation.mutate(selectedCountryCode);
    }
  };

  const handleAddTimezone = () => {
    if (newTimezone && !formData.timezones?.includes(newTimezone)) {
      setFormData({
        ...formData,
        timezones: [...(formData.timezones || []), newTimezone],
      });
      setNewTimezone('');
    }
  };

  const handleRemoveTimezone = (timezone: string) => {
    setFormData({
      ...formData,
      timezones: formData.timezones?.filter((tz) => tz !== timezone) || [],
    });
  };

  const handleWorkDayToggle = (day: string) => {
    const currentDays = formData.standardWorkDays || [];
    if (currentDays.includes(day)) {
      setFormData({
        ...formData,
        standardWorkDays: currentDays.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        standardWorkDays: [...currentDays, day],
      });
    }
  };

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="text-theme-primary" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-theme-text-primary">
              {t('countryConfig.title')}
            </h1>
            <p className="text-sm text-theme-text-secondary">{t('countryConfig.description')}</p>
          </div>
        </div>
        {canEdit && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus size={16} />
            {t('countryConfig.addCountry')}
          </Button>
        )}
      </div>

      <Card className="mb-6 p-4">
        <div className="flex items-center gap-4">
          {!showAddForm && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                {t('countryConfig.selectCountry')}
              </label>
              <CountrySelector
                value={selectedCountryCode}
                onChange={setSelectedCountryCode}
                activeOnly={false}
              />
            </div>
          )}
          {showAddForm && (
            <div className="flex-1">
              <p className="text-lg font-medium text-theme-text-primary">
                {t('countryConfig.addCountry')}
              </p>
            </div>
          )}
          {showAddForm && (
            <Button variant="secondary" onClick={() => setShowAddForm(false)} size="sm">
              <X size={16} />
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </Card>

      {(selectedCountryCode || showAddForm) && (
        <div className="space-y-4">
          {/* Basic Information */}
          <CollapsibleSection title={t('countryConfig.basicInfo')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.countryCode')} *
                </label>
                <Input
                  value={formData.countryCode}
                  onChange={(e) =>
                    setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })
                  }
                  disabled={!canEdit || (!showAddForm && !!selectedCountryCode)}
                  placeholder="US, KR, JP..."
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.countryName')} *
                </label>
                <Input
                  value={formData.countryName}
                  onChange={(e) => setFormData({ ...formData, countryName: e.target.value })}
                  disabled={!canEdit}
                  placeholder="United States"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.countryNameNative')}
                </label>
                <Input
                  value={formData.countryNameNative || ''}
                  onChange={(e) => setFormData({ ...formData, countryNameNative: e.target.value })}
                  disabled={!canEdit}
                  placeholder="한국, 日本..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.region')}
                </label>
                <Input
                  value={formData.region || ''}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Asia, Europe, Americas..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.subregion')}
                </label>
                <Input
                  value={formData.subregion || ''}
                  onChange={(e) => setFormData({ ...formData, subregion: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Eastern Asia, Southern Europe..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Currency */}
          <CollapsibleSection title={t('countryConfig.currency')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.currencyCode')} *
                </label>
                <Input
                  value={formData.currencyCode}
                  onChange={(e) =>
                    setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })
                  }
                  disabled={!canEdit}
                  placeholder="USD, KRW, JPY..."
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.currencySymbol')}
                </label>
                <Input
                  value={formData.currencySymbol || ''}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  disabled={!canEdit}
                  placeholder="$, ₩, ¥..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Timezone */}
          <CollapsibleSection title={t('countryConfig.timezone')}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.defaultTimezone')} *
                </label>
                <Input
                  value={formData.defaultTimezone}
                  onChange={(e) => setFormData({ ...formData, defaultTimezone: e.target.value })}
                  disabled={!canEdit}
                  placeholder="America/New_York, Asia/Seoul..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.timezones')}
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTimezone}
                    onChange={(e) => setNewTimezone(e.target.value)}
                    disabled={!canEdit}
                    placeholder="America/Los_Angeles..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTimezone()}
                  />
                  <Button onClick={handleAddTimezone} disabled={!canEdit || !newTimezone} size="sm">
                    <Plus size={16} />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.timezones?.map((tz) => (
                    <div
                      key={tz}
                      className="flex items-center justify-between p-2 bg-theme-bg-secondary rounded border border-theme-border"
                    >
                      <span className="text-sm">{tz}</span>
                      <button
                        onClick={() => handleRemoveTimezone(tz)}
                        disabled={!canEdit}
                        className="text-theme-text-tertiary hover:text-theme-error"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Employment */}
          <CollapsibleSection title={t('countryConfig.employment')}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                    {t('countryConfig.standardWorkHoursPerWeek')}
                  </label>
                  <Input
                    type="number"
                    value={formData.standardWorkHoursPerWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, standardWorkHoursPerWeek: Number(e.target.value) })
                    }
                    disabled={!canEdit}
                    min="0"
                    max="168"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.overtimeAllowed}
                      onChange={(e) =>
                        setFormData({ ...formData, overtimeAllowed: e.target.checked })
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-sm font-medium text-theme-text-secondary">
                      {t('countryConfig.overtimeAllowed')}
                    </span>
                  </label>
                </div>
              </div>

              {formData.overtimeAllowed && (
                <div>
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                    {t('countryConfig.maxOvertimeHoursPerWeek')}
                  </label>
                  <Input
                    type="number"
                    value={formData.maxOvertimeHoursPerWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, maxOvertimeHoursPerWeek: Number(e.target.value) })
                    }
                    disabled={!canEdit}
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.standardWorkDays')}
                </label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => handleWorkDayToggle(day)}
                      disabled={!canEdit}
                      className={`p-2 rounded border text-sm ${
                        formData.standardWorkDays?.includes(day)
                          ? 'bg-theme-primary text-white border-theme-primary'
                          : 'bg-theme-bg-secondary border-theme-border'
                      } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-primary/80'}`}
                    >
                      {t(`countryConfig.workDays.${day}`).slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Leave Policies */}
          <CollapsibleSection title={t('countryConfig.leave')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.minAnnualLeaveDays')}
                </label>
                <Input
                  type="number"
                  value={formData.minAnnualLeaveDays}
                  onChange={(e) =>
                    setFormData({ ...formData, minAnnualLeaveDays: Number(e.target.value) })
                  }
                  disabled={!canEdit}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.statutorySickDays')}
                </label>
                <Input
                  type="number"
                  value={formData.statutorySickDays}
                  onChange={(e) =>
                    setFormData({ ...formData, statutorySickDays: Number(e.target.value) })
                  }
                  disabled={!canEdit}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.maternityLeaveWeeks')}
                </label>
                <Input
                  type="number"
                  value={formData.maternityLeaveWeeks}
                  onChange={(e) =>
                    setFormData({ ...formData, maternityLeaveWeeks: Number(e.target.value) })
                  }
                  disabled={!canEdit}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.paternityLeaveWeeks')}
                </label>
                <Input
                  type="number"
                  value={formData.paternityLeaveWeeks}
                  onChange={(e) =>
                    setFormData({ ...formData, paternityLeaveWeeks: Number(e.target.value) })
                  }
                  disabled={!canEdit}
                  min="0"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Tax Settings */}
          <CollapsibleSection title={t('countryConfig.tax')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.taxYearStartMonth')}
                </label>
                <select
                  value={formData.taxYearStartMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, taxYearStartMonth: Number(e.target.value) })
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {t(
                        `countryConfig.months.${new Date(2000, month - 1).toLocaleString('en', { month: 'long' }).toLowerCase()}`,
                      )}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.taxIdFormat')}
                </label>
                <Input
                  value={formData.taxIdFormat || ''}
                  onChange={(e) => setFormData({ ...formData, taxIdFormat: e.target.value })}
                  disabled={!canEdit}
                  placeholder="XXX-XX-XXXX..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Compliance */}
          <CollapsibleSection title={t('countryConfig.compliance')}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.dataPrivacyLaw')}
                </label>
                <Input
                  value={formData.dataPrivacyLaw || ''}
                  onChange={(e) => setFormData({ ...formData, dataPrivacyLaw: e.target.value })}
                  disabled={!canEdit}
                  placeholder="GDPR, CCPA, PIPA..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  {t('countryConfig.employmentLawNotes')}
                </label>
                <textarea
                  value={formData.employmentLawNotes || ''}
                  onChange={(e) => setFormData({ ...formData, employmentLawNotes: e.target.value })}
                  disabled={!canEdit}
                  className="w-full p-2 border border-theme-border rounded bg-theme-bg-primary text-theme-text-primary"
                  rows={4}
                  placeholder="Employment law notes and compliance requirements..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    disabled={!canEdit}
                  />
                  <span className="text-sm font-medium text-theme-text-secondary">
                    {t('countryConfig.isActive')}
                  </span>
                </label>
              </div>
            </div>
          </CollapsibleSection>

          {/* Action Buttons */}
          {canEdit && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {!showAddForm && selectedCountryCode && (
                    <Button
                      variant="danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleteMutation.isLoading}
                    >
                      <Trash2 size={16} />
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (showAddForm) {
                        setShowAddForm(false);
                      } else if (config) {
                        setFormData(config);
                      }
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      createMutation.isLoading ||
                      updateMutation.isLoading ||
                      !formData.countryCode ||
                      !formData.countryName ||
                      !formData.currencyCode ||
                      !formData.defaultTimezone
                    }
                  >
                    <Save size={16} />
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {!selectedCountryCode && !showAddForm && (
        <Card className="p-8 text-center">
          <Globe className="mx-auto mb-4 text-theme-text-tertiary" size={48} />
          <p className="text-theme-text-secondary">{t('countryConfig.selectCountry')}</p>
        </Card>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('countryConfig.deleteConfirm')}
        message={t('countryConfig.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </div>
  );
}
