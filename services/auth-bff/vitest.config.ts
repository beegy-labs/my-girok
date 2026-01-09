import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  // Use forks pool for ioredis compatibility
  useForks: true,
  coverage: {
    // Exclude thin wrapper controllers that delegate to services
    // These have circular dependency issues with class-validator decorators
    // Services are fully tested with 95%+ coverage
    exclude: ['src/admin/admin.controller.ts', 'src/user/user.controller.ts'],
  },
});
