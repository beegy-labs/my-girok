import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Loader2, Globe, Languages, Sun, Moon } from 'lucide-react';
import { authApi, resetRedirectFlag } from '../api';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { REGIONS, type SupportedRegion } from '../config/region.config';
import { useApiMutation } from '../hooks/useApiMutation';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
] as const;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, setMfaChallenge, isAuthenticated } = useAdminAuthStore();
  const { isInitializing } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<SupportedRegion>(() => {
    const saved = localStorage.getItem('admin-region');
    return (saved as SupportedRegion) || 'KR';
  });

  const {
    mutate: login,
    isLoading,
    errorMessage,
  } = useApiMutation({
    mutationFn: authApi.login,
    context: 'LoginPage.login',
    showErrorToast: false, // Handle errors manually due to custom logic
    onSuccess: (response) => {
      // MFA required - redirect to MFA page
      if (response.mfaRequired && response.challengeId) {
        setMfaChallenge(response.challengeId, response.availableMethods || ['totp']);
        navigate('/login/mfa', {
          state: { from: location.state },
          replace: true,
        });
        return;
      }

      // Login complete
      if (response.admin) {
        resetRedirectFlag();
        setAuth(response.admin);
        const from = (location.state as { from?: Location })?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    },
  });

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('admin-language', langCode);
  };

  const handleRegionChange = (regionCode: SupportedRegion) => {
    setSelectedRegion(regionCode);
    localStorage.setItem('admin-region', regionCode);
  };

  // Redirect if already authenticated (but wait for initialization)
  if (!isInitializing && isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/';
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div className="min-h-screen bg-theme-bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-theme-text-primary">{t('auth.title')}</h1>
          <p className="mt-2 text-theme-text-secondary">{t('auth.subtitle')}</p>
        </div>

        {/* Login form */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-5 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg text-sm">
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-theme-text-primary mb-2"
              >
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-theme-primary"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-theme-text-primary mb-2"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-theme-primary"
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-btn-primary-from to-btn-primary-to text-btn-primary-text font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              <span>{isLoading ? t('auth.loginLoading') : t('auth.login')}</span>
            </button>
          </form>
        </div>

        {/* Language, Region & Theme Selectors */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {/* Language Selector */}
          <div className="relative">
            <div className="flex items-center gap-1 text-theme-text-tertiary">
              <Languages size={14} />
              <select
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="appearance-none bg-transparent text-xs sm:text-sm cursor-pointer hover:text-theme-text-secondary focus:outline-none pr-4"
                aria-label={t('common.selectLanguage')}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-theme-text-tertiary hidden sm:inline">|</span>

          {/* Region Selector */}
          <div className="relative">
            <div className="flex items-center gap-1 text-theme-text-tertiary">
              <Globe size={14} />
              <select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value as SupportedRegion)}
                className="appearance-none bg-transparent text-xs sm:text-sm cursor-pointer hover:text-theme-text-secondary focus:outline-none pr-4"
                aria-label={t('common.selectRegion')}
              >
                {REGIONS.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.flag} {t(region.nameKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-theme-text-tertiary hidden sm:inline">|</span>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1 text-theme-text-tertiary hover:text-theme-text-secondary transition-colors"
            aria-label={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span className="text-xs sm:text-sm">
              {resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            </span>
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-theme-text-tertiary">
          {t('auth.protectedArea')}
        </p>

        {/* Version */}
        <p className="mt-2 text-center text-xs text-theme-text-tertiary opacity-50">
          v{__BUILD_VERSION__}
        </p>
      </div>
    </div>
  );
}
