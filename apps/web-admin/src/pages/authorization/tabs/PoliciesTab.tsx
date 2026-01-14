import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Save,
  Check,
  X,
  Loader2,
  History,
  Eye,
  RotateCcw,
  AlertCircle,
  Upload,
  Download,
} from 'lucide-react';
import { authorizationApi, type AuthorizationModel } from '../../../api/authorization';
import { Card } from '../../../components/atoms/Card';
import { ModelDiff } from '../../../components/ModelDiff';
import { MonacoDiffViewer } from '../../../components/MonacoDiffViewer';
import { ModelExport } from '../../../components/ModelExport';
import { ModelImport } from '../../../components/ModelImport';
import { Modal } from '../../../components/molecules/Modal';
import { useApiError } from '../../../hooks/useApiError';
import { useApiMutation } from '../../../hooks/useApiMutation';

export default function PoliciesTab() {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<AuthorizationModel[]>([]);
  const [activeModel, setActiveModel] = useState<AuthorizationModel | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
  } | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<AuthorizationModel | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffMode, setDiffMode] = useState<'simple' | 'monaco'>('simple');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingVersion, setExportingVersion] = useState<AuthorizationModel | null>(null);
  const [versionNotes, setVersionNotes] = useState('');

  const { executeWithErrorHandling } = useApiError({
    context: 'PoliciesTab.fetchModel',
  });

  const fetchModel = useCallback(async () => {
    setLoading(true);
    const result = await executeWithErrorHandling(async () => {
      const [active, modelVersions] = await Promise.all([
        authorizationApi.getModel(),
        authorizationApi.getModelVersions(),
      ]);
      return { active, modelVersions };
    });

    if (result) {
      setActiveModel(result.active);
      setVersions(result.modelVersions);
      setContent(result.active.content);
    }
    setLoading(false);
  }, [executeWithErrorHandling]);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  const { mutate: validateModel } = useApiMutation({
    mutationFn: () => authorizationApi.validateModel(content),
    context: 'PoliciesTab.validateModel',
    showErrorToast: true,
    onSuccess: (result) => {
      setValidationResult(result);
    },
  });

  const handleValidate = useCallback(() => {
    validateModel();
  }, [validateModel]);

  const { mutate: saveModel, isLoading: isSaving } = useApiMutation({
    mutationFn: () => authorizationApi.createModel(content, versionNotes || undefined),
    context: 'PoliciesTab.saveModel',
    successToast: t('authorization.modelSavedSuccess', 'Model saved successfully'),
    onSuccess: () => {
      fetchModel();
      setValidationResult(null);
      setVersionNotes(''); // Clear notes after successful save
    },
  });

  const handleSave = useCallback(() => {
    saveModel();
  }, [saveModel]);

  const { mutate: activateModel } = useApiMutation({
    mutationFn: (modelId: string) => authorizationApi.activateModel(modelId),
    context: 'PoliciesTab.activateModel',
    successToast: t('authorization.modelActivatedSuccess', 'Model activated successfully'),
    onSuccess: () => {
      fetchModel();
      setSelectedVersion(null);
      setShowDiff(false);
    },
  });

  const handleActivate = useCallback(
    (modelId: string) => {
      if (
        !confirm(
          t(
            'authorization.confirmActivate',
            'Are you sure you want to activate this model version?',
          ),
        )
      ) {
        return;
      }

      activateModel(modelId);
    },
    [t, activateModel],
  );

  const handleViewDiff = useCallback((version: AuthorizationModel) => {
    setSelectedVersion(version);
    setShowDiff(true);
  }, []);

  const handleRollback = useCallback(
    (version: AuthorizationModel) => {
      if (
        !confirm(
          t(
            'authorization.confirmRollback',
            `Are you sure you want to rollback to version ${version.version}? This will activate the selected version.`,
          ),
        )
      ) {
        return;
      }

      handleActivate(version.id);
    },
    [t, handleActivate],
  );

  const handleExport = useCallback((version: AuthorizationModel) => {
    setExportingVersion(version);
    setShowExportModal(true);
  }, []);

  const handleImportComplete = useCallback(() => {
    setShowImportModal(false);
    fetchModel();
  }, [fetchModel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diff Viewer Modal */}
      {showDiff && selectedVersion && activeModel && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text-primary">
              {t('authorization.comparingVersions', 'Comparing Versions')}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-theme-background-secondary rounded-lg border border-theme-border-default">
                <button
                  onClick={() => setDiffMode('simple')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    diffMode === 'simple'
                      ? 'bg-primary-600 text-white'
                      : 'text-theme-text-secondary hover:text-theme-text-primary'
                  }`}
                >
                  {t('authorization.simpleDiff', 'Simple')}
                </button>
                <button
                  onClick={() => setDiffMode('monaco')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    diffMode === 'monaco'
                      ? 'bg-primary-600 text-white'
                      : 'text-theme-text-secondary hover:text-theme-text-primary'
                  }`}
                >
                  {t('authorization.sideBySide', 'Side-by-Side')}
                </button>
              </div>
              <button
                onClick={() => handleRollback(selectedVersion)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-theme-status-warning-background text-theme-status-warning-text rounded-lg hover:opacity-80 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('authorization.rollback', 'Rollback to this version')}
              </button>
              <button
                onClick={() => setShowDiff(false)}
                className="px-3 py-2 text-sm border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mb-4 p-3 bg-theme-background-secondary rounded-lg border border-theme-border-default">
            <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
              <AlertCircle className="w-4 h-4" />
              <span>
                {t(
                  'authorization.rollbackWarning',
                  'Rolling back will activate the selected version as the new active model.',
                )}
              </span>
            </div>
          </div>

          {diffMode === 'simple' ? (
            <ModelDiff
              oldContent={selectedVersion.content}
              newContent={activeModel.content}
              oldLabel={`v${selectedVersion.version} (${new Date(selectedVersion.createdAt).toLocaleString()})`}
              newLabel={`v${activeModel.version} - Active (${new Date(activeModel.createdAt).toLocaleString()})`}
            />
          ) : (
            <MonacoDiffViewer
              oldContent={selectedVersion.content}
              newContent={activeModel.content}
              oldLabel={`v${selectedVersion.version} (${new Date(selectedVersion.createdAt).toLocaleString()})`}
              newLabel={`v${activeModel.version} - Active (${new Date(activeModel.createdAt).toLocaleString()})`}
              height="600px"
            />
          )}
        </Card>
      )}

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
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {t('authorization.import', 'Import')}
                </button>
                <button
                  onClick={handleValidate}
                  className="px-3 py-2 text-sm border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
                >
                  {t('authorization.validate', 'Validate')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || (validationResult !== null && !validationResult.valid)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                </button>
              </div>

              {/* Version Notes Input */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-theme-text-primary mb-2">
                  {t('authorization.versionNotes', 'Version Notes (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder={t(
                    'authorization.versionNotesPlaceholder',
                    'e.g., Added team permissions for QA environment',
                  )}
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
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
                        : 'border-theme-border-default'
                    }`}
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
                    <div className="text-xs text-theme-text-tertiary mb-2">
                      {t('common.by', 'By')}: {version.createdBy}
                    </div>
                    {version.notes && (
                      <div className="text-xs text-theme-text-secondary mt-2 italic border-l-2 border-theme-border-default pl-2">
                        "{version.notes}"
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleExport(version)}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-theme-border-default rounded hover:bg-theme-bg-secondary transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {t('authorization.export', 'Export')}
                      </button>
                      {!version.isActive && activeModel && (
                        <>
                          <button
                            onClick={() => handleViewDiff(version)}
                            className="flex items-center gap-1 px-2 py-1 text-xs border border-theme-border-default rounded hover:bg-theme-bg-secondary transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            {t('authorization.viewDiff', 'View Diff')}
                          </button>
                          <button
                            onClick={() => handleActivate(version.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                          >
                            {t('authorization.activate', 'Activate')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={t('authorization.import', 'Import Model')}
      >
        <ModelImport onImported={handleImportComplete} onClose={() => setShowImportModal(false)} />
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={
          exportingVersion
            ? `${t('authorization.export', 'Export')} v${exportingVersion.version}`
            : t('authorization.export', 'Export')
        }
      >
        {exportingVersion && (
          <ModelExport
            modelId={exportingVersion.id}
            version={exportingVersion.version}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}
