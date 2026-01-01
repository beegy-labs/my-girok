/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/index.ts',
    '!**/*.interface.ts',
    '!**/*.types.ts',
    '!**/*.constants.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^.prisma/identity-client$': '<rootDir>/../node_modules/.prisma/identity-client',
    '^.prisma/auth-client$': '<rootDir>/../node_modules/.prisma/auth-client',
    '^.prisma/legal-client$': '<rootDir>/../node_modules/.prisma/legal-client',
  },
  // Coverage thresholds (enterprise grade)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  // Parallel execution
  maxWorkers: '50%',
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Verbose output
  verbose: true,
  // Test timeout (longer for integration tests)
  testTimeout: 30000,
  // Module paths for cleaner imports
  modulePaths: ['<rootDir>'],
};
