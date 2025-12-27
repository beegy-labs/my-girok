// =============================================================================
// ClickHouse Exports
// =============================================================================
// This file is a separate entry point for ClickHouse-related exports.
// Import from '@my-girok/nest-common/clickhouse' to avoid loading @clickhouse/client
// in services that don't use ClickHouse.
//
// Usage:
//   import { ClickHouseService, ClickHouseModule } from '@my-girok/nest-common/clickhouse';

export * from './clickhouse';
