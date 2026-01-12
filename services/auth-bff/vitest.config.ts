import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  // Use forks pool for ioredis compatibility
  useForks: true,
  coverage: {
    // Exclude controllers (tested via E2E) and infrastructure code from coverage
    exclude: [
      'src/**/*.controller.ts', // Controllers tested via E2E
      'src/grpc-clients/**', // gRPC client infrastructure
      'src/**/*.types.ts', // Type definition files
      'src/common/decorators/**', // Simple metadata decorators
    ],
  },
});
