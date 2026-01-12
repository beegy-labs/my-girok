import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionExport } from './SessionExport';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('SessionExport', () => {
  const mockOnClose = vi.fn();
  const sessionId = 'session-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Basic Rendering', () => {
    it('should render export section', () => {
      render(<SessionExport sessionId={sessionId} />);

      expect(screen.getByText('Download Session')).toBeInTheDocument();
      expect(screen.getByText('Share Session')).toBeInTheDocument();
    });

    it('should show format selection buttons', () => {
      render(<SessionExport sessionId={sessionId} />);

      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText(/Video \(MP4\)/)).toBeInTheDocument();
      expect(screen.getByText(/PDF Report/)).toBeInTheDocument();
    });

    it('should show "Coming soon" notice for video and PDF', () => {
      render(<SessionExport sessionId={sessionId} />);

      const comingSoonTexts = screen.getAllByText('Coming soon');
      expect(comingSoonTexts).toHaveLength(2); // Video and PDF
    });
  });

  describe('Format Selection', () => {
    it('should default to JSON format', () => {
      render(<SessionExport sessionId={sessionId} />);

      const downloadButton = screen.getByText(/Download as JSON/i);
      expect(downloadButton).toBeInTheDocument();
    });

    it('should switch to video format when clicked', () => {
      render(<SessionExport sessionId={sessionId} />);

      const videoButton = screen.getByText(/Video \(MP4\)/);
      fireEvent.click(videoButton);

      expect(screen.getByText(/Video export feature is not yet implemented/)).toBeInTheDocument();
    });

    it('should switch to PDF format when clicked', () => {
      render(<SessionExport sessionId={sessionId} />);

      const pdfButton = screen.getByText(/PDF Report/);
      fireEvent.click(pdfButton);

      expect(screen.getByText(/PDF export feature is not yet implemented/)).toBeInTheDocument();
    });
  });

  describe('JSON Export', () => {
    it('should have metadata and events checkboxes for JSON', () => {
      render(<SessionExport sessionId={sessionId} />);

      expect(screen.getByText('Include session metadata')).toBeInTheDocument();
      expect(screen.getByText('Include all events')).toBeInTheDocument();
    });

    it('should export JSON when download button is clicked', async () => {
      const mockData = { metadata: {}, events: [] };
      (apiClient.post as any).mockResolvedValue({ data: mockData });

      render(<SessionExport sessionId={sessionId} />);

      const downloadButton = screen.getByText(/Download as JSON/i);
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          `/admin/session-recordings/export/${sessionId}`,
          expect.objectContaining({
            format: 'json',
            includeMetadata: true,
            includeEvents: true,
          }),
          expect.any(Object),
        );
      });
    });

    it('should show exporting state during export', async () => {
      (apiClient.post as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<SessionExport sessionId={sessionId} />);

      const downloadButton = screen.getByText(/Download as JSON/i);
      fireEvent.click(downloadButton);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });
  });

  describe('Unimplemented Formats', () => {
    it('should disable download button for video format', () => {
      render(<SessionExport sessionId={sessionId} />);

      const videoButton = screen.getByText(/Video \(MP4\)/);
      fireEvent.click(videoButton);

      const downloadButton = screen.getByText(/Download as VIDEO/i);
      expect(downloadButton).toBeDisabled();
    });

    it('should disable download button for PDF format', () => {
      render(<SessionExport sessionId={sessionId} />);

      const pdfButton = screen.getByText(/PDF Report/);
      fireEvent.click(pdfButton);

      const downloadButton = screen.getByText(/Download as PDF/i);
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Share Link Generation', () => {
    it('should show link expiry dropdown', () => {
      render(<SessionExport sessionId={sessionId} />);

      expect(screen.getByText('Link Expiry')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should generate share link when button is clicked', async () => {
      const mockShareUrl = 'https://example.com/shared/token123';
      (apiClient.post as any).mockResolvedValue({ data: { shareUrl: mockShareUrl } });

      render(<SessionExport sessionId={sessionId} />);

      const generateButton = screen.getByText('Generate Share Link');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          `/admin/session-recordings/share/${sessionId}`,
          expect.objectContaining({
            expiresIn: '24h',
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockShareUrl)).toBeInTheDocument();
      });
    });

    it('should copy share link to clipboard when copy button is clicked', async () => {
      const mockShareUrl = 'https://example.com/shared/token123';
      (apiClient.post as any).mockResolvedValue({ data: { shareUrl: mockShareUrl } });

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(<SessionExport sessionId={sessionId} />);

      // Generate link first
      const generateButton = screen.getByText('Generate Share Link');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockShareUrl)).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockShareUrl);
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });

    it('should change link expiry when dropdown is changed', async () => {
      const mockShareUrl = 'https://example.com/shared/token123';
      (apiClient.post as any).mockResolvedValue({ data: { shareUrl: mockShareUrl } });

      render(<SessionExport sessionId={sessionId} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '7d' } });

      const generateButton = screen.getByText('Generate Share Link');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            expiresIn: '7d',
          }),
        );
      });
    });
  });

  describe('Close Button', () => {
    it('should show close button when onClose is provided', () => {
      render(<SessionExport sessionId={sessionId} onClose={mockOnClose} />);

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should not show close button when onClose is not provided', () => {
      render(<SessionExport sessionId={sessionId} />);

      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<SessionExport sessionId={sessionId} onClose={mockOnClose} />);

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
