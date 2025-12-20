import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/**
 * Custom Storybook theme - GIROK V0.0.1 AAA Workstation
 *
 * Uses design tokens color palette for consistent branding.
 * Light theme with Oak Brown primary accent.
 */
const girokTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'GIROK Design System',
  brandUrl: 'https://girok.dev',
  brandTarget: '_blank',

  // Typography
  fontBase:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans KR', sans-serif",
  fontCode: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",

  // Colors - Clean White Oak theme
  colorPrimary: '#6b4a2e', // --light-primary (Oak Brown)
  colorSecondary: '#6b4a2e',

  // UI
  appBg: '#f8f7f4', // --light-bg-card
  appContentBg: '#ffffff', // --light-bg-page
  appPreviewBg: '#ffffff',
  appBorderColor: '#d4d2cf', // --light-border-subtle
  appBorderRadius: 8,

  // Text colors
  textColor: '#262220', // --light-text-primary
  textInverseColor: '#ffffff',
  textMutedColor: '#4a4744', // --light-text-secondary

  // Toolbar
  barTextColor: '#4a4744',
  barSelectedColor: '#6b4a2e',
  barHoverColor: '#5d4028', // --light-primary-dark
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#a09d9a', // --light-border-default
  inputTextColor: '#262220',
  inputBorderRadius: 8,

  // Button colors
  buttonBg: '#6b4a2e',
  buttonBorder: '#6b4a2e',

  // Boolean inputs
  booleanBg: '#f8f7f4',
  booleanSelectedBg: '#6b4a2e',
});

addons.setConfig({
  theme: girokTheme,
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
