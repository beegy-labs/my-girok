import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  coverage: {
    // Exclude controllers (tested via E2E) and infrastructure
    exclude: [
      'src/**/*.controller.ts', // Controllers tested via E2E
      'src/shared/clickhouse/**', // ClickHouse infrastructure
      'src/ingestion/**', // Event ingestion service
      'src/session/**', // Session analytics
      'src/funnel/**', // Funnel analytics
      'src/behavior/**', // Behavior analytics
    ],
  },
});
