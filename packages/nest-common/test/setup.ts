/**
 * Vitest test setup for @my-girok/nest-common package
 */
import 'reflect-metadata';

// Suppress console.log and console.debug during tests unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  console.log = () => {};
  console.debug = () => {};
}
