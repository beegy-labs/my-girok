import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Users, FileText, Key } from 'lucide-react';
import TeamsTab from './tabs/TeamsTab';
import PoliciesTab from './tabs/PoliciesTab';
import PermissionsTab from './tabs/PermissionsTab';

type TabType = 'teams' | 'policies' | 'permissions';

export default function AuthorizationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('teams');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'teams', label: t('authorization.teams', 'Teams'), icon: <Users size={18} /> },
    {
      id: 'policies',
      label: t('authorization.policies', 'Policies'),
      icon: <FileText size={18} />,
    },
    {
      id: 'permissions',
      label: t('authorization.permissions', 'Permissions'),
      icon: <Key size={18} />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {t('authorization.title', 'Authorization Management')}
          </h1>
        </div>
        <p className="text-sm text-theme-text-tertiary">
          {t('authorization.subtitle', 'Manage teams, policies, and permissions')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-theme-border-default">
        <nav className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary'
              }`}
            >
              {tab.icon}
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'teams' && <TeamsTab />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'permissions' && <PermissionsTab />}
      </div>
    </div>
  );
}
