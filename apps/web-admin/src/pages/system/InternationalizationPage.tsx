import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Languages } from 'lucide-react';
import SupportedCountriesTab from './SupportedCountriesTab';
import SupportedLocalesTab from './SupportedLocalesTab';

type TabType = 'countries' | 'locales';

export default function InternationalizationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('countries');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'countries', label: t('settings.countriesTab'), icon: <Globe size={18} /> },
    { id: 'locales', label: t('settings.localesTab'), icon: <Languages size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text-primary">
          {t('settings.internationalizationTitle')}
        </h1>
        <p className="text-theme-text-secondary mt-1">
          {t('settings.internationalizationDescription')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-theme-border-default">
        <nav className="flex gap-4">
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
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'countries' && <SupportedCountriesTab />}
        {activeTab === 'locales' && <SupportedLocalesTab />}
      </div>
    </div>
  );
}
