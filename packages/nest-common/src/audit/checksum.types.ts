/**
 * Audit log entry fields used for checksum calculation.
 * These fields represent the immutable audit record.
 */
export interface AuditLogChecksumFields {
  /** Unique log entry ID (UUIDv7) */
  id: string;

  /** Timestamp of the audit event */
  timestamp: Date | string;

  /** Actor who performed the action */
  actorId: string;

  /** Actor type: user, admin, service, system */
  actorType: string;

  /** Service where action occurred */
  serviceId?: string;

  /** Action performed */
  action: string;

  /** Resource type */
  resourceType: string;

  /** Resource ID */
  resourceId?: string;

  /** State before the change */
  beforeState?: unknown;

  /** State after the change */
  afterState?: unknown;

  /** Previous log entry checksum (for chain) */
  previousChecksum?: string;
}

/**
 * Result of a single checksum verification
 */
export interface ChecksumVerificationResult {
  /** Log entry ID */
  id: string;

  /** Whether this entry's checksum is valid */
  valid: boolean;

  /** Expected checksum */
  expectedChecksum: string;

  /** Actual stored checksum */
  actualChecksum: string;

  /** Previous entry ID in the chain */
  previousId?: string;

  /** Error message if verification failed */
  error?: string;
}

/**
 * Result of chain integrity verification
 */
export interface ChainIntegrityResult {
  /** Whether the entire chain is valid */
  valid: boolean;

  /** Total number of entries verified */
  totalEntries: number;

  /** Number of valid entries */
  validEntries: number;

  /** Number of invalid entries */
  invalidEntries: number;

  /** First invalid entry (if any) */
  firstInvalidEntry?: ChecksumVerificationResult;

  /** All invalid entries (limited to 100) */
  invalidEntries_details?: ChecksumVerificationResult[];

  /** Verification timestamp */
  verifiedAt: Date;

  /** Time range of verified entries */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Options for chain verification
 */
export interface ChainVerificationOptions {
  /** Start date for verification window */
  startDate?: Date;

  /** End date for verification window */
  endDate?: Date;

  /** Maximum number of entries to verify (default: 10000) */
  limit?: number;

  /** Actor ID to filter by */
  actorId?: string;

  /** Service ID to filter by */
  serviceId?: string;

  /** Whether to stop on first invalid entry (default: false) */
  stopOnFirstInvalid?: boolean;
}
