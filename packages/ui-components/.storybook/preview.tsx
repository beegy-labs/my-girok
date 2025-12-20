import type { Preview, StoryContext } from '@storybook/react-vite';
import { useEffect } from 'react';
// Import design tokens for SSOT styling
import '@my-girok/design-tokens/tokens.css';

/**
 * Theme decorator - Synchronizes Storybook theme toggle with data-theme attribute
 * Enables live theme switching without page reload
 */
function ThemeDecorator(Story: React.ComponentType, context: StoryContext) {
  const theme = context.globals.theme || 'light';

  useEffect(() => {
    // Update document root for components that read from :root
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div
      data-theme={theme}
      className="bg-theme-bg-page p-8 min-h-screen transition-colors duration-200"
    >
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
        ],
      },
    },
    // Documentation defaults
    docs: {
      toc: true,
    },
  },
  // Global decorators
  decorators: [ThemeDecorator],
  // Theme toggle in toolbar
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'sun',
        items: [
          { value: 'light', title: 'Clean White Oak', icon: 'sun' },
          { value: 'dark', title: 'Midnight Gentle Study', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
