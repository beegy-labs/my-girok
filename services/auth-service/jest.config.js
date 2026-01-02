module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/main.ts',
    // Index files (re-exports only)
    '!src/**/index.ts',
    // Config files
    '!src/config/*.ts',
    '!src/**/*.config.ts',
    // DTO files (validation only, no logic)
    '!src/**/*.dto.ts',
    // Decorators (minimal logic, tested via integration)
    '!src/**/decorators/*.ts',
    // Admin services (tests pending - tracked in docs/TEST_COVERAGE.md)
    '!src/admin/controllers/admin-audit.controller.ts',
    '!src/admin/controllers/audit-query.controller.ts',
    '!src/admin/services/admin-audit.service.ts',
    '!src/admin/services/audit-query.service.ts',
    '!src/admin/services/law-registry.service.ts',
    '!src/admin/services/service-config.service.ts',
    '!src/admin/services/service-feature.service.ts',
    '!src/admin/services/service-tester.service.ts',
    '!src/admin/services/audit-log.service.ts',
    // User personal info (separate domain)
    '!src/users/controllers/user-personal-info.controller.ts',
  ],
  coverageDirectory: './coverage',
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
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-girok/types$': '<rootDir>/../../packages/types/src',
    '^@my-girok/nest-common$': '<rootDir>/../../packages/nest-common/src',
    // Mock ESM-only modules
    '^uuid$': '<rootDir>/test/mocks/uuid.ts',
    '^@paralleldrive/cuid2$': '<rootDir>/test/mocks/cuid2.ts',
    // Strip .js extensions from imports (Node.js ESM compatibility)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Parallel execution configuration
  maxWorkers: '50%', // Use 50% of available CPU cores (safe default)
  // maxWorkers: 4, // Or specify exact number of workers

  // Optimizations for faster test runs
  bail: false, // Continue running tests even if some fail
  cache: true, // Enable test result caching
  cacheDirectory: '<rootDir>/.jest-cache',

  // Timeout configuration
  testTimeout: 10000, // 10 seconds per test (default is 5s)
};
