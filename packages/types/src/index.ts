// Auth types
export * from './auth/index.js';

// User types
export * from './user/index.js';

// Common types
export * from './common/index.js';

// Resume types
export * from './resume/index.js';

// Legal/Consent types
export * from './legal/index.js';

// Admin types
export * from './admin/index.js';

// Service types (Global Account System)
export * from './service/index.js';

// Domain Events
export * from './events/index.js';

/**
 * Identity Platform types
 *
 * For Zero Migration architecture, import identity types separately:
 * import { Account, Session } from '@my-girok/types/identity';
 *
 * This avoids conflicts with existing auth/legal types and allows
 * the identity module to be self-contained for future service separation.
 */
// Export Proto mapping utilities for gRPC type conversion
export {
  // Identity Proto mappings
  AccountStatusProto,
  AccountModeProto,
  protoToAccountStatus,
  protoToAccountMode,
  accountStatusToProto,
  accountModeToProto,
} from './identity/types.js';

// Re-export identity module as namespace for full access
export * as Identity from './identity/index.js';

// Re-export audit proto enums for SSOT
export * as Audit from './audit/index.js';
