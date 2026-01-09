import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  testTimeout: 30000,
  coverage: {
    exclude: ['src/**/*.entity.ts'],
    thresholds: {
      branches: 80, // Override default 75
    },
  },
});
