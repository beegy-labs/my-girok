import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelImport } from './ModelImport';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'authorization.importModel': 'Import Model',
        'authorization.selectFile': 'Select File',
        'authorization.contentPreview': 'Content Preview (Read-Only)',
        'authorization.reviewContent': "Review the content before importing to ensure it's correct",
        'authorization.versionNotes': 'Version Notes (Optional)',
        'authorization.versionNotesPlaceholder': 'Add notes about this imported model...',
        'authorization.activateAfterImport': 'Activate after import',
        'authorization.activateWarning':
          'Activating will immediately replace the current active model. Make sure the imported model is valid.',
        'authorization.importing': 'Importing...',
        'authorization.importSuccess': 'Authorization model imported successfully',
        'authorization.fileSizeError': `File size exceeds 5MB limit. Selected file: ${params?.size}MB`,
        'authorization.fileTypeError': 'Only .json and .dsl files are supported',
        'authorization.fileReadError': 'Failed to read file content',
        'authorization.selectFileError': 'Please select a file',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useApiMutation hook
vi.mock('../hooks/useApiMutation', () => ({
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isLoading: false,
    errorMessage: null,
  })),
}));

// Mock MonacoAuthDSLEditor
vi.mock('./MonacoAuthDSLEditor', () => ({
  MonacoAuthDSLEditor: vi.fn(() => <div data-testid="monaco-editor" />),
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
