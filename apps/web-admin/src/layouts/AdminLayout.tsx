import { Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LogOut, ChevronDown, Sun, Moon, Menu, X, Globe } from 'lucide-react';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { useTheme } from '../contexts/ThemeContext';
import { authApi } from '../api';
import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useMenuStore } from '../stores/menuStore';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { admin, clearAuth, refreshToken } = useAdminAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { isMobileOpen, setMobileOpen } = useMenuStore();

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setShowLangMenu(false);
  };

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="flex h-screen bg-theme-bg-page">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-theme-bg-card border-r border-theme-border flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-theme-border">
          <span className="text-xl font-bold text-theme-text-primary">Girok Admin</span>
          <button
            className="lg:hidden p-1 rounded hover:bg-theme-bg-secondary"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-theme-bg-card border-b border-theme-border flex items-center justify-between px-6">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-theme-bg-secondary transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-4">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-theme-bg-secondary transition-colors"
                aria-label="Change language"
              >
                <Globe size={18} />
                <span className="hidden sm:inline text-sm">{currentLang.flag}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-theme-bg-card border border-theme-border rounded-lg shadow-lg py-1 z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-theme-bg-secondary transition-colors ${
                        i18n.language === lang.code
                          ? 'text-theme-primary font-medium'
                          : 'text-theme-text-primary'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-theme-bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-theme-bg-secondary transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-theme-primary">
                    {admin?.name?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-theme-text-primary">{admin?.name}</div>
                  <div className="text-xs text-theme-text-tertiary">{admin?.roleName}</div>
                </div>
                <ChevronDown size={16} className="text-theme-text-tertiary" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-theme-bg-card border border-theme-border rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-theme-border">
                    <div className="text-sm text-theme-text-secondary">{admin?.email}</div>
                    <div className="text-xs text-theme-text-tertiary">
                      {admin?.scope === 'SYSTEM' ? 'System Admin' : admin?.tenantSlug}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-theme-error hover:bg-theme-bg-secondary transition-colors"
                  >
                    <LogOut size={16} />
                    <span>{t('auth.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
