import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import OAuthCallbackPage from './OAuthCallbackPage';

// Use vi.hoisted to define mock functions before vi.mock runs
const { mockNavigate, mockSetAuth, mockSetMfaChallenge, mockGetCurrentUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetAuth: vi.fn(),
  mockSetMfaChallenge: vi.fn(),
  mockGetCurrentUser: vi.fn(),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    setAuth: mockSetAuth,
    setMfaChallenge: mockSetMfaChallenge,
  }),
}));

vi.mock('../api/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// Helper to render with router
function renderWithRouter(searchParams: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback?${searchParams}`]}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/login/mfa" element={<div>MFA Page</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loading state', () => {
    it('should show loading state initially on success status', async () => {
      mockGetCurrentUser.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ id: '1', email: 'test@test.com' }), 100),
          ),
      );

      renderWithRouter('provider=google&status=success');

      expect(screen.getByText('Processing authentication...')).toBeInTheDocument();
    });
  });

  describe('success flow', () => {
    it('should fetch user and show success message on successful callback', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test User' };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      renderWithRouter('provider=google&status=success');

      await waitFor(() => {
        expect(screen.getByText('Successfully authenticated!')).toBeInTheDocument();
      });

      expect(mockSetAuth).toHaveBeenCalledWith(mockUser);
    });

    it('should use return URL from sessionStorage', async () => {
      sessionStorage.setItem('oauth_return_url', '/dashboard');
      const mockUser = { id: '1', email: 'test@test.com' };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      renderWithRouter('provider=google&status=success');

      // Wait for user fetch and navigation
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        },
        { timeout: 3000 },
      );
    });

    it('should clear oauth_return_url from sessionStorage on success', async () => {
      sessionStorage.setItem('oauth_return_url', '/profile');
      const mockUser = { id: '1', email: 'test@test.com' };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      renderWithRouter('provider=google&status=success');

      await waitFor(() => {
        expect(sessionStorage.getItem('oauth_return_url')).toBeNull();
      });
    });
  });

  describe('error flow', () => {
    it('should display error message from query params', async () => {
      renderWithRouter('provider=google&status=error&error=Invalid%20credentials');

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should display generic error when no error param provided', async () => {
      renderWithRouter('provider=google&status=error');

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });

    it('should display error when user fetch fails', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Network error'));

      renderWithRouter('provider=google&status=success');

      await waitFor(() => {
        expect(screen.getByText('Failed to get user information')).toBeInTheDocument();
      });
    });

    it('should display try again and go home buttons on error', async () => {
      renderWithRouter('provider=google&status=error&error=Something%20went%20wrong');

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        expect(screen.getByText('Go Home')).toBeInTheDocument();
      });
    });
  });

  describe('not_implemented flow', () => {
    it('should show not implemented message for provider', async () => {
      renderWithRouter('provider=apple&status=not_implemented');

      await waitFor(() => {
        expect(screen.getByText('apple login is not yet available')).toBeInTheDocument();
      });
    });
  });

  describe('mfa_required flow', () => {
    it('should redirect to MFA page with challenge info', async () => {
      renderWithRouter(
        'provider=google&status=mfa_required&challengeId=abc123&methods=totp,backup_code',
      );

      await waitFor(() => {
        expect(mockSetMfaChallenge).toHaveBeenCalledWith('abc123', ['totp', 'backup_code']);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login/mfa', { replace: true });
    });

    it('should call setMfaChallenge and navigate to MFA page', async () => {
      sessionStorage.setItem('oauth_return_url', '/settings');

      renderWithRouter('provider=google&status=mfa_required&challengeId=abc123&methods=totp');

      // Verify MFA challenge was set and navigation occurred
      await waitFor(
        () => {
          expect(mockSetMfaChallenge).toHaveBeenCalledWith('abc123', ['totp']);
          expect(mockNavigate).toHaveBeenCalledWith('/login/mfa', { replace: true });
        },
        { timeout: 3000 },
      );
    });

    it('should show error when challengeId is missing', async () => {
      renderWithRouter('provider=google&status=mfa_required');

      await waitFor(() => {
        expect(screen.getByText('MFA configuration error')).toBeInTheDocument();
      });
    });
  });

  describe('no status', () => {
    it('should redirect to login page when no status is provided', async () => {
      renderWithRouter('provider=google');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });
});
