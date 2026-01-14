import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelImport } from './ModelImport';

// Mock useApiMutation hook
vi.mock('../hooks/useApiMutation', () => ({
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isLoading: false,
    errorMessage: null,
  })),
}));

describe('ModelImport', () => {
  const mockOnImported = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render import form with all required elements', () => {
      render(<ModelImport onImported={mockOnImported} onClose={mockOnClose} />);

      expect(screen.getByText('Select File')).toBeInTheDocument();
      expect(screen.getByText('Version Notes (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Activate after import')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import Model/i })).toBeInTheDocument();
    });

    it('should render file input with correct accept attribute', () => {
      const { container } = render(
        <ModelImport onImported={mockOnImported} onClose={mockOnClose} />,
      );

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.json,.dsl');
    });

    it('should render notes textarea', () => {
      render(<ModelImport onImported={mockOnImported} onClose={mockOnClose} />);

      const notesTextarea = screen.getByPlaceholderText('Add notes about this imported model...');
      expect(notesTextarea).toBeInTheDocument();
      expect(notesTextarea.tagName).toBe('TEXTAREA');
    });

    it('should render activate checkbox', () => {
      render(<ModelImport onImported={mockOnImported} onClose={mockOnClose} />);

      const activateCheckbox = screen.getByRole('checkbox', { name: /Activate after import/i });
      expect(activateCheckbox).toBeInTheDocument();
      expect(activateCheckbox).not.toBeChecked();
    });
  });

  describe('button states', () => {
    it('should disable import button when no file is selected', () => {
      render(<ModelImport onImported={mockOnImported} onClose={mockOnClose} />);

      const importButton = screen.getByRole('button', { name: /Import Model/i });
      expect(importButton).toBeDisabled();
    });
  });

  describe('close button', () => {
    it('should show close button when onClose is provided', () => {
      render(<ModelImport onImported={mockOnImported} onClose={mockOnClose} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1); // Import button + close button
    });

    it('should not show extra button when onClose is not provided', () => {
      render(<ModelImport onImported={mockOnImported} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1); // Only import button
    });
  });
});
