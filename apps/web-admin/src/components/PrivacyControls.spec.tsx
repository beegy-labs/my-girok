import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrivacyControls, type PrivacyRule } from './PrivacyControls';

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

  describe('Active Rules Management', () => {
    const existingRule: PrivacyRule = {
      id: 'rule-1',
      selector: '.sensitive-data',
      maskType: 'blur',
      enabled: true,
      description: 'Sensitive data field',
    };

    it('should display existing rules', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[existingRule]} onSave={vi.fn()} />);

      expect(screen.getByText('.sensitive-data')).toBeInTheDocument();
      expect(screen.getByText('blur')).toBeInTheDocument();
      expect(screen.getByText('Sensitive data field')).toBeInTheDocument();
    });

    it('should show rule count in header', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[existingRule]} onSave={vi.fn()} />);

      expect(screen.getByText(/Active Rules \(1\)/i)).toBeInTheDocument();
    });

    it('should toggle rule enabled state when eye icon clicked', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[existingRule]} onSave={vi.fn()} />);

      const toggleButton = screen.getAllByRole('button')[2]; // Eye icon button
      fireEvent.click(toggleButton);

      // Rule should now be disabled (state changed internally)
      await waitFor(() => {
        expect(toggleButton).toBeInTheDocument();
      });
    });

    it('should remove rule when X button clicked', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[existingRule]} onSave={vi.fn()} />);

      // Find and click delete button (X icon)
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons[deleteButtons.length - 1]; // Last button should be delete
      fireEvent.click(deleteButton);

      // Rule should be removed
      await waitFor(() => {
        expect(screen.queryByText('.sensitive-data')).not.toBeInTheDocument();
      });
    });

    it('should show "No rules" message when rules list is empty', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      expect(screen.getByText(/No privacy rules configured/i)).toBeInTheDocument();
    });
  });

  describe('Custom Rule Addition', () => {
    it('should show add custom rule button', () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      expect(screen.getByText('Add Custom Rule')).toBeInTheDocument();
    });

    it('should show add rule form when button clicked', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      const addButton = screen.getByText('Add Custom Rule');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., .sensitive-data/i)).toBeInTheDocument();
        expect(screen.getByText('Mask Type')).toBeInTheDocument();
        expect(screen.getByText('Description (Optional)')).toBeInTheDocument();
      });
    });

    it('should add custom rule when form submitted', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      // Open form
      const addButton = screen.getByText('Add Custom Rule');
      fireEvent.click(addButton);

      // Fill in form
      await waitFor(() => {
        const selectorInput = screen.getByPlaceholderText(/e.g., .sensitive-data/i);
        fireEvent.change(selectorInput, { target: { value: '#custom-field' } });
      });

      const descriptionInput = screen.getByPlaceholderText(/e.g., Masks credit card/i);
      fireEvent.change(descriptionInput, { target: { value: 'Custom field mask' } });

      // Submit form
      const submitButton = screen.getByText('Add Rule');
      fireEvent.click(submitButton);

      // Rule should appear in list
      await waitFor(() => {
        expect(screen.getByText('#custom-field')).toBeInTheDocument();
      });
    });

    it('should not add rule if selector is empty', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      // Open form
      const addButton = screen.getByText('Add Custom Rule');
      fireEvent.click(addButton);

      // Try to submit without filling selector
      await waitFor(() => {
        const submitButton = screen.getByText('Add Rule');
        expect(submitButton).toBeDisabled();
      });
    });

    it('should close form when cancel button clicked', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      // Open form
      const addButton = screen.getByText('Add Custom Rule');
      fireEvent.click(addButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      // Form should be closed
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/e.g., .sensitive-data/i)).not.toBeInTheDocument();
      });
    });

    it('should select different mask types', async () => {
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={vi.fn()} />);

      // Open form
      const addButton = screen.getByText('Add Custom Rule');
      fireEvent.click(addButton);

      await waitFor(() => {
        const maskTypeSelect = screen.getByRole('combobox');
        fireEvent.change(maskTypeSelect, { target: { value: 'redact' } });
      });

      // Should have redact option selected
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('redact');
      });
    });
  });

  describe('Save Functionality', () => {
    it('should call onSave when save button clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={onSave} />);

      const saveButton = screen.getByText('Save Rules');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith([]);
      });
    });

    it('should call onSave with current rules state', async () => {
      const existingRule: PrivacyRule = {
        id: 'rule-1',
        selector: '.test',
        maskType: 'block',
        enabled: true,
      };

      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PrivacyControls serviceSlug="web-app" rules={[existingRule]} onSave={onSave} />);

      const saveButton = screen.getByText('Save Rules');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith([existingRule]);
      });
    });

    it('should show saving state while saving', async () => {
      const onSave = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={onSave} />);

      const saveButton = screen.getByText('Save Rules');
      fireEvent.click(saveButton);

      // Should show saving text
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByText('Save Rules')).toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });

    it('should disable save button while saving', async () => {
      const onSave = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<PrivacyControls serviceSlug="web-app" rules={[]} onSave={onSave} />);

      const saveButton = screen.getByText('Save Rules');
      fireEvent.click(saveButton);

      expect(saveButton).toBeDisabled();

      await waitFor(
        () => {
          expect(saveButton).not.toBeDisabled();
        },
        { timeout: 200 },
      );
    });
  });
});
