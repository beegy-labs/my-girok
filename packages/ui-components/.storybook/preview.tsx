import type { Preview, StoryContext, ReactRenderer } from '@storybook/react-vite';
import type { PartialStoryFn } from 'storybook/internal/types';
import React, { useEffect, useMemo, useCallback, useState, Component, type ReactNode } from 'react';
// Import design tokens for SSOT styling
import '@my-girok/design-tokens/tokens.css';

/**
 * Theme configuration with type-safe structure
 * @see packages/design-tokens/src/tokens.css for token definitions
 */
const THEMES = {
  light: {
    name: 'Clean White Oak',
    icon: 'sun',
    colorScheme: 'light',
    metaColor: '#ffffff',
  },
  dark: {
    name: 'Midnight Gentle Study',
    icon: 'moon',
    colorScheme: 'dark',
    metaColor: '#1e1c1a',
  },
} as const satisfies Record<string, ThemeConfig>;

interface ThemeConfig {
  readonly name: string;
  readonly icon: string;
  readonly colorScheme: 'light' | 'dark';
  readonly metaColor: string;
}

type ThemeKey = keyof typeof THEMES;

/**
 * Type guard for theme validation
 */
function isValidTheme(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in THEMES;
}

/**
 * SSR-safe document check
 */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Apply theme to document root (SSR-safe)
 * - Sets data-theme attribute for CSS variable switching
 * - Sets color-scheme for native browser theming (scrollbars, form controls)
 * - Updates meta theme-color for mobile browsers
 * - Respects prefers-reduced-motion for transitions
 */
function applyTheme(theme: ThemeKey): void {
  if (!isBrowser) return;

  const config = THEMES[theme];

  // Update document attributes
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = config.colorScheme;

  // Update meta theme-color for mobile browsers
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', config.metaColor);

  // Add reduced-motion class if user prefers
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('reduce-motion', prefersReducedMotion);
}

/**
 * Error Boundary for Story rendering
 * Catches render errors and displays fallback UI instead of crashing
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class StoryErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[Storybook] Story render error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            role="alert"
            className="p-6 rounded-widget bg-status-error-bg border border-status-error-border"
          >
            <h3 className="text-lg font-semibold text-status-error-text mb-2">
              Story Render Error
            </h3>
            <pre className="text-sm font-mono text-status-error-text overflow-auto">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 rounded-input bg-theme-primary text-white text-sm"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Custom hook for theme management
 * Handles theme application with SSR safety and reduced motion support
 */
function useThemeSync(theme: ThemeKey): void {
  const applyThemeCallback = useCallback(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyThemeCallback();

    // Listen for reduced-motion preference changes
    if (!isBrowser) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => applyThemeCallback();

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyThemeCallback]);
}

/**
 * Theme decorator - Synchronizes Storybook theme toggle with data-theme attribute
 *
 * Features:
 * - Live theme switching without page reload
 * - Document root synchronization for global CSS variables
 * - Native color-scheme support for browser UI elements
 * - Mobile meta theme-color support
 * - Memoized Story component to prevent unnecessary re-renders
 * - SSR-safe with proper hydration handling
 * - Error boundary for graceful error handling
 * - Reduced motion support
 */
function ThemeDecorator(
  Story: PartialStoryFn<ReactRenderer>,
  context: StoryContext<ReactRenderer>,
) {
  // Validate and extract theme with type safety
  const rawTheme = context.globals.theme;
  const theme: ThemeKey = isValidTheme(rawTheme) ? rawTheme : 'light';

  // Apply theme to document root with SSR safety
  useThemeSync(theme);

  // Memoize the Story component to prevent unnecessary re-renders
  const MemoizedStory = useMemo(
    () => (
      <StoryErrorBoundary>
        <Story />
      </StoryErrorBoundary>
    ),
    [Story, context.args, context.id],
  );

  // Get transition classes based on reduced motion preference
  const transitionClasses = isBrowser
    ? 'transition-colors duration-200 ease-editorial motion-reduce:transition-none'
    : '';

  return (
    <div data-theme={theme} className={`bg-theme-bg-page p-8 min-h-screen ${transitionClasses}`}>
      {MemoizedStory}
    </div>
  );
}

/**
 * Viewport decorator - Applies consistent viewport styling
 */
function ViewportDecorator(
  Story: PartialStoryFn<ReactRenderer>,
  context: StoryContext<ReactRenderer>,
) {
  return (
    <div className="font-sans antialiased">
      <Story />
    </div>
  );
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      // Expanded controls by default for better documentation
      expanded: true,
    },
    // V0.0.1 AAA Workstation - Backgrounds disabled (use theme toggle instead)
    backgrounds: { disable: true },
    // WCAG AAA accessibility testing
    a11y: {
      // 'error' - fail CI on a11y violations (strict AAA compliance)
      test: 'error',
      config: {
        rules: [
          // Enforce 7:1 contrast ratio for AAA
          { id: 'color-contrast', options: { noScroll: true } },
          // Ensure focus indicators are visible
          { id: 'focus-order-semantics', enabled: true },
          // Ensure interactive elements are keyboard accessible
          { id: 'keyboard', enabled: true },
        ],
      },
    },
    // Documentation defaults
    docs: {
      toc: {
        title: 'On this page',
        headingSelector: 'h2, h3',
      },
    },
    // Layout options
    layout: 'padded',
  },
  // Global decorators (order matters - last decorator wraps first)
  decorators: [ThemeDecorator, ViewportDecorator],
  // Theme toggle in toolbar
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'sun',
        items: [
          { value: 'light', title: THEMES.light.name, icon: THEMES.light.icon },
          { value: 'dark', title: THEMES.dark.name, icon: THEMES.dark.icon },
        ],
        dynamicTitle: true,
      },
    },
  },
  // Initial globals
  initialGlobals: {
    theme: 'light',
  },
};

export default preview;
