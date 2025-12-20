import type { Preview, StoryContext, ReactRenderer } from '@storybook/react-vite';
import type { PartialStoryFn } from 'storybook/internal/types';
import { useEffect, useMemo, useCallback } from 'react';
// Import design tokens for SSOT styling
import '@my-girok/design-tokens/tokens.css';

/**
 * Theme configuration
 */
const THEMES = {
  light: {
    name: 'Clean White Oak',
    icon: 'sun',
    colorScheme: 'light',
  },
  dark: {
    name: 'Midnight Gentle Study',
    icon: 'moon',
    colorScheme: 'dark',
  },
} as const;

type ThemeKey = keyof typeof THEMES;

/**
 * Apply theme to document root
 * - Sets data-theme attribute for CSS variable switching
 * - Sets color-scheme for native browser theming (scrollbars, form controls)
 * - Updates meta theme-color for mobile browsers
 */
function applyTheme(theme: ThemeKey): void {
  const { colorScheme } = THEMES[theme];

  // Update document attributes
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = colorScheme;

  // Update meta theme-color for mobile browsers
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', theme === 'dark' ? '#1e1c1a' : '#ffffff');
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
 */
function ThemeDecorator(
  Story: PartialStoryFn<ReactRenderer>,
  context: StoryContext<ReactRenderer>,
) {
  const theme = (context.globals.theme as ThemeKey) || 'light';

  // Apply theme to document root
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Memoize the Story component to prevent unnecessary re-renders
  const MemoizedStory = useMemo(() => <Story />, [Story, context.args, context.id]);

  return (
    <div
      data-theme={theme}
      className="bg-theme-bg-page p-8 min-h-screen transition-colors duration-200 ease-editorial"
    >
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
