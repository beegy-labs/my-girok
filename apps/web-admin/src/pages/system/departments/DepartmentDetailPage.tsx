import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Building2, ArrowLeft, Users, UserCog, Shield } from 'lucide-react';

export default function DepartmentDetailPage() {
  const { id: _id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/system/departments')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            {t('departments.detail.title', 'Department Details')}
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t('departments.detail.description', 'View and manage department information')}
          </p>
        </div>
      </div>

      {/* Department Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('departments.detail.info', 'Department Information')}
          </h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('departments.name', 'Department Name')}
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {t('departments.loading', 'Loading...')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('departments.description', 'Description')}
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {t('departments.loading', 'Loading...')}
            </p>
          </div>
        </div>
      </div>

      {/* Department Head */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('departments.head.title', 'Department Head')}
          </h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('departments.head.empty', 'No department head assigned')}
          </p>
        </div>
      </div>

      {/* Managers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            {t('departments.managers.title', 'Managers')}
          </h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('departments.managers.empty', 'No managers assigned')}
          </p>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('departments.members.title', 'Members')}
          </h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('departments.members.empty', 'No members assigned')}
          </p>
        </div>
      </div>
    </div>
  );
}
