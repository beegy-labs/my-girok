import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonacoDiffViewer } from './MonacoDiffViewer';
import * as ThemeContext from '../contexts/ThemeContext';

// Mock Monaco DiffEditor
vi.mock('@monaco-editor/react', () => ({
  DiffEditor: vi.fn(() => <div data-testid="monaco-diff-editor" />),
}));

// Mock ThemeContext
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

describe('MonacoDiffViewer', () => {
  const mockOldContent = 'type user\n\ntype resource\n  relations\n    define viewer: [user]';
  const mockNewContent =
    'type user\n\ntype resource\n  relations\n    define viewer: [user]\n    define editor: [user]';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ThemeContext.useTheme).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render diff editor', () => {
      render(<MonacoDiffViewer oldContent={mockOldContent} newContent={mockNewContent} />);

      expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
    });

    it('should render default labels', () => {
      render(<MonacoDiffViewer oldContent={mockOldContent} newContent={mockNewContent} />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('should render custom labels', () => {
      render(
        <MonacoDiffViewer
          oldContent={mockOldContent}
          newContent={mockNewContent}
          oldLabel="v4"
          newLabel="v5"
        />,
      );

      expect(screen.getByText('v4')).toBeInTheDocument();
      expect(screen.getByText('v5')).toBeInTheDocument();
    });
  });

  describe('label layout', () => {
    it('should render labels in a grid layout', () => {
      const { container } = render(
        <MonacoDiffViewer oldContent={mockOldContent} newContent={mockNewContent} />,
      );

      const grid = container.querySelector('.grid.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });
});
