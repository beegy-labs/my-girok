// Mock @paralleldrive/cuid2 module for Vitest tests (ESM-only package)
import { vi } from 'vitest';

export const createId = vi.fn(() => 'test-cuid-00000000000000000000');
export const init = vi.fn(() => createId);
export const isCuid = vi.fn(() => true);
export const getConstants = vi.fn(() => ({
  defaultLength: 24,
  bigLength: 32,
}));

// Export default for CommonJS compatibility
export default {
  createId,
  init,
  isCuid,
  getConstants,
};
