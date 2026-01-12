import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  // Exclude controllers (tested via E2E), queue processors (background jobs),
  // and infrastructure code from coverage
  coverage: {
    exclude: [
      'src/**/*.controller.ts', // Controllers tested via E2E
      'src/queue/processors/**', // Background job processors
      'src/queue/services/**', // Queue service wrappers
      'src/database/prisma.service.ts', // Infrastructure wrapper
    ],
  },
});
