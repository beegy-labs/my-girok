import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../hooks/useTheme';
import { Button, useClickOutside } from '@my-girok/ui-components';
import { Sun, Moon, ChevronDown, KeyRound, LogOut } from 'lucide-react';

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

  // Close dropdown when clicking outside or pressing Escape
  useClickOutside(dropdownRef, isDropdownOpen, handleCloseDropdown);

  return (
    <nav
      className="bg-theme-bg-elevated border-b border-theme-border-subtle shadow-theme-sm transition-colors duration-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - Text only, professional archive style */}
          <Link
            to="/"
            className="flex items-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring focus-visible:ring-offset-2 rounded-lg"
            aria-label="Go to homepage"
          >
            <span className="text-xl sm:text-2xl font-bold font-mono text-theme-text-primary tracking-tight">
              girok
            </span>
          </Link>

          {/* Right side menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              aria-label={
                effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
              className="p-2.5 sm:p-3 rounded-lg hover:bg-theme-bg-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring"
            >
              {effectiveTheme === 'dark' ? (
                <Sun className="w-5 h-5 text-theme-primary" aria-hidden="true" />
              ) : (
                <Moon className="w-5 h-5 text-theme-primary" aria-hidden="true" />
              )}
            </button>

            <LanguageSwitcher />

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                {/* User button */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2.5 rounded-lg hover:bg-theme-bg-hover transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring"
                >
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-semibold text-theme-text-primary">
                      {user?.name || user?.email}
                    </p>
                    {/* Only show role for ADMIN */}
                    {user?.role === 'ADMIN' && (
                      <p className="text-xs text-theme-primary font-medium">{user.role}</p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-theme-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-theme-bg-elevated rounded-xl shadow-theme-lg border border-theme-border-subtle py-1 z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <Link
                      to="/change-password"
                      onClick={handleCloseDropdown}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 text-base text-theme-text-secondary hover:bg-theme-bg-hover transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      {t('nav.changePassword')}
                    </Link>
                    <hr className="my-1 border-theme-border-subtle" />
                    <button
                      onClick={() => {
                        handleCloseDropdown();
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 text-base text-theme-status-error-text hover:bg-theme-status-error-bg transition-colors min-h-[44px]"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2.5 text-base font-medium text-theme-primary hover:text-theme-primary-light transition-colors min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring rounded-lg"
                >
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="flex items-center">
                  <Button size="md">{t('nav.register')}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
