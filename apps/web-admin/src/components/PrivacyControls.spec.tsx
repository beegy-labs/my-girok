import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrivacyControls, type PrivacyRule } from './PrivacyControls';
import { PRIVACY_PRESET_RULES } from '../config/privacy-rules.config';

describe('PrivacyControls', () => {
  const mockOnSave = vi.fn();
  const defaultProps = {
    serviceSlug: 'web-app',
    rules: [],
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header and Basic Rendering', () => {
    it('should render privacy controls header', () => {
      render(<PrivacyControls {...defaultProps} />);

      expect(screen.getByText('Privacy Controls')).toBeInTheDocument();
      expect(screen.getByText(/Configure which elements are masked/)).toBeInTheDocument();
    });

    it('should display service slug in description', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      expect(screen.getByText(/web-app/)).toBeInTheDocument();
    });
  });

  describe('Preset Rules', () => {
    it('should display quick preset buttons', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      expect(screen.getByText('+ All Inputs')).toBeInTheDocument();
      expect(screen.getByText('+ Passwords')).toBeInTheDocument();
      expect(screen.getByText('+ Email Fields')).toBeInTheDocument();
    });

    it('should add preset rule when clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={onSave} />);

      const passwordPreset = screen.getByText('+ Passwords');
      fireEvent.click(passwordPreset);

      // Should appear in active rules list
      await waitFor(() => {
        expect(screen.getByText('input[type="password"]')).toBeInTheDocument();
        expect(screen.getByText('block')).toBeInTheDocument();
      });
    });

    it('should not add duplicate preset rules', async () => {
      const onSave = vi.fn();
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={onSave} />);

      const allInputsButton = screen.getByText('+ All Inputs');

      // Click twice
      fireEvent.click(allInputsButton);
      fireEvent.click(allInputsButton);

      // Should only add once
      await waitFor(() => {
        const selectors = screen.getAllByText('input');
        expect(selectors).toHaveLength(1);
      });
    });
  });

  describe('PII Detection', () => {
    it('should render PII detection checkboxes', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      expect(screen.getByText(/detect and redact email addresses/i)).toBeInTheDocument();
      expect(screen.getByText(/detect and redact phone numbers/i)).toBeInTheDocument();
      expect(screen.getByText(/detect and block credit card numbers/i)).toBeInTheDocument();
    });

    it('should have checkboxes for PII detection', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={mockOnSave} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });
});
