import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/**
 * GIROK Design Tokens - Synchronized with tokens.css
 *
 * These values MUST match packages/design-tokens/src/tokens.css
 * When updating tokens.css, update these values accordingly.
 *
 * @see packages/design-tokens/src/tokens.css
 * @version 0.1.0
 */

// Type definitions for type-safe token access
interface ThemeTokens {
  readonly bgPage: string;
  readonly bgCard: string;
  readonly bgSecondary: string;
  readonly bgElevated: string;
  readonly bgHover: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  readonly borderSubtle: string;
  readonly borderDefault: string;
  readonly borderStrong: string;
}

interface TypographyTokens {
  readonly fontBase: string;
  readonly fontCode: string;
}

interface GirokTokens {
  readonly light: ThemeTokens;
  readonly dark: ThemeTokens;
  readonly typography: TypographyTokens;
}

const GIROK_TOKENS: GirokTokens = {
  // Light Theme: "Clean White Oak"
  light: {
    // Backgrounds
    bgPage: '#ffffff',
    bgCard: '#f8f7f4',
    bgSecondary: '#f5f4f1',
    bgElevated: '#ffffff',
    bgHover: '#f0efec',
    // Text - All AAA compliant (7:1+)
    textPrimary: '#262220', // 15.76:1
    textSecondary: '#4a4744', // 9.23:1
    textTertiary: '#5a5856', // 7.08:1
    textMuted: '#555351', // 7.66:1
    // Primary - Oak Brown
    primary: '#6b4a2e', // 7.94:1
    primaryDark: '#5d4028', // 9.42:1
    primaryLight: '#8b5e3c', // 5.58:1 (decorative)
    // Borders - SC 1.4.11 compliant
    borderSubtle: '#d4d2cf', // 1.5:1 (decorative)
    borderDefault: '#a09d9a', // 3.0:1 (interactive)
    borderStrong: '#8a8785', // 3.8:1 (emphasis)
  },
  // Dark Theme: "Midnight Gentle Study"
  dark: {
    // Backgrounds
    bgPage: '#1e1c1a',
    bgCard: '#282522',
    bgSecondary: '#2d2a27',
    bgElevated: '#322f2c',
    bgHover: '#3a3734',
    // Text - All AAA compliant (7:1+)
    textPrimary: '#ccc5bd', // 9.94:1
    textSecondary: '#b4ada5', // 7.65:1
    textTertiary: '#b0a9a1', // 7.31:1
    textMuted: '#a8a199', // 6.65:1 (decorative)
    // Primary - Warm Golden Bronze
    primary: '#d0b080', // 8.25:1
    primaryDark: '#c9a876', // 7.56:1
    primaryLight: '#d8b890', // 9.04:1
    // Borders
    borderSubtle: '#4a4744', // 1.8:1 (decorative)
    borderDefault: '#6b6663', // 3.0:1 (interactive)
    borderStrong: '#8a8583', // 4.0:1 (emphasis)
  },
  // Shared
  typography: {
    fontBase:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans KR', sans-serif",
    fontCode: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  },
} as const satisfies GirokTokens;

/**
 * Light Theme - "Clean White Oak"
 */
const girokLightTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'GIROK Design System',
  brandUrl: 'https://girok.dev',
  brandTarget: '_blank',

  // Typography
  fontBase: GIROK_TOKENS.typography.fontBase,
  fontCode: GIROK_TOKENS.typography.fontCode,

  // Colors
  colorPrimary: GIROK_TOKENS.light.primary,
  colorSecondary: GIROK_TOKENS.light.primary,

  // UI
  appBg: GIROK_TOKENS.light.bgCard,
  appContentBg: GIROK_TOKENS.light.bgPage,
  appPreviewBg: GIROK_TOKENS.light.bgPage,
  appBorderColor: GIROK_TOKENS.light.borderSubtle,
  appBorderRadius: 8,

  // Text colors
  textColor: GIROK_TOKENS.light.textPrimary,
  textInverseColor: GIROK_TOKENS.light.bgPage,
  textMutedColor: GIROK_TOKENS.light.textSecondary,

  // Toolbar
  barTextColor: GIROK_TOKENS.light.textSecondary,
  barSelectedColor: GIROK_TOKENS.light.primary,
  barHoverColor: GIROK_TOKENS.light.primaryDark,
  barBg: GIROK_TOKENS.light.bgPage,

  // Form colors
  inputBg: GIROK_TOKENS.light.bgPage,
  inputBorder: GIROK_TOKENS.light.borderDefault,
  inputTextColor: GIROK_TOKENS.light.textPrimary,
  inputBorderRadius: 8,

  // Button colors
  buttonBg: GIROK_TOKENS.light.primary,
  buttonBorder: GIROK_TOKENS.light.primary,

  // Boolean inputs
  booleanBg: GIROK_TOKENS.light.bgCard,
  booleanSelectedBg: GIROK_TOKENS.light.primary,
});

/**
 * Dark Theme - "Midnight Gentle Study"
 */
const girokDarkTheme = create({
  base: 'dark',

  // Brand
  brandTitle: 'GIROK Design System',
  brandUrl: 'https://girok.dev',
  brandTarget: '_blank',

  // Typography
  fontBase: GIROK_TOKENS.typography.fontBase,
  fontCode: GIROK_TOKENS.typography.fontCode,

  // Colors
  colorPrimary: GIROK_TOKENS.dark.primary,
  colorSecondary: GIROK_TOKENS.dark.primary,

  // UI
  appBg: GIROK_TOKENS.dark.bgCard,
  appContentBg: GIROK_TOKENS.dark.bgPage,
  appPreviewBg: GIROK_TOKENS.dark.bgPage,
  appBorderColor: GIROK_TOKENS.dark.borderSubtle,
  appBorderRadius: 8,

  // Text colors
  textColor: GIROK_TOKENS.dark.textPrimary,
  textInverseColor: GIROK_TOKENS.dark.bgPage,
  textMutedColor: GIROK_TOKENS.dark.textSecondary,

  // Toolbar
  barTextColor: GIROK_TOKENS.dark.textSecondary,
  barSelectedColor: GIROK_TOKENS.dark.primary,
  barHoverColor: GIROK_TOKENS.dark.primaryLight,
  barBg: GIROK_TOKENS.dark.bgPage,

  // Form colors
  inputBg: GIROK_TOKENS.dark.bgElevated,
  inputBorder: GIROK_TOKENS.dark.borderDefault,
  inputTextColor: GIROK_TOKENS.dark.textPrimary,
  inputBorderRadius: 8,

  // Button colors
  buttonBg: GIROK_TOKENS.dark.primary,
  buttonBorder: GIROK_TOKENS.dark.primary,

  // Boolean inputs
  booleanBg: GIROK_TOKENS.dark.bgCard,
  booleanSelectedBg: GIROK_TOKENS.dark.primary,
});

/**
 * SSR-safe browser environment check
 */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Detect system color scheme preference
 * Falls back to 'light' if not in browser environment
 */
function getSystemThemePreference(): 'light' | 'dark' {
  if (!isBrowser) return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the appropriate theme based on system preference
 */
function getInitialTheme() {
  const preference = getSystemThemePreference();
  return preference === 'dark' ? girokDarkTheme : girokLightTheme;
}

/**
 * Configure Storybook addons with GIROK branding
 */
addons.setConfig({
  theme: getInitialTheme(),
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
    // Render label for better accessibility
    renderLabel: ({ name, type }) => (type === 'story' ? name : name.toUpperCase()),
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
  // Enable keyboard shortcuts
  enableShortcuts: true,
});

/**
 * Real-time system theme detection
 * Updates Storybook manager theme when system preference changes
 *
 * Note: This is a best-effort approach. Storybook manager doesn't fully
 * support runtime theme switching, but this handles initial load and
 * some edge cases.
 */
if (isBrowser) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleThemeChange = (event: MediaQueryListEvent) => {
    const newTheme = event.matches ? girokDarkTheme : girokLightTheme;
    addons.setConfig({ theme: newTheme });

    // Log theme change for debugging
    if (process.env.NODE_ENV === 'development') {
      console.info(
        `[GIROK] System theme changed to: ${event.matches ? 'Midnight Gentle Study' : 'Clean White Oak'}`,
      );
    }
  };

  // Modern API with fallback
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleThemeChange);
  } else {
    // Legacy Safari support
    mediaQuery.addListener(handleThemeChange);
  }
}

/**
 * Export tokens and themes for potential reuse
 * - Use in custom addons
 * - Use in documentation
 * - Use in testing utilities
 */
export { GIROK_TOKENS, girokLightTheme, girokDarkTheme };
export type { ThemeTokens, TypographyTokens, GirokTokens };
