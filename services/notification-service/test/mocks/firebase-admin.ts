// Mock firebase-admin for testing
// This file is used as an alias for 'firebase-admin' in vitest.config.ts
import { vi } from 'vitest';

export const apps: unknown[] = [];

export const credential = {
  cert: vi.fn(),
};

export const messaging = vi.fn(() => ({
  sendEachForMulticast: vi.fn(),
  send: vi.fn(),
  sendMulticast: vi.fn(),
}));

export const initializeApp = vi.fn();

export default {
  apps,
  credential,
  messaging,
  initializeApp,
};
