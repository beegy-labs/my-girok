// Mock uuid module for Vitest tests (uuid@13+ is ESM-only)
import { vi } from 'vitest';

export const v4 = vi.fn(() => '00000000-0000-0000-0000-000000000000');
export const v1 = vi.fn(() => '00000000-0000-0000-0000-000000000001');
export const v3 = vi.fn(() => '00000000-0000-0000-0000-000000000003');
export const v5 = vi.fn(() => '00000000-0000-0000-0000-000000000005');

// Export default for CommonJS compatibility
export default {
  v4,
  v1,
  v3,
  v5,
};
