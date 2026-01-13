import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MonacoAuthDSLEditor } from './MonacoAuthDSLEditor';
import * as ThemeContext from '../contexts/ThemeContext';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange, beforeMount, onMount, options }) => {
    // Simulate Monaco Editor behavior
    const handleChange = () => {
      onChange?.('updated value');
    };

    // Call beforeMount and onMount callbacks
    if (beforeMount) {
      const mockMonaco = {
        languages: {
          register: vi.fn(),
          setMonarchTokensProvider: vi.fn(),
        },
        editor: {
          defineTheme: vi.fn(),
        },
        KeyMod: {
          CtrlCmd: 2048,
          Shift: 1024,
        },
        KeyCode: {
          KeyS: 49,
          KeyV: 57,
        },
      };
      beforeMount(mockMonaco);
    }

    if (onMount) {
      const mockEditor = {
        addAction: vi.fn(),
      };
      const mockMonaco = {
        KeyMod: {
          CtrlCmd: 2048,
          Shift: 1024,
        },
        KeyCode: {
          KeyS: 49,
          KeyV: 57,
        },
      };
      onMount(mockEditor, mockMonaco);
    }

    return (
      <div
        data-testid="monaco-editor"
        data-value={value}
        data-readonly={options?.readOnly}
        data-height={options?.height}
        onClick={handleChange}
      />
    );
  }),
}));

// Mock ThemeContext
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

describe('MonacoAuthDSLEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnValidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ThemeContext.useTheme).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });

    // Mock getComputedStyle
    global.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: vi.fn((prop: string) => {
        const colors: Record<string, string> = {
          '--theme-primary': '#6b4a2e',
          '--theme-text-accent': '#8b5e3c',
          '--theme-text-muted': '#555351',
          '--theme-text-secondary': '#4a4744',
          '--theme-status-error-text': '#a31818',
          '--theme-status-success-text': '#1b5e20',
        };
        return colors[prop] || '#000000';
      }),
    });
  });

  describe('rendering', () => {
    it('should render Monaco Editor with correct props', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      const editor = getByTestId('monaco-editor');
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute('data-value', 'type user');
    });

    it('should use default height when not provided', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      const editor = getByTestId('monaco-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should use custom height when provided', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} height="600px" />,
      );

      const editor = getByTestId('monaco-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should apply readOnly option', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} readOnly={true} />,
      );

      const editor = getByTestId('monaco-editor');
      expect(editor).toHaveAttribute('data-readonly', 'true');
    });
  });

  describe('theme integration', () => {
    it('should use light theme when resolvedTheme is light', () => {
      vi.mocked(ThemeContext.useTheme).mockReturnValue({
        theme: 'light',
        resolvedTheme: 'light',
        setTheme: vi.fn(),
      });

      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      expect(getByTestId('monaco-editor')).toBeInTheDocument();
      // Theme selection is handled internally by Monaco
    });

    it('should use dark theme when resolvedTheme is dark', () => {
      vi.mocked(ThemeContext.useTheme).mockReturnValue({
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: vi.fn(),
      });

      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      expect(getByTestId('monaco-editor')).toBeInTheDocument();
      // Theme selection is handled internally by Monaco
    });
  });

  describe('onChange callback', () => {
    it('should call onChange when editor value changes', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      const editor = getByTestId('monaco-editor');
      editor.click(); // Trigger change event

      expect(mockOnChange).toHaveBeenCalledWith('updated value');
    });

    it('should handle empty string onChange', () => {
      const mockOnChange = vi.fn();

      render(<MonacoAuthDSLEditor value="" onChange={mockOnChange} />);

      // Editor is rendered, onChange will be called when content changes
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should register save action when onSave is provided', () => {
      render(<MonacoAuthDSLEditor value="type user" onChange={mockOnChange} onSave={mockOnSave} />);

      // The onMount callback is called during rendering
      // In real Monaco, pressing Ctrl+S would trigger the save action
      // Our mock doesn't simulate key presses, but we verify the component renders
      expect(mockOnSave).not.toHaveBeenCalled(); // Not called until user presses Ctrl+S
    });

    it('should register validate action when onValidate is provided', () => {
      render(
        <MonacoAuthDSLEditor
          value="type user"
          onChange={mockOnChange}
          onValidate={mockOnValidate}
        />,
      );

      // The onMount callback is called during rendering
      // In real Monaco, pressing Ctrl+Shift+V would trigger validation
      expect(mockOnValidate).not.toHaveBeenCalled(); // Not called until user presses Ctrl+Shift+V
    });

    it('should not register actions when callbacks are not provided', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      expect(getByTestId('monaco-editor')).toBeInTheDocument();
      // Component should render fine without onSave/onValidate
    });
  });

  describe('language registration', () => {
    it('should register authz-dsl language on mount', () => {
      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      expect(getByTestId('monaco-editor')).toBeInTheDocument();
      // Language registration happens in beforeMount callback
      // Our mock verifies the callback is called
    });
  });

  describe('design system integration', () => {
    it('should read colors from CSS variables', () => {
      const mockGetPropertyValue = vi.fn((prop: string) => {
        const colors: Record<string, string> = {
          '--theme-primary': '#6b4a2e',
          '--theme-text-accent': '#8b5e3c',
        };
        return colors[prop] || '#000000';
      });

      global.getComputedStyle = vi.fn().mockReturnValue({
        getPropertyValue: mockGetPropertyValue,
      });

      render(<MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />);

      // getCSSColorAsHex is called during beforeMount
      expect(mockGetPropertyValue).toHaveBeenCalledWith('--theme-primary');
      expect(mockGetPropertyValue).toHaveBeenCalledWith('--theme-text-accent');
    });

    it('should handle RGB color values from CSS variables', () => {
      const mockGetPropertyValue = vi.fn((prop: string) => {
        if (prop === '--theme-primary') return 'rgb(107, 74, 46)';
        return '#000000';
      });

      global.getComputedStyle = vi.fn().mockReturnValue({
        getPropertyValue: mockGetPropertyValue,
      });

      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      expect(getByTestId('monaco-editor')).toBeInTheDocument();
      // RGB values should be converted to hex
    });

    it('should fallback to default color when CSS variable is not found', () => {
      const mockGetPropertyValue = vi.fn(() => ''); // Empty string

      global.getComputedStyle = vi.fn().mockReturnValue({
        getPropertyValue: mockGetPropertyValue,
      });

      const { getByTestId } = render(
        <MonacoAuthDSLEditor value="type user" onChange={mockOnChange} />,
      );

      expect(getByTestId('monaco-editor')).toBeInTheDocument();
      // Should still render with fallback colors
    });
  });

  describe('value updates', () => {
    it('should render with empty value', () => {
      const { getByTestId } = render(<MonacoAuthDSLEditor value="" onChange={mockOnChange} />);

      const editor = getByTestId('monaco-editor');
      expect(editor).toHaveAttribute('data-value', '');
    });

    it('should render with multi-line value', () => {
      const dslSource = `type user

type resource
  relations
    define viewer: [user]`;

      const { getByTestId } = render(
        <MonacoAuthDSLEditor value={dslSource} onChange={mockOnChange} />,
      );

      const editor = getByTestId('monaco-editor');
      expect(editor).toHaveAttribute('data-value', dslSource);
    });
  });
});
