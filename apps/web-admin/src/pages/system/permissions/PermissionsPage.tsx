import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Menu, BookTemplate } from 'lucide-react';

export default function PermissionsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('admins');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('permissions.title', 'Permission Management')}
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t(
              'permissions.description',
              'Manage permissions for administrators, teams, and menu access',
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('admins')}
            className={`${
              activeTab === 'admins'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Shield className="w-4 h-4" />
            {t('permissions.tabs.admins', 'Admin Permissions')}
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`${
              activeTab === 'teams'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Users className="w-4 h-4" />
            {t('permissions.tabs.teams', 'Team Permissions')}
          </button>
          <button
            onClick={() => setActiveTab('menus')}
            className={`${
              activeTab === 'menus'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Menu className="w-4 h-4" />
            {t('permissions.tabs.menus', 'Menu Permissions')}
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <BookTemplate className="w-4 h-4" />
            {t('permissions.tabs.templates', 'Templates')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'admins' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('permissions.admins.title', 'Administrator Permissions')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t(
                'permissions.admins.comingSoon',
                'Admin permissions management will be available soon. You can grant and revoke permissions for individual administrators.',
              )}
            </p>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('permissions.teams.title', 'Team Permissions')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t(
                'permissions.teams.comingSoon',
                'Team permissions management will be available soon. You can grant permissions to entire teams.',
              )}
            </p>
          </div>
        )}

        {activeTab === 'menus' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('permissions.menus.title', 'Menu Access Control')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t(
                'permissions.menus.comingSoon',
                'Menu access control will be available soon. You can control which users can see specific menu items.',
              )}
            </p>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('permissions.templates.title', 'Permission Templates')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t(
                'permissions.templates.description',
                'Use templates to quickly assign common permission sets to administrators.',
              )}
            </p>
            <div className="space-y-2">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Service Administrator</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full access to a specific service
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Service Operator</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Operational access to a specific service
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Audit Viewer</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Can view audit logs</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
