import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';
import * as ThemeContext from '../contexts/ThemeContext';
import { Toaster } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  Toaster: vi.fn(({ children, theme, ...props }) => (
    <div
      data-testid="toaster"
      data-theme={theme}
      data-position={props.position}
      data-expand={props.expand}
      data-rich-colors={props.richColors}
      data-close-button={props.closeButton}
    >
      {children}
    </div>
  )),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock ThemeContext
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ThemeContext.useTheme).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child Component</div>
        </ToastProvider>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    it('should render Toaster component', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });

  describe('theme integration', () => {
    it('should use light theme when resolvedTheme is light', () => {
      vi.mocked(ThemeContext.useTheme).mockReturnValue({
        theme: 'light',
        resolvedTheme: 'light',
        setTheme: vi.fn(),
      });

      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-theme', 'light');
    });

    it('should use dark theme when resolvedTheme is dark', () => {
      vi.mocked(ThemeContext.useTheme).mockReturnValue({
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: vi.fn(),
      });

      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-theme', 'dark');
    });

    it('should update theme when resolvedTheme changes', () => {
      const { rerender } = render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      expect(screen.getByTestId('toaster')).toHaveAttribute('data-theme', 'light');

      // Change theme to dark
      vi.mocked(ThemeContext.useTheme).mockReturnValue({
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: vi.fn(),
      });

      rerender(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      expect(screen.getByTestId('toaster')).toHaveAttribute('data-theme', 'dark');
    });
  });

  describe('toaster configuration', () => {
    it('should set correct position', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-position', 'bottom-right');
    });

    it('should set expand to false', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-expand', 'false');
    });

    it('should enable richColors', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-rich-colors', 'true');
    });

    it('should enable closeButton', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-close-button', 'true');
    });
  });

  describe('multiple children', () => {
    it('should render multiple children', () => {
      render(
        <ToastProvider>
          <div data-testid="child1">First Child</div>
          <div data-testid="child2">Second Child</div>
          <div data-testid="child3">Third Child</div>
        </ToastProvider>,
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
      expect(screen.getByTestId('child3')).toBeInTheDocument();
    });
  });

  describe('Toaster props', () => {
    it('should pass toastOptions with classNames', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      // Toaster is called with toastOptions
      const lastCall = vi.mocked(Toaster).mock.calls[vi.mocked(Toaster).mock.calls.length - 1];
      const props = lastCall[0];

      expect(props).toMatchObject({
        toastOptions: {
          classNames: {
            toast: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            actionButton: expect.any(String),
            cancelButton: expect.any(String),
            closeButton: expect.any(String),
            error: expect.any(String),
            success: expect.any(String),
            warning: expect.any(String),
            info: expect.any(String),
          },
        },
      });
    });

    it('should use theme-aware CSS classes', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const lastCall = vi.mocked(Toaster).mock.calls[vi.mocked(Toaster).mock.calls.length - 1];
      const toastOptions = lastCall[0]?.toastOptions;

      // Verify toastOptions and classNames are defined
      expect(toastOptions).toBeDefined();
      expect(toastOptions?.classNames).toBeDefined();

      // Verify theme classes are used (using non-null assertion after toBeDefined check)
      expect(toastOptions!.classNames!.toast).toContain('bg-theme-bg-card');
      expect(toastOptions!.classNames!.toast).toContain('border-theme-border-default');
      expect(toastOptions!.classNames!.title).toContain('text-theme-text-primary');
      expect(toastOptions!.classNames!.description).toContain('text-theme-text-secondary');
    });

    it('should use status-specific CSS classes', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>,
      );

      const lastCall = vi.mocked(Toaster).mock.calls[vi.mocked(Toaster).mock.calls.length - 1];
      const toastOptions = lastCall[0]?.toastOptions;

      // Verify toastOptions and classNames are defined
      expect(toastOptions).toBeDefined();
      expect(toastOptions?.classNames).toBeDefined();

      // Verify status-specific classes (using non-null assertion after toBeDefined check)
      expect(toastOptions!.classNames!.error).toContain('bg-theme-status-error-bg');
      expect(toastOptions!.classNames!.success).toContain('bg-theme-status-success-bg');
      expect(toastOptions!.classNames!.warning).toContain('bg-theme-status-warning-bg');
      expect(toastOptions!.classNames!.info).toContain('bg-theme-status-info-bg');
    });
  });

  describe('integration', () => {
    it('should work with nested providers', () => {
      render(
        <ToastProvider>
          <div data-testid="outer">
            <ToastProvider>
              <div data-testid="inner">Nested Provider</div>
            </ToastProvider>
          </div>
        </ToastProvider>,
      );

      expect(screen.getByTestId('outer')).toBeInTheDocument();
      expect(screen.getByTestId('inner')).toBeInTheDocument();
      // Both Toaster components should render
      const toasters = screen.getAllByTestId('toaster');
      expect(toasters.length).toBe(2);
    });

    it('should maintain children structure', () => {
      render(
        <ToastProvider>
          <header>Header</header>
          <main>Main Content</main>
          <footer>Footer</footer>
        </ToastProvider>,
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle null children', () => {
      render(<ToastProvider>{null}</ToastProvider>);

      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<ToastProvider>{undefined}</ToastProvider>);

      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });

    it('should handle empty fragment', () => {
      render(
        <ToastProvider>
          <></>
        </ToastProvider>,
      );

      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });
});
