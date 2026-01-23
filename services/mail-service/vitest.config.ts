import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: [
      'src/kafka/**', // Kafka infrastructure
      'src/ses/**', // AWS SES infrastructure
    ],
  },
  aliases: {
    '.prisma/mail-client': path.resolve(__dirname, 'node_modules/.prisma/mail-client'),
  },
});
