import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: [
      'src/grpc-clients/**', // gRPC client infrastructure
      'src/prisma/prisma.service.ts', // Database client wrapper
      'src/config/**', // Configuration
      'src/main.ts', // Entry point
      'src/app.module.ts', // Root module
    ],
  },
  aliases: {
    '.prisma/notification-client': path.resolve(__dirname, 'test/mocks/prisma-client.ts'),
    'firebase-admin': path.resolve(__dirname, 'test/mocks/firebase-admin.ts'),
  },
});
