module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    // Config files
    '!src/config/*.ts',
    // Base classes (abstract/infrastructure)
    '!src/database/base-prisma.service.ts',
    // Interceptors requiring infrastructure (WIP)
    '!src/common/interceptors/idempotency.interceptor.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-girok/types$': '<rootDir>/../../packages/types/src',
    '^@my-girok/nest-common$': '<rootDir>/../../packages/nest-common/src',
    // Resolve ESM .js imports to .ts files in workspace packages
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000,
  verbose: true,
  // Allow tests in test/ directory to access src/ modules
  moduleDirectories: ['node_modules', '<rootDir>'],
};
