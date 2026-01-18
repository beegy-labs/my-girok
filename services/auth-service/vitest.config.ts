import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';
import path from 'node:path';

export default createNestJsConfig(__dirname, {
  coverage: {
    exclude: [
      'src/**/*.config.ts',
      'src/**/decorators/*.ts',
      // Admin services (tests pending - tracked in docs/TEST_COVERAGE.md)
      'src/admin/controllers/admin-audit.controller.ts',
      'src/admin/controllers/audit-query.controller.ts',
      'src/admin/services/admin-audit.service.ts',
      'src/admin/services/audit-query.service.ts',
      'src/admin/services/law-registry.service.ts',
      'src/admin/services/service-config.service.ts',
      'src/admin/services/service-feature.service.ts',
      'src/admin/services/service-tester.service.ts',
      'src/admin/services/audit-log.service.ts',
      // User personal info (separate domain)
      'src/users/controllers/user-personal-info.controller.ts',
    ],
  },
  aliases: {
    '@prisma/auth-client': path.resolve(__dirname, 'node_modules/.prisma/auth-client'),
  },
});
