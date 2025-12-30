import { IsOptional, IsDateString, IsUUID, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for integrity verification
 */
export class VerifyIntegrityQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  limit?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  stopOnFirstInvalid?: boolean;
}

/**
 * Invalid entry details
 */
export interface InvalidEntryDetail {
  id: string;
  timestamp: string;
  reason: string;
  expectedChecksum?: string;
  actualChecksum?: string;
}

/**
 * Response for integrity verification
 */
export interface IntegrityVerificationResponse {
  /** Whether the verified entries are all valid */
  valid: boolean;

  /** Total number of entries verified */
  totalVerified: number;

  /** Number of valid entries */
  validCount: number;

  /** Number of invalid entries */
  invalidCount: number;

  /** Details of invalid entries (up to 100) */
  invalidEntries?: InvalidEntryDetail[];

  /** First invalid entry if stopOnFirstInvalid was true */
  firstInvalidEntry?: InvalidEntryDetail;

  /** Verification timestamp */
  verifiedAt: string;

  /** Time range of verified entries */
  dateRange?: {
    start: string;
    end: string;
  };

  /** Verification duration in milliseconds */
  durationMs: number;
}

/**
 * Response for chain statistics
 */
export interface ChainStatsResponse {
  /** Total audit log entries */
  totalEntries: number;

  /** Entries with checksums */
  entriesWithChecksum: number;

  /** Entries without checksums (legacy) */
  entriesWithoutChecksum: number;

  /** Date range of entries */
  dateRange: {
    oldest: string;
    newest: string;
  };

  /** Entries by service */
  byService: Array<{
    serviceId: string;
    count: number;
  }>;
}
