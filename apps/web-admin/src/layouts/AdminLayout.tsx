import { Outlet, NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { useTheme } from '../contexts/ThemeContext';
import { authApi } from '../api';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', permission: null },
  { path: '/legal/documents', icon: FileText, label: 'Legal Documents', permission: 'legal:read' },
  { path: '/legal/consents', icon: Users, label: 'Consents', permission: 'legal:read' },
  { path: '/tenants', icon: Building2, label: 'Tenants', permission: 'tenant:read' },
];

export default function AdminLayout() {
  const { admin, clearAuth, hasPermission, refreshToken } = useAdminAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      {/* Sidebar */}
      <aside className="w-64 bg-theme-bg-card border-r border-theme-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-theme-border">
          <span className="text-xl font-bold text-theme-text-primary">Girok Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-theme-primary/10 text-theme-primary border-r-2 border-theme-primary'
                      : 'text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Settings link */}
        <div className="border-t border-theme-border">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-theme-primary/10 text-theme-primary'
                  : 'text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary'
              }`
            }
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-theme-bg-card border-b border-theme-border flex items-center justify-between px-6">
          <div />

          <div className="flex items-center gap-4">
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
                    <span>Sign out</span>
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
