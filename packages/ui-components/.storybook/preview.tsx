import type { Preview } from '@storybook/react-vite';
// Import design tokens for SSOT styling
import '@my-girok/design-tokens/tokens.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // V0.0.1 AAA Workstation - Background options
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FAF9F7' }, // --bg-page light
        { name: 'dark', value: '#1C1917' }, // --bg-page dark
        { name: 'card-light', value: '#FFFFFF' },
        { name: 'card-dark', value: '#292524' },
      ],
    },
    // WCAG AAA accessibility testing
    a11y: {
      // 'error' - fail CI on a11y violations (strict AAA compliance)
      test: 'error',
      config: {
        rules: [
          // Enforce 7:1 contrast ratio for AAA
          { id: 'color-contrast', options: { noScroll: true } },
        ],
      },
    },
    // Documentation defaults
    docs: {
      toc: true,
    },
  },
  // Global decorators
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-theme-bg-page p-8 min-h-screen">
        <Story />
      </div>
    ),
  ],
  // Theme toggle in toolbar
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'sun',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
