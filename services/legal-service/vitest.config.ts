import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  aliases: {
    '.prisma/legal-client': path.resolve(__dirname, 'node_modules/.prisma/legal-client'),
  },
});
