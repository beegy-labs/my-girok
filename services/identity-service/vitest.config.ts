import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: [
      'src/grpc/**', // gRPC infrastructure
      'src/database/identity-prisma.service.ts', // Database client wrapper
      'src/common/outbox/**', // Outbox pattern infrastructure
    ],
  },
  aliases: {
    '.prisma/identity-client': path.resolve(__dirname, 'node_modules/.prisma/identity-client'),
  },
});
