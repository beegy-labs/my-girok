module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@my-girok/types)',
  ],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/main.ts',
    '!src/**/index.ts',
    '!src/config/*.ts',
    '!src/**/*.dto.ts',
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
    // Map .js imports to .ts files in packages/types
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@my-girok/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@my-girok/types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@my-girok/nest-common$': '<rootDir>/../../packages/nest-common/src',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  maxWorkers: '50%',
  bail: false,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 10000,
};
