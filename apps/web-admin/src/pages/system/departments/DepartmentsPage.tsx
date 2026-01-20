import { useTranslation } from 'react-i18next';
import { Building2, Users, Plus } from 'lucide-react';

export default function DepartmentsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('departments.title', 'Departments')}
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t('departments.description', 'Manage organizational departments and their members')}
          </p>
        </div>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          disabled
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('departments.create', 'Create Department')}
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('departments.empty.title', 'No departments')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t(
              'departments.empty.description',
              'Get started by creating a new department for your organization.',
            )}
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('departments.create', 'Create Department')}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t('departments.info.title', 'Department Management')}
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                {t(
                  'departments.info.description',
                  'Departments allow you to organize administrators into hierarchical groups. You can assign department heads, managers, and members, and grant permissions at the department level.',
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
