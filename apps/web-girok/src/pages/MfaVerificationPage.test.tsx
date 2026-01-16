import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import MfaVerificationPage from './MfaVerificationPage';

// Use vi.hoisted to define mock functions before vi.mock runs
const { mockNavigate, mockSetAuth, mockClearMfaChallenge, mockLoginMfa } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetAuth: vi.fn(),
  mockClearMfaChallenge: vi.fn(),
  mockLoginMfa: vi.fn(),
}));

// Need to track mfaChallenge state outside hoisted for test manipulation
let mockMfaChallenge: { challengeId: string; availableMethods: string[] } | null = null;

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
    useLocation: () => ({ state: null }),
  };
});

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    mfaChallenge: mockMfaChallenge,
    setAuth: mockSetAuth,
    clearMfaChallenge: mockClearMfaChallenge,
  }),
}));

vi.mock('../api/auth', () => ({
  loginMfa: (params: unknown) => mockLoginMfa(params),
}));

// Helper to render with router
function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/login/mfa']}>
      <Routes>
        <Route path="/login/mfa" element={<MfaVerificationPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MfaVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockMfaChallenge = {
      challengeId: 'test-challenge-123',
      availableMethods: ['totp', 'backup_code'],
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockMfaChallenge = null;
  });

  describe('redirect without challenge', () => {
    it('should redirect to login when no MFA challenge exists', async () => {
      mockMfaChallenge = null;

      renderWithRouter();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });

  describe('rendering', () => {
    it('should render verification form with TOTP selected by default', () => {
      renderWithRouter();

      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    it('should show method selector when multiple methods are available', () => {
      renderWithRouter();

      expect(screen.getByText('Authenticator')).toBeInTheDocument();
      expect(screen.getByText('Backup Code')).toBeInTheDocument();
    });

    it('should not show method selector when only one method available', () => {
      mockMfaChallenge = {
        challengeId: 'test-challenge-123',
        availableMethods: ['totp'],
      };

      renderWithRouter();

      expect(screen.queryByText('Backup Code')).not.toBeInTheDocument();
    });
  });

  describe('method switching', () => {
    it('should switch to backup code input when backup code method is selected', async () => {
      renderWithRouter();

      const backupCodeButton = screen.getByText('Backup Code');
      fireEvent.click(backupCodeButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should clear code input when switching methods', async () => {
      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const backupCodeButton = screen.getByText('Backup Code');
      fireEvent.click(backupCodeButton);

      await waitFor(() => {
        const newInput = screen.getByPlaceholderText('XXXX-XXXX');
        expect(newInput).toHaveValue('');
      });
    });
  });

  describe('form validation', () => {
    it('should not call loginMfa when submitting empty code', async () => {
      renderWithRouter();

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      // The form should prevent submission with empty code
      await waitFor(() => {
        expect(mockLoginMfa).not.toHaveBeenCalled();
      });
    });

    it('should show error when no challenge exists on submit', async () => {
      // First render with challenge
      renderWithRouter();

      // Then remove challenge
      mockMfaChallenge = { challengeId: '', availableMethods: ['totp'] };

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('No MFA challenge found. Please login again.')).toBeInTheDocument();
      });
    });
  });

  describe('successful verification', () => {
    it('should call loginMfa with correct params on submit', async () => {
      mockLoginMfa.mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@test.com' },
      });

      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLoginMfa).toHaveBeenCalledWith({
          challengeId: 'test-challenge-123',
          code: '123456',
          method: 'totp',
        });
      });
    });

    it('should set auth and navigate on successful verification', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
      mockLoginMfa.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSetAuth).toHaveBeenCalledWith(mockUser);
        expect(mockClearMfaChallenge).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('should navigate to stored return URL on success', async () => {
      sessionStorage.setItem('mfa_return_url', '/dashboard');
      const mockUser = { id: '1', email: 'test@test.com' };
      mockLoginMfa.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('should clear mfa_return_url from sessionStorage on success', async () => {
      sessionStorage.setItem('mfa_return_url', '/settings');
      const mockUser = { id: '1', email: 'test@test.com' };
      mockLoginMfa.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(sessionStorage.getItem('mfa_return_url')).toBeNull();
      });
    });
  });

  describe('failed verification', () => {
    it('should show error message when verification fails', async () => {
      mockLoginMfa.mockResolvedValue({
        success: false,
        message: 'Invalid code',
      });

      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '000000' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });
    });

    it('should show default error when API call throws', async () => {
      mockLoginMfa.mockRejectedValue({
        response: { data: { message: 'Server error' } },
      });

      renderWithRouter();

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('back to login', () => {
    it('should clear MFA challenge and navigate to login when back button clicked', async () => {
      renderWithRouter();

      const backButton = screen.getByText('Back to Login');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockClearMfaChallenge).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('should clear mfa_return_url when going back to login', async () => {
      sessionStorage.setItem('mfa_return_url', '/profile');

      renderWithRouter();

      const backButton = screen.getByText('Back to Login');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(sessionStorage.getItem('mfa_return_url')).toBeNull();
      });
    });
  });

  describe('backup code verification', () => {
    it('should submit backup code with correct method', async () => {
      mockLoginMfa.mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@test.com' },
      });

      renderWithRouter();

      // Switch to backup code
      const backupCodeButton = screen.getByText('Backup Code');
      fireEvent.click(backupCodeButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText('XXXX-XXXX');
        fireEvent.change(input, { target: { value: 'ABCD-1234' } });
      });

      const submitButton = screen.getByText('Verify');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLoginMfa).toHaveBeenCalledWith({
          challengeId: 'test-challenge-123',
          code: 'ABCD-1234',
          method: 'backup_code',
        });
      });
    });
  });
});
