import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationButton from './NotificationButton';
import { useTheme } from '../hooks/useTheme';
import { useClickOutside } from '@my-girok/ui-components';
import { Sun, Moon, KeyRound, LogOut, User, Settings } from 'lucide-react';

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
      className="bg-theme-bg-card border-b border-theme-border-default transition-colors duration-200 h-nav"
      role="navigation"
      aria-label={t('aria.mainNavigation')}
    >
      <div className="w-full lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4 rounded-soft"
            aria-label={t('aria.goToHomepage')}
          >
            <span className="text-2xl font-black text-theme-text-primary tracking-editorial select-none font-mono-brand">
              girok<span className="text-theme-primary">.</span>
            </span>
          </Link>

          {/* Right side menu */}
          <div className="flex items-center gap-1">
            {/* Notification button */}
            {isAuthenticated && <NotificationButton />}

            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              aria-label={
                effectiveTheme === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')
              }
              className="p-3 rounded-soft hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
            >
              {effectiveTheme === 'dark' ? (
                <Sun size={20} aria-hidden="true" />
              ) : (
                <Moon size={20} aria-hidden="true" />
              )}
            </button>

            <LanguageSwitcher />

            {isAuthenticated ? (
              /* Profile dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleToggleDropdown}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label={t('aria.userMenu')}
                  className={`flex items-center gap-2 p-2 rounded-soft transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring ${
                    isDropdownOpen ? 'bg-theme-bg-secondary' : 'hover:bg-theme-bg-hover'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-theme-bg-secondary border border-theme-border-default flex items-center justify-center">
                    <User size={16} className="text-theme-primary" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-theme-text-primary hidden sm:block max-w-[100px] truncate">
                    {user?.username || user?.name?.slice(0, 10) || 'User'}
                  </span>
                </button>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-theme-bg-card rounded-soft shadow-theme-lg border-2 border-theme-border-default py-2 z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <Link
                      to="/settings/profile"
                      onClick={handleCloseDropdown}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-theme-text-secondary hover:bg-theme-bg-hover transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                      {t('nav.profile', { defaultValue: 'Profile Settings' })}
                    </Link>
                    <Link
                      to="/change-password"
                      onClick={handleCloseDropdown}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-theme-text-secondary hover:bg-theme-bg-hover transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      {t('nav.changePassword')}
                    </Link>
                    <hr className="my-2 border-theme-border-subtle mx-4" />
                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-theme-status-error-text hover:bg-theme-status-error-bg transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Login button */
              <Link
                to="/login"
                className="p-3 rounded-soft hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
                aria-label={t('nav.login')}
              >
                <User size={20} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
