import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">My-Girok</span>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {user?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
