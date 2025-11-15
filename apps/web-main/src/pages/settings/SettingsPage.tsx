import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../../components/settings/ThemeToggle';
import SectionOrderManager from '../../components/settings/SectionOrderManager';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-800 mb-4"
          >
            {t('settings.backButton')}
          </Link>
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            {t('settings.title')}
          </h1>
          <p className="text-gray-700">
            {t('settings.description')}
          </p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="bg-white border border-amber-100 rounded-2xl shadow-md p-6">
            <ThemeToggle />
          </div>

          {/* Section Order Settings */}
          <div className="bg-white border border-amber-100 rounded-2xl shadow-md p-6">
            <SectionOrderManager />
          </div>
        </div>
      </div>
    </div>
  );
}
