import { useEffect } from 'react';
import { Theme } from '../../api/userPreferences';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';

export default function ThemeToggle() {
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
        <h3 className="text-lg font-semibold text-gray-900">
          다크 모드
        </h3>
        <p className="text-sm text-gray-600">
          화면 테마를 설정합니다
        </p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          currentTheme === Theme.DARK
            ? 'bg-amber-600'
            : 'bg-gray-300'
        }`}
        aria-label="Toggle theme"
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            currentTheme === Theme.DARK
              ? 'translate-x-7'
              : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
