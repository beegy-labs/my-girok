/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/index.ts',
    '!src/config/**/*.ts',
    '!src/database/prisma.service.ts',
    '!src/**/*.controller.ts',
    '!src/common/cache/cache.service.ts',
    '!src/common/cache/cache-ttl.constants.ts',
    '!src/common/outbox/outbox.service.ts',
    '!src/common/outbox/outbox-publisher.job.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-girok/types$': '<rootDir>/../../packages/types/src',
    '^@my-girok/nest-common$': '<rootDir>/../../packages/nest-common/src',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: [],
  verbose: true,
  testTimeout: 10000,
};
