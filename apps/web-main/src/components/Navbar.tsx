import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../hooks/useTheme';
import { useClickOutside } from '@my-girok/ui-components';
import { Sun, Moon, KeyRound, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { effectiveTheme, toggleTheme } = useTheme();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [navigate]);

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleLogoutClick = useCallback(() => {
    handleCloseDropdown();
    handleLogout();
  }, [handleCloseDropdown, handleLogout]);

  // Close dropdown when clicking outside or pressing Escape
  useClickOutside(dropdownRef, isDropdownOpen, handleCloseDropdown);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-theme-bg-card/95 backdrop-blur-xl border-b border-theme-border-default transition-colors duration-200 h-nav"
      role="navigation"
      aria-label={t('aria.mainNavigation')}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Logo - V0.0.1 Editorial monospace style with accent dot */}
          <Link
            to="/"
            className="flex items-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4 rounded-xl"
            aria-label={t('aria.goToHomepage')}
          >
            <span className="text-2xl font-black text-theme-text-primary tracking-editorial select-none font-mono-brand">
              girok<span className="text-theme-primary">.</span>
            </span>
          </Link>

          {/* Right side menu - V0.0.1 Style */}
          <div className="flex items-center gap-2">
            {/* User profile (authenticated) - V0.0.1 Style */}
            {isAuthenticated && (
              <>
                <div className="flex items-center gap-3 px-4 py-2 hover:bg-theme-bg-secondary rounded-2xl transition-colors cursor-default group border border-transparent hover:border-theme-border-default">
                  <div className="w-8 h-8 rounded-full bg-theme-bg-secondary group-hover:bg-theme-bg-card border border-theme-border-default flex items-center justify-center transition-colors">
                    <User size={16} className="text-theme-primary" aria-hidden="true" />
                  </div>
                  <span className="text-[13px] font-black text-theme-text-primary uppercase tracking-brand-lg hidden sm:block font-mono-brand">
                    {user?.username || user?.name?.slice(0, 10) || 'User'}
                  </span>
                </div>

                {/* Separator */}
                <div className="w-px h-6 bg-theme-border-default mx-2" aria-hidden="true" />
              </>
            )}

            {/* Theme toggle button - V0.0.1 48px touch target */}
            <button
              onClick={toggleTheme}
              aria-label={
                effectiveTheme === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')
              }
              className="p-3 rounded-xl hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
            >
              {effectiveTheme === 'dark' ? (
                <Sun size={22} aria-hidden="true" />
              ) : (
                <Moon size={22} aria-hidden="true" />
              )}
            </button>

            <LanguageSwitcher />

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                {/* Auth action button - V0.0.1 Icon style */}
                <button
                  onClick={handleToggleDropdown}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label={t('aria.userMenu')}
                  className="p-3 rounded-xl hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
                >
                  <LogOut size={22} aria-hidden="true" />
                </button>

                {/* Dropdown menu - Editorial style */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-4 w-56 bg-theme-bg-card rounded-input shadow-theme-lg border-2 border-theme-border-default py-3 z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <Link
                      to="/change-password"
                      onClick={handleCloseDropdown}
                      className="flex items-center gap-3 w-full text-left px-5 py-3.5 text-base text-theme-text-secondary hover:bg-theme-bg-hover transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <KeyRound className="w-5 h-5" aria-hidden="true" />
                      {t('nav.changePassword')}
                    </Link>
                    <hr className="my-2 border-theme-border-subtle mx-4" />
                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center gap-3 w-full text-left px-5 py-3.5 text-base text-theme-status-error-text hover:bg-theme-status-error-bg transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <LogOut className="w-5 h-5" aria-hidden="true" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Login button - V0.0.1 Icon style */
              <Link
                to="/login"
                className="p-3 rounded-xl hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
                aria-label={t('nav.login')}
              >
                <User size={22} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
