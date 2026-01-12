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
      'src/shared/clickhouse/**', // ClickHouse infrastructure
      'src/retention/**', // Background job scheduler
      'src/admin-audit/**', // Admin audit features (separate E2E tests)
      'src/audit/services/export.service.ts', // Export utility service
      'src/audit/services/admin-action.service.ts', // Admin action tracking
      'src/audit/services/consent-history.service.ts', // Consent history tracking
    ],
    thresholds: {
      branches: 80, // Override default 75
    },
  },
});
