import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelExport } from './ModelExport';

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
      expect(screen.getByRole('button', { name: /Download as JSON/i })).toBeInTheDocument();
    });

    it('should show format descriptions', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      expect(screen.getByText(/With metadata and version info/i)).toBeInTheDocument();
      expect(screen.getByText(/Code only/i)).toBeInTheDocument();
    });
  });

  describe('format selection', () => {
    it('should default to JSON format', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /Download as JSON/i })).toBeInTheDocument();
    });

    it('should switch to DSL format when DSL button is clicked', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      const dslButton = screen.getByRole('button', { name: /DSL Code only/i });
      fireEvent.click(dslButton);

      expect(screen.getByRole('button', { name: /Download as DSL/i })).toBeInTheDocument();
    });

    it('should switch back to JSON format', () => {
      render(<ModelExport modelId={mockModelId} version={mockVersion} onClose={mockOnClose} />);

      // Switch to DSL
      const dslButton = screen.getByRole('button', { name: /DSL Code only/i });
      fireEvent.click(dslButton);

      // Switch back to JSON
      const jsonButton = screen.getByRole('button', { name: /JSON With metadata/i });
      fireEvent.click(jsonButton);

      expect(screen.getByRole('button', { name: /Download as JSON/i })).toBeInTheDocument();
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
