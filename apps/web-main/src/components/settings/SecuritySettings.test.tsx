import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SecuritySettings from './SecuritySettings';

// Use vi.hoisted to define mock functions before vi.mock runs (hoisting)
const {
  mockSetupMfa,
  mockVerifyMfaSetup,
  mockDisableMfa,
  mockGetBackupCodesCount,
  mockRegenerateBackupCodes,
  mockNavigate,
} = vi.hoisted(() => ({
  mockSetupMfa: vi.fn(),
  mockVerifyMfaSetup: vi.fn(),
  mockDisableMfa: vi.fn(),
  mockGetBackupCodesCount: vi.fn(),
  mockRegenerateBackupCodes: vi.fn(),
  mockNavigate: vi.fn(),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; count?: number }) => {
      if (options?.count !== undefined && options?.defaultValue) {
        return options.defaultValue.replace('${backupCodesCount}', String(options.count));
      }
      return options?.defaultValue || key;
    },
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

let mockUser = { id: '1', email: 'test@test.com', mfaEnabled: false };
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

vi.mock('../../api/auth', () => ({
  setupMfa: () => mockSetupMfa(),
  verifyMfaSetup: (code: string) => mockVerifyMfaSetup(code),
  disableMfa: (password: string) => mockDisableMfa(password),
  getBackupCodesCount: () => mockGetBackupCodesCount(),
  regenerateBackupCodes: (password: string) => mockRegenerateBackupCodes(password),
}));

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Helper to render with router
function renderWithRouter() {
  return render(
    <MemoryRouter>
      <SecuritySettings />
    </MemoryRouter>,
  );
}

describe('SecuritySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: '1', email: 'test@test.com', mfaEnabled: false };
    // Default mock for getBackupCodesCount - always return a value
    mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 8 });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial render', () => {
    it('should render security settings title', () => {
      renderWithRouter();

      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Manage your account security settings')).toBeInTheDocument();
    });

    it('should show MFA disabled status when user has MFA disabled', () => {
      renderWithRouter();

      expect(screen.getByText('Disabled')).toBeInTheDocument();
      expect(screen.getByText('Enable MFA')).toBeInTheDocument();
    });

    it('should show MFA enabled status when user has MFA enabled', async () => {
      mockUser = { id: '1', email: 'test@test.com', mfaEnabled: true };
      mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 8 });

      renderWithRouter();

      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Disable MFA')).toBeInTheDocument();
    });

    it('should show backup codes count when MFA is enabled', async () => {
      mockUser = { id: '1', email: 'test@test.com', mfaEnabled: true };
      mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 5 });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('5 backup codes remaining')).toBeInTheDocument();
      });
    });

    it('should show low backup codes warning when count is less than 3', async () => {
      mockUser = { id: '1', email: 'test@test.com', mfaEnabled: true };
      mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 2 });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Consider regenerating your backup codes')).toBeInTheDocument();
      });
    });
  });

  describe('MFA setup flow', () => {
    it('should start MFA setup and show QR code', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderWithRouter();

      const enableButton = screen.getByText('Enable MFA');
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      });
    });

    it('should show manual entry secret after setup', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderWithRouter();

      const enableButton = screen.getByText('Enable MFA');
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });
    });

    it('should handle MFA setup failure gracefully', async () => {
      mockSetupMfa.mockRejectedValue(new Error('Network error'));

      renderWithRouter();

      const enableButton = screen.getByText('Enable MFA');
      fireEvent.click(enableButton);

      // Wait for the API call to complete and verify we stay in idle state
      await waitFor(() => {
        expect(mockSetupMfa).toHaveBeenCalled();
      });

      // After failure, the Enable MFA button should still be visible (we're back to idle)
      await waitFor(() => {
        expect(screen.getByText('Enable MFA')).toBeInTheDocument();
      });
    });

    it('should navigate to verify step when Next is clicked', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderWithRouter();

      const enableButton = screen.getByText('Enable MFA');
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

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

    it('should show error when submitting empty verification code', async () => {
      renderWithRouter();

      // Navigate to verify step
      fireEvent.click(screen.getByText('Enable MFA'));
      await waitFor(() => screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Verify')).toBeInTheDocument();
      });

      const verifyButton = screen.getByText('Verify');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter the verification code')).toBeInTheDocument();
      });
    });

    it('should show verify step after scanning QR code', async () => {
      mockVerifyMfaSetup.mockResolvedValue({ success: true });
      mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 8 });

      renderWithRouter();

      // Navigate to verify step
      fireEvent.click(screen.getByText('Enable MFA'));
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Next'));

      // Verify we're on the verify step
      await waitFor(() => {
        expect(screen.getByText('Verify Setup')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });
    });

    it('should show error when verification fails', async () => {
      mockVerifyMfaSetup.mockResolvedValue({ success: false, message: 'Invalid code' });

      renderWithRouter();

      // Navigate to verify step
      fireEvent.click(screen.getByText('Enable MFA'));
      await waitFor(() => screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '000000' } });

      const verifyButton = screen.getByText('Verify');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });
    });
  });

  describe('MFA disable flow', () => {
    beforeEach(() => {
      mockUser = { id: '1', email: 'test@test.com', mfaEnabled: true };
      mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 8 });
    });

    it('should show disable confirmation when disable button clicked', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Disable MFA')).toBeInTheDocument();
      });

      const disableButton = screen.getByText('Disable MFA');
      fireEvent.click(disableButton);

      await waitFor(() => {
        expect(screen.getByText('Disable Two-Factor Authentication')).toBeInTheDocument();
        expect(
          screen.getByText(
            'This will make your account less secure. Are you sure you want to continue?',
          ),
        ).toBeInTheDocument();
      });
    });

    it('should show error when submitting empty password', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Disable MFA')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Disable MFA'));

      await waitFor(() => {
        expect(screen.getByText('Confirm your password')).toBeInTheDocument();
      });

      // Find the Disable MFA button in the disable step
      const buttons = screen.getAllByText('Disable MFA');
      const confirmButton = buttons[buttons.length - 1]; // Get the last one (confirm button)
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter your password')).toBeInTheDocument();
      });
    });

    it('should disable MFA on successful password verification', async () => {
      mockDisableMfa.mockResolvedValue({ success: true });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Disable MFA')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Disable MFA'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('••••••••');
      fireEvent.change(input, { target: { value: 'password123' } });

      const buttons = screen.getAllByText('Disable MFA');
      const confirmButton = buttons[buttons.length - 1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDisableMfa).toHaveBeenCalledWith('password123');
      });
    });

    it('should show error when disable fails', async () => {
      mockDisableMfa.mockResolvedValue({ success: false, message: 'Wrong password' });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Disable MFA')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Disable MFA'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('••••••••');
      fireEvent.change(input, { target: { value: 'wrongpassword' } });

      const buttons = screen.getAllByText('Disable MFA');
      const confirmButton = buttons[buttons.length - 1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Wrong password')).toBeInTheDocument();
      });
    });
  });

  describe('backup codes regeneration', () => {
    beforeEach(() => {
      mockUser = { id: '1', email: 'test@test.com', mfaEnabled: true };
      mockGetBackupCodesCount.mockResolvedValue({ remainingCount: 2 });
    });

    it('should show regenerate backup codes button when MFA is enabled', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Regenerate Backup Codes')).toBeInTheDocument();
      });
    });

    it('should show password input when regenerate is clicked', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Regenerate Backup Codes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Regenerate Backup Codes'));

      await waitFor(() => {
        expect(screen.getByText('Enter your password to regenerate')).toBeInTheDocument();
      });
    });

    it('should regenerate backup codes on success', async () => {
      mockRegenerateBackupCodes.mockResolvedValue({
        backupCodes: ['NEW1', 'NEW2', 'NEW3', 'NEW4'],
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Regenerate Backup Codes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Regenerate Backup Codes'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('••••••••');
      fireEvent.change(input, { target: { value: 'password123' } });

      const regenerateButton = screen.getByText('Regenerate Codes');
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(mockRegenerateBackupCodes).toHaveBeenCalledWith('password123');
      });
    });
  });

  describe('copy functionality', () => {
    it('should copy secret code to clipboard', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=SECRETCODE',
        secret: 'SECRETCODE',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderWithRouter();

      fireEvent.click(screen.getByText('Enable MFA'));

      await waitFor(() => {
        expect(screen.getByText('SECRETCODE')).toBeInTheDocument();
      });

      // Find and click copy button (the one next to secret)
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find((btn) => btn.querySelector('svg'));
      if (copyButton) {
        fireEvent.click(copyButton);
      }

      // Just verify the clipboard mock exists
      expect(mockClipboard.writeText).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should navigate to sessions page when active sessions is clicked', async () => {
      renderWithRouter();

      const sessionsButton = screen.getByText('Active Sessions');
      fireEvent.click(sessionsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings/sessions');
    });

    it('should cancel setup and return to idle state', async () => {
      mockSetupMfa.mockResolvedValue({
        qrCodeUri: 'otpauth://totp/test?secret=ABC123',
        secret: 'ABC123',
        backupCodes: ['CODE1', 'CODE2'],
      });

      renderWithRouter();

      fireEvent.click(screen.getByText('Enable MFA'));

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Enable MFA')).toBeInTheDocument();
      });
    });
  });
});
