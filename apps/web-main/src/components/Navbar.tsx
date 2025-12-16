import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../hooks/useTheme';

export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { effectiveTheme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      // Direct navigation - React Router v7 supports this without issues
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  return (
    <nav className="bg-theme-bg-card border-b border-theme-border-subtle transition-colors duration-200">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <span className="text-xl sm:text-2xl">📚</span>
            <span className="text-lg sm:text-2xl font-bold text-theme-text-accent">My-Girok</span>
          </Link>

          {/* Right side menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg hover:bg-theme-bg-hover transition-colors"
              title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {effectiveTheme === 'dark' ? (
                // Sun icon for light mode
                <svg
                  className="w-5 h-5 text-theme-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                // Moon icon for dark mode
                <svg
                  className="w-5 h-5 text-theme-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
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
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-theme-bg-hover transition-colors"
                >
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-semibold text-theme-text-primary">
                      {user?.name || user?.email}
                    </p>
                    {/* Only show role for ADMIN */}
                    {user?.role === 'ADMIN' && (
                      <p className="text-xs text-theme-primary font-medium">
                        {user.role}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-theme-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-theme-bg-elevated rounded-lg shadow-theme-lg border border-theme-border-subtle py-1 z-50">
                    <Link
                      to="/change-password"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-theme-text-secondary hover:bg-theme-bg-hover transition-colors"
                    >
                      {t('nav.changePassword')}
                    </Link>
                    <hr className="my-1 border-theme-border-subtle" />
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 dark:text-red-400 hover:bg-red-900/20 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-theme-primary hover:text-theme-primary-light px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-theme-primary-dark to-theme-primary hover:from-theme-primary hover:to-theme-primary-light text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-theme-primary/30"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
