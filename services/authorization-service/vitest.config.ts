import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  testTimeout: 30000,
  coverage: {
    // Exclude controllers (tested via E2E), entity definitions, and infrastructure
    exclude: [
      'src/**/*.entity.ts', // Entity definitions
      'src/**/*.controller.ts', // Controllers tested via E2E
      'src/**/*guard.ts', // Guards tested via E2E
      'src/grpc/**', // gRPC infrastructure
    ],
    thresholds: {
      branches: 80, // Override default 75
    },
  },
});
