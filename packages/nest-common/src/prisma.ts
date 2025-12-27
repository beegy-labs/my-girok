// =============================================================================
// Prisma Extensions
// =============================================================================
// This file is a separate entry point for Prisma-related exports.
// Import from '@my-girok/nest-common/prisma' to avoid loading @prisma/client
// in services that don't use Prisma (e.g., ClickHouse-only services).
//
// Usage:
//   import { uuidv7Extension, ulidExtension } from '@my-girok/nest-common/prisma';

export { uuidv7Extension, ulidExtension } from './id/prisma.extension';
