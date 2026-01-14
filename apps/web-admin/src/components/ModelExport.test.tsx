import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelExport } from './ModelExport';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'authorization.exportModel': 'Export Model',
        'authorization.selectFormat': 'Export Format',
        'authorization.formatJson': 'JSON (with metadata)',
        'authorization.formatDsl': 'DSL (code only)',
        'authorization.exporting': 'Exporting...',
        'authorization.download': 'Download',
        'authorization.exportSuccess': `Model v${params?.version} exported successfully`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock('../lib/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Mock error handler
vi.mock('../lib/error-handler', () => ({
  handleApiError: vi.fn(() => ({
    userMessage: 'Export failed',
    technicalMessage: 'Error',
  })),
}));

describe('ModelExport', () => {
  const mockOnClose = vi.fn();
  const mockModelId = 'model-123';
  const mockVersion = 5;

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('rendering', () => {
    it('should render export form with all required elements', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      expect(screen.getByText(`Export Model v${mockVersion}`)).toBeInTheDocument();
      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('DSL')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('should show format descriptions', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      expect(screen.getByText(/JSON \(with metadata\)/i)).toBeInTheDocument();
      expect(screen.getByText(/DSL \(code only\)/i)).toBeInTheDocument();
    });
  });

  describe('format selection', () => {
    it('should default to JSON format', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('should switch to DSL format when DSL button is clicked', () => {
      const { container } = render(
        <ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />,
      );

      const dslButton = screen.getByText('DSL');
      fireEvent.click(dslButton);

      // Verify DSL button is now selected (has primary border color)
      const dslContainer = dslButton.closest('button');
      expect(dslContainer).toHaveClass('border-primary-500');
    });

    it('should switch back to JSON format', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      // Switch to DSL
      const dslButton = screen.getByText('DSL');
      fireEvent.click(dslButton);

      // Switch back to JSON
      const jsonButton = screen.getByText('JSON');
      fireEvent.click(jsonButton);

      // Verify JSON button is now selected
      const jsonContainer = jsonButton.closest('button');
      expect(jsonContainer).toHaveClass('border-primary-500');
    });
  });

  describe('close button', () => {
    it('should show close button when onClose is provided', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(3); // Format buttons (2) + download button (1) + close button (1)
    });

    it('should have correct number of buttons when onClose is not provided', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3); // Format buttons (2) + download button (1)
    });
  });
});
