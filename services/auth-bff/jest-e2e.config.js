module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-girok/types$': '<rootDir>/../../packages/types/src',
    '^@my-girok/nest-common$': '<rootDir>/../../packages/nest-common/src',
  },
  testTimeout: 30000,
  verbose: true,
  moduleDirectories: ['node_modules', '<rootDir>'],
};
