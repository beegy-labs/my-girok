import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminLayout from './AdminLayout';
import * as adminAuthStore from '../stores/adminAuthStore';
import * as menuStore from '../stores/menuStore';
import * as ThemeContext from '../contexts/ThemeContext';

// Mock dependencies
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('../stores/adminAuthStore', () => ({
  useAdminAuthStore: vi.fn(),
}));

vi.mock('../stores/menuStore', () => ({
  useMenuStore: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

vi.mock('../api', () => ({
  authApi: {
    logout: vi.fn(),
  },
}));

vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

vi.mock('../hooks', () => ({
  usePageTracking: vi.fn(),
  useUserTracking: vi.fn(),
}));

describe('AdminLayout', () => {
  const mockSetMobileOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(adminAuthStore.useAdminAuthStore).mockReturnValue({
      admin: {
        id: '1',
        name: 'Test Admin',
        email: 'admin@test.com',
        roleName: 'Super Admin',
        scope: 'SYSTEM',
      },
      clearAuth: vi.fn(),
      setAuth: vi.fn(),
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(true),
      mfaChallenge: null,
      setMfaChallenge: vi.fn(),
      clearMfaChallenge: vi.fn(),
    });

    vi.mocked(menuStore.useMenuStore).mockReturnValue({
      isMobileOpen: false,
      setMobileOpen: mockSetMobileOpen,
      expandedItems: {},
      toggleItem: vi.fn(),
    });

    vi.mocked(ThemeContext.useTheme).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });
  });

  describe('mobile menu button accessibility', () => {
    it('should have aria-label on mobile menu button', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const menuButton = screen.getByRole('button', { name: 'Open menu' });
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-label', 'Open menu');
    });

    it('should open mobile menu when button is clicked', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const menuButton = screen.getByRole('button', { name: 'Open menu' });
      fireEvent.click(menuButton);

      expect(mockSetMobileOpen).toHaveBeenCalledWith(true);
    });

    it('should be visible on mobile (lg:hidden class)', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const menuButton = screen.getByRole('button', { name: 'Open menu' });
      expect(menuButton).toHaveClass('lg:hidden');
    });
  });

  describe('theme toggle accessibility', () => {
    it('should have aria-label on theme toggle button', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const themeButton = screen.getByRole('button', { name: 'Toggle theme' });
      expect(themeButton).toBeInTheDocument();
      expect(themeButton).toHaveAttribute('aria-label', 'Toggle theme');
    });
  });

  describe('language switcher accessibility', () => {
    it('should have aria-label on language switcher button', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const langButton = screen.getByRole('button', { name: 'Change language' });
      expect(langButton).toBeInTheDocument();
      expect(langButton).toHaveAttribute('aria-label', 'Change language');
    });
  });

  describe('responsive header', () => {
    it('should have responsive height classes', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('h-14', 'sm:h-16');
    });

    it('should have responsive padding classes', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('px-3', 'sm:px-6');
    });
  });

  describe('user menu responsive behavior', () => {
    it('should hide user name and role on mobile (hidden sm:block)', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      // The user info div should have hidden sm:block classes
      const userInfoDiv = screen.getByText('Test Admin').parentElement;
      expect(userInfoDiv).toHaveClass('hidden', 'sm:block');
    });

    it('should always show user avatar', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      // Avatar should show first letter of name
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });

  describe('mobile overlay', () => {
    it('should show overlay when mobile menu is open', () => {
      vi.mocked(menuStore.useMenuStore).mockReturnValue({
        isMobileOpen: true,
        setMobileOpen: mockSetMobileOpen,
        expandedItems: {},
        toggleItem: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      // Overlay should be present with lg:hidden class
      const overlay = document.querySelector('.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('lg:hidden');
    });

    it('should not show overlay when mobile menu is closed', () => {
      vi.mocked(menuStore.useMenuStore).mockReturnValue({
        isMobileOpen: false,
        setMobileOpen: mockSetMobileOpen,
        expandedItems: {},
        toggleItem: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const overlay = document.querySelector('.bg-black\\/50');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should close mobile menu when overlay is clicked', () => {
      vi.mocked(menuStore.useMenuStore).mockReturnValue({
        isMobileOpen: true,
        setMobileOpen: mockSetMobileOpen,
        expandedItems: {},
        toggleItem: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const overlay = document.querySelector('.bg-black\\/50');
      fireEvent.click(overlay!);

      expect(mockSetMobileOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('sidebar responsive behavior', () => {
    it('should have transform classes for mobile animation', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const sidebar = screen.getByTestId('sidebar').parentElement;
      expect(sidebar).toHaveClass('transform', 'transition-transform');
    });

    it('should be translated off-screen when mobile menu is closed', () => {
      vi.mocked(menuStore.useMenuStore).mockReturnValue({
        isMobileOpen: false,
        setMobileOpen: mockSetMobileOpen,
        expandedItems: {},
        toggleItem: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const sidebar = screen.getByTestId('sidebar').parentElement;
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('should be visible when mobile menu is open', () => {
      vi.mocked(menuStore.useMenuStore).mockReturnValue({
        isMobileOpen: true,
        setMobileOpen: mockSetMobileOpen,
        expandedItems: {},
        toggleItem: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const sidebar = screen.getByTestId('sidebar').parentElement;
      expect(sidebar).toHaveClass('translate-x-0');
    });
  });

  describe('main content', () => {
    it('should render outlet for page content', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('should have responsive padding on main content', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>,
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('p-4', 'sm:p-6');
    });
  });
});
