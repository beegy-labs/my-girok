import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

const SAVED_EMAIL_COOKIE = 'my-girok-saved-email';
const COOKIE_EXPIRY_DAYS = 30;

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Load saved email from cookie on component mount
  useEffect(() => {
    const savedEmail = Cookies.get(SAVED_EMAIL_COOKIE);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Save email to cookie if remember is checked
      if (rememberEmail) {
        Cookies.set(SAVED_EMAIL_COOKIE, email, { expires: COOKIE_EXPIRY_DAYS });
      } else {
        Cookies.remove(SAVED_EMAIL_COOKIE);
      }

      const response = await login({ email, password });
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <span className="text-3xl mr-2">📚</span>
            <h1 className="text-4xl font-bold text-amber-900 dark:text-dark-text-primary">
              My-Girok
            </h1>
          </div>
          <p className="text-gray-600 dark:text-dark-text-secondary text-sm">{t('auth.startRecording')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-amber-50/30 dark:bg-dark-bg-card rounded-2xl shadow-xl dark:shadow-dark-lg p-8 border border-amber-100 dark:border-dark-border-subtle transition-colors duration-200">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                {t('auth.emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-secondary border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-secondary border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center">
              <input
                id="rememberEmail"
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="w-4 h-4 text-amber-600 dark:text-amber-400 bg-white dark:bg-dark-bg-secondary border-amber-300 dark:border-dark-border-default rounded focus:ring-amber-500 dark:focus:ring-amber-400 focus:ring-2"
              />
              <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-700 dark:text-dark-text-secondary">
                {t('auth.rememberEmail')}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.loginButton')}
                </span>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border-subtle">
            <p className="text-center text-sm text-gray-600 dark:text-dark-text-secondary">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
              >
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-500 dark:text-dark-text-tertiary mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
