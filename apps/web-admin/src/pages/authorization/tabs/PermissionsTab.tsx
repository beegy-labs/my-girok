import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Play } from 'lucide-react';
import { authorizationApi, type PermissionCheckResponse } from '../../../api/authorization';
import { Card } from '../../../components/atoms/Card';
import { useApiMutation } from '../../../hooks/useApiMutation';

export default function PermissionsTab() {
  const { t } = useTranslation();
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');
  const [result, setResult] = useState<PermissionCheckResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate: checkPermission, isLoading: loading } = useApiMutation({
    mutationFn: () => authorizationApi.check({ user, relation, object }),
    context: 'PermissionsTab.checkPermission',
    showErrorToast: true,
    onSuccess: (response) => {
      setResult(response);
      setValidationError(null);
    },
  });

  const handleCheck = () => {
    if (!user || !relation || !object) {
      setValidationError(t('authorization.fillAllFields', 'Please fill all fields'));
      return;
    }

    setValidationError(null);
    checkPermission();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
          {t('authorization.permissionTester', 'Permission Tester')}
        </h3>
        <p className="text-sm text-theme-text-tertiary mb-6">
          {t(
            'authorization.permissionTesterDesc',
            'Test permission checks against the active authorization model',
          )}
        </p>

        <div className="space-y-4">
          {/* User */}
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              {t('authorization.user', 'User')}
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="user:alice"
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-theme-text-tertiary">
              {t('authorization.userHelp', 'Format: type:id (e.g., user:123, team:admins)')}
            </p>
          </div>

          {/* Relation */}
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              {t('authorization.relation', 'Relation')}
            </label>
            <input
              type="text"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="view"
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-theme-text-tertiary">
              {t('authorization.relationHelp', 'Permission relation (e.g., view, edit, delete)')}
            </p>
          </div>

          {/* Object */}
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              {t('authorization.object', 'Object')}
            </label>
            <input
              type="text"
              value={object}
              onChange={(e) => setObject(e.target.value)}
              placeholder="document:report-123"
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-theme-text-tertiary">
              {t('authorization.objectHelp', 'Format: type:id (e.g., document:123, project:456)')}
            </p>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg text-sm">
              {validationError}
            </div>
          )}

          {/* Check Button */}
          <button
            onClick={handleCheck}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Play className="w-4 h-4" />
            {loading
              ? t('authorization.checking', 'Checking...')
              : t('authorization.checkPermission', 'Check Permission')}
          </button>
        </div>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <div className="flex items-start gap-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                result.allowed
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {result.allowed ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-theme-text-primary mb-2">
                {result.allowed
                  ? t('authorization.permissionGranted', 'Permission Granted')
                  : t('authorization.permissionDenied', 'Permission Denied')}
              </h4>
              <div className="space-y-1 text-sm text-theme-text-secondary">
                <div>
                  <span className="font-medium">{t('authorization.user', 'User')}:</span>{' '}
                  <code className="px-2 py-0.5 bg-theme-bg-secondary rounded">{result.user}</code>
                </div>
                <div>
                  <span className="font-medium">{t('authorization.relation', 'Relation')}:</span>{' '}
                  <code className="px-2 py-0.5 bg-theme-bg-secondary rounded">
                    {result.relation}
                  </code>
                </div>
                <div>
                  <span className="font-medium">{t('authorization.object', 'Object')}:</span>{' '}
                  <code className="px-2 py-0.5 bg-theme-bg-secondary rounded">{result.object}</code>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
