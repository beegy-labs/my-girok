import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SettingsPage from './SettingsPage';

// Use vi.hoisted to define mock functions before vi.mock runs
const {
  mockSetupMfa,
  mockVerifyMfaSetup,
  mockDisableMfa,
  mockGetSessions,
  mockRevokeSession,
  mockRevokeAllSessions,
  mockRegenerateBackupCodes,
  mockGetMe,
  mockSetAuth,
} = vi.hoisted(() => ({
  mockSetupMfa: vi.fn(),
  mockVerifyMfaSetup: vi.fn(),
  mockDisableMfa: vi.fn(),
  mockGetSessions: vi.fn(),
  mockRevokeSession: vi.fn(),
  mockRevokeAllSessions: vi.fn(),
  mockRegenerateBackupCodes: vi.fn(),
  mockGetMe: vi.fn(),
  mockSetAuth: vi.fn(),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.security.title': 'Security',
        'settings.security.description': 'Manage your account security settings',
        'settings.security.mfaDescription': 'Protect your account with two-factor authentication',
        'settings.security.twoFactorAuth': 'Two-Factor Authentication',
        'settings.security.mfaEnabled': 'Your account is protected with 2FA',
        'settings.security.mfaDisabled': 'Add an extra layer of security',
        'settings.security.enable': 'Enable',
        'settings.security.disable': 'Disable',
        'settings.security.scanQrCode': 'Scan QR Code',
        'settings.security.manualEntry': 'Or enter this code manually:',
        'settings.security.verifySetup': 'Verify Setup',
        'settings.security.enterCodeFromApp': 'Enter the 6-digit code',
        'settings.security.verify': 'Verify',
        'settings.security.backupCodes': 'Backup Codes',
        'settings.security.backupCodesWarning': 'Save these codes',
        'settings.security.copyAll': 'Copy All Codes',
        'settings.security.done': 'Done',
        'settings.security.disableMfa': 'Disable Two-Factor Authentication',
        'settings.security.disableWarning': 'This will make your account less secure',
        'settings.security.enterPassword': 'Enter your password',
        'settings.security.confirmDisable': 'Disable MFA',
        'settings.security.regenerateCodes': 'Backup Codes',
        'settings.security.regenerateBackupCodes': 'Regenerate Backup Codes',
        'settings.security.regenerateWarning': 'This will invalidate existing codes',
        'settings.security.regenerate': 'Regenerate',
        'settings.security.activeSessions': 'Active Sessions',
        'settings.security.sessionsDescription': 'Manage your active sessions',
        'settings.security.currentSession': 'Current',
        'settings.security.lastActive': 'Last active',
        'settings.security.unknownDevice': 'Unknown Device',
        'settings.security.unknownIp': 'Unknown IP',
        'settings.security.revokeAll': 'Sign out all',
        'settings.security.noSessions': 'No active sessions',
        'settings.security.setupFailed': 'Failed to setup MFA',
        'settings.security.codeRequired': 'Please enter the verification code',
        'settings.security.passwordRequired': 'Please enter your password',
        'settings.security.invalidCode': 'Invalid verification code',
        'common.active': 'Active',
        'common.inactive': 'Inactive',
        'common.loading': 'Loading...',
        'common.cancel': 'Cancel',
        'common.next': 'Next',
        'common.previous': 'Previous',
      };
      return translations[key] || key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

let mockAdmin = { id: '1', email: 'admin@test.com', mfaEnabled: false, permissions: ['*'] };
vi.mock('../stores/adminAuthStore', () => ({
  useAdminAuthStore: () => ({
    admin: mockAdmin,
    setAuth: mockSetAuth,
  }),
}));

vi.mock('../api/auth', () => ({
  authApi: {
    setupMfa: () => mockSetupMfa(),
    verifyMfaSetup: (code: string) => mockVerifyMfaSetup(code),
    disableMfa: (password: string) => mockDisableMfa(password),
    getSessions: () => mockGetSessions(),
    revokeSession: (sessionId: string) => mockRevokeSession(sessionId),
    revokeAllSessions: () => mockRevokeAllSessions(),
    regenerateBackupCodes: (password: string) => mockRegenerateBackupCodes(password),
    getMe: () => mockGetMe(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin = { id: '1', email: 'admin@test.com', mfaEnabled: false, permissions: ['*'] };
    mockGetSessions.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial render', () => {
    it('should render settings title and security section', async () => {
      renderPage();

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    it('should show MFA disabled status when admin has MFA disabled', async () => {
      renderPage();

      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Enable')).toBeInTheDocument();
    });

    it('should show MFA enabled status when admin has MFA enabled', async () => {
      mockAdmin = { id: '1', email: 'admin@test.com', mfaEnabled: true, permissions: ['*'] };

      renderPage();

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Disable')).toBeInTheDocument();
    });

    it('should show Active Sessions section', async () => {
      renderPage();

      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });
  });

  describe('MFA setup flow', () => {
    it('should start MFA setup when Enable button is clicked', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderPage();

      const enableButton = screen.getByText('Enable');
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      });
    });

    it('should show secret code after setup', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderPage();

      fireEvent.click(screen.getByText('Enable'));

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });
    });

    it('should navigate to verify step when Next is clicked', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderPage();

      fireEvent.click(screen.getByText('Enable'));

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Verify Setup')).toBeInTheDocument();
      });
    });
  });

  describe('MFA verification', () => {
    beforeEach(async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });
    });

    it('should navigate to verify step and show code input', async () => {
      renderPage();

      fireEvent.click(screen.getByText('Enable'));
      await waitFor(() => screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Verify Setup')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });
    });

    it('should show backup codes after successful verification', async () => {
      mockVerifyMfaSetup.mockResolvedValue({ success: true });
      mockGetMe.mockResolvedValue({ ...mockAdmin, mfaEnabled: true });

      renderPage();

      fireEvent.click(screen.getByText('Enable'));
      await waitFor(() => screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });
      fireEvent.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Backup Codes')).toBeInTheDocument();
        expect(screen.getByText('CODE1')).toBeInTheDocument();
        expect(screen.getByText('CODE2')).toBeInTheDocument();
      });
    });
  });

  describe('MFA disable flow', () => {
    beforeEach(() => {
      mockAdmin = { id: '1', email: 'admin@test.com', mfaEnabled: true, permissions: ['*'] };
    });

    it('should show disable confirmation when Disable button is clicked', async () => {
      renderPage();

      const disableButton = screen.getByText('Disable');
      fireEvent.click(disableButton);

      await waitFor(() => {
        expect(screen.getByText('Disable Two-Factor Authentication')).toBeInTheDocument();
      });
    });

    it('should show password input when disable is clicked', async () => {
      renderPage();

      fireEvent.click(screen.getByText('Disable'));

      await waitFor(() => {
        expect(screen.getByText('Disable Two-Factor Authentication')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      });
    });

    it('should disable MFA on successful password verification', async () => {
      mockDisableMfa.mockResolvedValue({ success: true });
      mockGetMe.mockResolvedValue({ ...mockAdmin, mfaEnabled: false });

      renderPage();

      fireEvent.click(screen.getByText('Disable'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(input, { target: { value: 'password123' } });
      fireEvent.click(screen.getByText('Disable MFA'));

      await waitFor(() => {
        expect(mockDisableMfa).toHaveBeenCalledWith('password123');
      });
    });
  });

  describe('Active Sessions', () => {
    it('should load and display sessions on mount', async () => {
      mockGetSessions.mockResolvedValue([
        {
          id: 'session1',
          userAgent: 'Mozilla/5.0 Chrome',
          ipAddress: '192.168.1.1',
          lastActivityAt: '2026-01-09T10:00:00Z',
          isCurrent: true,
          deviceFingerprint: 'abc',
          mfaVerified: true,
          createdAt: '2026-01-08T10:00:00Z',
        },
        {
          id: 'session2',
          userAgent: 'Mozilla/5.0 Firefox',
          ipAddress: '192.168.1.2',
          lastActivityAt: '2026-01-08T10:00:00Z',
          isCurrent: false,
          deviceFingerprint: 'def',
          mfaVerified: true,
          createdAt: '2026-01-07T10:00:00Z',
        },
      ]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Mozilla/5.0 Chrome')).toBeInTheDocument();
        expect(screen.getByText('Mozilla/5.0 Firefox')).toBeInTheDocument();
      });
    });

    it('should show current session badge', async () => {
      mockGetSessions.mockResolvedValue([
        {
          id: 'session1',
          userAgent: 'Chrome Browser',
          ipAddress: '192.168.1.1',
          lastActivityAt: '2026-01-09T10:00:00Z',
          isCurrent: true,
          deviceFingerprint: 'abc',
          mfaVerified: true,
          createdAt: '2026-01-08T10:00:00Z',
        },
      ]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument();
      });
    });

    it('should revoke a session when trash button is clicked', async () => {
      mockGetSessions.mockResolvedValue([
        {
          id: 'session1',
          userAgent: 'Current Session',
          ipAddress: '192.168.1.1',
          lastActivityAt: '2026-01-09T10:00:00Z',
          isCurrent: true,
          deviceFingerprint: 'abc',
          mfaVerified: true,
          createdAt: '2026-01-08T10:00:00Z',
        },
        {
          id: 'session2',
          userAgent: 'Other Session',
          ipAddress: '192.168.1.2',
          lastActivityAt: '2026-01-08T10:00:00Z',
          isCurrent: false,
          deviceFingerprint: 'def',
          mfaVerified: true,
          createdAt: '2026-01-07T10:00:00Z',
        },
      ]);
      mockRevokeSession.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Other Session')).toBeInTheDocument();
      });

      // Find and click the revoke button (trash icon) for the non-current session
      const revokeButtons = screen.getAllByRole('button');
      const trashButton = revokeButtons.find((btn) => btn.querySelector('svg.lucide-trash-2'));
      if (trashButton) {
        fireEvent.click(trashButton);
      }

      await waitFor(() => {
        expect(mockRevokeSession).toHaveBeenCalledWith('session2');
      });
    });

    it('should revoke all sessions when Sign out all button is clicked', async () => {
      mockGetSessions.mockResolvedValue([
        {
          id: 'session1',
          userAgent: 'Current Session',
          ipAddress: '192.168.1.1',
          lastActivityAt: '2026-01-09T10:00:00Z',
          isCurrent: true,
          deviceFingerprint: 'abc',
          mfaVerified: true,
          createdAt: '2026-01-08T10:00:00Z',
        },
        {
          id: 'session2',
          userAgent: 'Other Session',
          ipAddress: '192.168.1.2',
          lastActivityAt: '2026-01-08T10:00:00Z',
          isCurrent: false,
          deviceFingerprint: 'def',
          mfaVerified: true,
          createdAt: '2026-01-07T10:00:00Z',
        },
      ]);
      mockRevokeAllSessions.mockResolvedValue({ revokedCount: 1 });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Sign out all')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Sign out all'));

      await waitFor(() => {
        expect(mockRevokeAllSessions).toHaveBeenCalled();
      });
    });

    it('should show no sessions message when there are no sessions', async () => {
      mockGetSessions.mockResolvedValue([]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('No active sessions')).toBeInTheDocument();
      });
    });
  });

  describe('cancel functionality', () => {
    it('should cancel setup and return to idle state', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderPage();

      fireEvent.click(screen.getByText('Enable'));

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Enable')).toBeInTheDocument();
      });
    });
  });
});
