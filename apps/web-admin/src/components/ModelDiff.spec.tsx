import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelDiff, DiffSummary } from './ModelDiff';

describe('ModelDiff', () => {
  it('should render diff header with labels', () => {
    const oldContent = 'line 1\nline 2';
    const newContent = 'line 1\nline 3';

    render(
      <ModelDiff
        oldContent={oldContent}
        newContent={newContent}
        oldLabel="Version 1"
        newLabel="Version 2"
      />,
    );

    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
  });

  it('should use default labels when not provided', () => {
    const oldContent = 'line 1';
    const newContent = 'line 2';

    render(<ModelDiff oldContent={oldContent} newContent={newContent} />);

    expect(screen.getByText('Previous Version')).toBeInTheDocument();
    expect(screen.getByText('Current Version')).toBeInTheDocument();
  });

  it('should display diff statistics', () => {
    const oldContent = 'line 1\nline 2\nline 3';
    const newContent = 'line 1\nline 4\nline 5';

    render(<ModelDiff oldContent={oldContent} newContent={newContent} />);

    // Should show additions and deletions count
    expect(screen.getByText(/additions/i)).toBeInTheDocument();
    expect(screen.getByText(/deletions/i)).toBeInTheDocument();
  });

  it('should handle identical content', () => {
    const content = 'line 1\nline 2\nline 3';

    render(<ModelDiff oldContent={content} newContent={content} />);

    // Should show 0 additions and 0 deletions
    const stats = screen.getByText(/0 additions, 0 deletions/i);
    expect(stats).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    render(<ModelDiff oldContent="" newContent="" />);

    expect(screen.getByText('Previous Version')).toBeInTheDocument();
    expect(screen.getByText('Current Version')).toBeInTheDocument();
  });

  it('should render content with proper formatting', () => {
    const oldContent = 'line 1\nline 2';
    const newContent = 'line 1\nline 3';

    const { container } = render(<ModelDiff oldContent={oldContent} newContent={newContent} />);

    // Check for monospace font
    const diffContent = container.querySelector('.font-mono');
    expect(diffContent).toBeInTheDocument();
  });
});

describe('DiffSummary', () => {
  it('should display correct addition count', () => {
    const oldContent = 'line 1\nline 2';
    const newContent = 'line 1\nline 2\nline 3\nline 4';

    render(<DiffSummary oldContent={oldContent} newContent={newContent} />);

    // diffLines counts change blocks, not individual lines
    // Adding 2 lines at the end creates 1 addition block
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('additions')).toBeInTheDocument();
  });

  it('should display correct deletion count', () => {
    const oldContent = 'line 1\nline 2\nline 3';
    const newContent = 'line 1';

    render(<DiffSummary oldContent={oldContent} newContent={newContent} />);

    // diffLines counts change blocks, not individual lines
    // Removing 2 lines at the end creates 1 deletion block
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('deletions')).toBeInTheDocument();
  });

  it('should handle identical content with zero changes', () => {
    const content = 'line 1\nline 2';

    render(<DiffSummary oldContent={content} newContent={content} />);

    expect(screen.getByText('+0')).toBeInTheDocument();
    expect(screen.getByText('-0')).toBeInTheDocument();
  });

  it('should use theme color classes', () => {
    const oldContent = 'line 1';
    const newContent = 'line 2';

    const { container } = render(<DiffSummary oldContent={oldContent} newContent={newContent} />);

    // Should use theme classes instead of hardcoded colors
    const successText = container.querySelector('.text-theme-status-success-text');
    const errorText = container.querySelector('.text-theme-status-error-text');

    expect(successText).toBeInTheDocument();
    expect(errorText).toBeInTheDocument();
  });
});
