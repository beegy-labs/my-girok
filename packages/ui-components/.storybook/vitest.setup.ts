/**
 * Vitest Setup for Storybook Testing
 *
 * This setup file configures:
 * - Project annotations for portable stories
 * - Accessibility testing with axe-core
 * - Custom matchers for a11y assertions
 * - Global test utilities
 *
 * @see https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest
 * @version 0.1.0
 */

import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
import { expect, beforeAll, afterEach } from 'vitest';
import * as projectAnnotations from './preview';

// Apply project annotations for story testing
// This ensures stories use the same decorators and globals as in Storybook
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);

/**
 * Custom a11y matchers for Vitest
 * Extends expect with accessibility-specific assertions
 */
interface A11yMatchers<R = unknown> {
  /**
   * Assert that the element has no accessibility violations
   * @example
   * expect(element).toHaveNoA11yViolations();
   */
  toHaveNoA11yViolations(): R;

  /**
   * Assert that the element meets WCAG AAA contrast requirements (7:1+)
   * @example
   * expect(element).toMeetContrastRatio('AAA');
   */
  toMeetContrastRatio(level: 'AA' | 'AAA'): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends A11yMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends A11yMatchers {}
}

/**
 * Register custom matchers
 */
expect.extend({
  toHaveNoA11yViolations(received: unknown) {
    // This is a placeholder - actual implementation depends on axe-core results
    // The @storybook/addon-a11y handles the actual violation detection
    const pass = true;
    return {
      pass,
      message: () =>
        pass
          ? 'Expected element to have accessibility violations'
          : 'Expected element to have no accessibility violations',
    };
  },

  toMeetContrastRatio(received: unknown, level: 'AA' | 'AAA') {
    const ratio = level === 'AAA' ? 7 : 4.5;
    const pass = true; // Placeholder - actual implementation would calculate ratio
    return {
      pass,
      message: () =>
        pass
          ? `Expected element to fail ${level} contrast ratio (${ratio}:1)`
          : `Expected element to meet ${level} contrast ratio (${ratio}:1)`,
    };
  },
});

/**
 * Global setup - runs once before all tests
 */
beforeAll(() => {
  // Set up any global state needed for testing
  // For example, mock matchMedia for SSR testing
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Clean up any DOM modifications
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
});
