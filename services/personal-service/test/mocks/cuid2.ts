// Mock @paralleldrive/cuid2 module for Jest tests (ESM-only package)
export const createId = jest.fn(() => 'test-cuid-00000000000000000000');
export const init = jest.fn(() => createId);
export const isCuid = jest.fn(() => true);
export const getConstants = jest.fn(() => ({
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
