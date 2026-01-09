// Vitest setup file for audit-service tests
import { vi } from 'vitest';

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4003';
