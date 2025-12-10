import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../api/userPreferences';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { preferences, loadPreferences, setTheme } =
    useUserPreferencesStore();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const currentTheme = preferences?.theme || Theme.LIGHT;

  const handleToggle = async () => {
    const newTheme =
      currentTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    try {
      await setTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          {t('settings.darkMode')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          {t('settings.themeDescription')}
        </p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          currentTheme === Theme.DARK
            ? 'bg-amber-600 dark:bg-amber-500'
            : 'bg-gray-300 dark:bg-dark-border-default'
        }`}
        aria-label="Toggle theme"
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform ${
            currentTheme === Theme.DARK
              ? 'translate-x-7'
              : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
