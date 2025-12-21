import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolve absolute path for monorepo/Yarn PnP compatibility
 * @param value - Package name to resolve
 * @returns Absolute path to the package directory
 */
function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

/**
 * Storybook Configuration
 *
 * @see https://storybook.js.org/docs/configure
 * @version 0.1.0
 *
 * Features:
 * - Vitest integration for component testing
 * - A11y addon with WCAG AAA enforcement
 * - Auto-generated documentation
 * - Theme switching support
 */
const config: StorybookConfig = {
  // Story discovery patterns
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  // Addon configuration (order matters for UI)
  addons: [
    // Testing & Quality
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-a11y'),
    // Documentation
    getAbsolutePath('@storybook/addon-docs'),
    // Onboarding (can be removed after initial setup)
    getAbsolutePath('@storybook/addon-onboarding'),
  ],

  // Framework configuration
  framework: getAbsolutePath('@storybook/react-vite'),

  // TypeScript configuration
  typescript: {
    // Enable type checking in stories
    check: true,
    // React docgen for prop tables
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // Include props from node_modules
      shouldExtractLiteralValuesFromEnum: true,
      // Filter out internal props
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },

  // Static directories
  staticDirs: ['../public'],

  // Vite configuration overrides
  viteFinal: async (config) => {
    return {
      ...config,
      // Optimize dependency pre-bundling
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [...(config.optimizeDeps?.include ?? []), '@storybook/addon-docs/blocks'],
      },
    };
  },

  // Documentation configuration
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },

  // Core configuration
  core: {
    // Disable telemetry
    disableTelemetry: true,
  },
};

export default config;
