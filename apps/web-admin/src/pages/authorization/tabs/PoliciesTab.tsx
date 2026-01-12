import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Check, X, Loader2, History } from 'lucide-react';
import { authorizationApi, type AuthorizationModel } from '../../../api/authorization';
import { Card } from '../../../components/atoms/Card';

export default function PoliciesTab() {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<AuthorizationModel[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
  } | null>(null);

  const fetchModel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeModel, modelVersions] = await Promise.all([
        authorizationApi.getModel(),
        authorizationApi.getModelVersions(),
      ]);
      setVersions(modelVersions);
      setContent(activeModel.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch model');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  const handleValidate = async () => {
    try {
      const result = await authorizationApi.validateModel(content);
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await authorizationApi.createModel(content);
      await fetchModel();
      setValidationResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (modelId: string) => {
    if (
      !confirm(
        t('authorization.confirmActivate', 'Are you sure you want to activate this model version?'),
      )
    ) {
      return;
    }

    try {
      await authorizationApi.activateModel(modelId);
      await fetchModel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate model');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text-primary">
              {t('authorization.policyEditor', 'Policy Editor')}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleValidate}
                className="px-3 py-2 text-sm border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                {t('authorization.validate', 'Validate')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (validationResult !== null && !validationResult.valid)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </button>
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
                validationResult.valid
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {validationResult.valid ? (
                <>
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('authorization.validationSuccess', 'Model is valid')}
                  </span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium mb-1">
                      {t('authorization.validationError', 'Validation errors:')}
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.errors?.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
              {error}
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 px-3 py-2 font-mono text-sm border border-theme-border-default rounded-lg bg-theme-bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder={t(
              'authorization.policyPlaceholder',
              'Enter your authorization policy in DSL format...',
            )}
          />
          <p className="mt-2 text-xs text-theme-text-tertiary">
            {t(
              'authorization.policyHelp',
              'Define authorization rules using the policy DSL syntax',
            )}
          </p>
        </Card>
      </div>

      {/* Versions */}
      <div>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-theme-text-tertiary" />
            <h3 className="text-lg font-semibold text-theme-text-primary">
              {t('authorization.versions', 'Versions')}
            </h3>
          </div>
          <div className="space-y-2">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-theme-text-tertiary text-sm">
                {t('authorization.noVersions', 'No versions available')}
              </div>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    version.isActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-theme-border-default hover:bg-theme-bg-secondary cursor-pointer'
                  }`}
                  onClick={() => !version.isActive && handleActivate(version.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-theme-text-primary">
                      v{version.version}
                    </span>
                    {version.isActive && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                        {t('authorization.active', 'Active')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-theme-text-tertiary">
                    {new Date(version.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-theme-text-tertiary">
                    {t('common.by', 'By')}: {version.createdBy}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
