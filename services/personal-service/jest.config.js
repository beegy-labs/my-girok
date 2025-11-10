module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@my-girok/types$': '<rootDir>/../../../packages/types/src',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],

  // Parallel execution configuration
  maxWorkers: '50%', // Use 50% of available CPU cores (safe default)
  // maxWorkers: 4, // Or specify exact number of workers

  // Optimizations for faster test runs
  bail: false, // Continue running tests even if some fail
  cache: true, // Enable test result caching
  cacheDirectory: '<rootDir>/../.jest-cache',

  // Timeout configuration
  testTimeout: 10000, // 10 seconds per test (default is 5s)
};
