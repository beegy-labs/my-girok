// =============================================================================
// UUIDv7 (Primary - RFC 9562)
// =============================================================================

// Generator
export { UUIDv7, ID } from './uuidv7.generator';

// Validation Pipes
export { ParseUUIDPipe, ParseUUIDv7Pipe, UUIDValidationPipe, IdValidationPipe } from './uuid.pipe';

// NestJS Decorator
export { GenerateId } from './id.decorator';

// Utility Functions
export {
  generateIds,
  sortByUUID,
  sortByUlid,
  filterByTimeRange,
  getCreatedAt,
  isUUID,
  isUUIDv7,
  parseUUIDv7,
} from './uuidv7.utils';

// =============================================================================
// ULID (Legacy - Backward Compatibility)
// =============================================================================

export { ID as ULID } from './ulid.generator';
export { ParseUlidPipe } from './ulid.pipe';

// =============================================================================
// Prisma Extensions (Import separately to avoid loading @prisma/client)
// Usage: import { uuidv7Extension } from '@my-girok/nest-common/prisma';
// =============================================================================
// Note: Prisma extensions are NOT exported from main barrel to prevent
// loading @prisma/client in services that don't use Prisma (e.g., ClickHouse-only services)
