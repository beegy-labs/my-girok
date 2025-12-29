import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { ChecksumService, CircuitBreaker } from '@my-girok/nest-common';
import {
  VerifyIntegrityQueryDto,
  IntegrityVerificationResponse,
  InvalidEntryDetail,
  ChainStatsResponse,
} from '../dto/integrity.dto';

interface AuditLogRow {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_type: string;
  service_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before_state: string;
  after_state: string;
  checksum: string;
  previous_checksum: string;
}

interface CountRow {
  count: string;
}

interface ServiceCountRow {
  service_id: string;
  count: string;
}

interface DateRangeRow {
  oldest: string;
  newest: string;
}

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);
  private readonly checksumService = new ChecksumService();
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly clickhouse: ClickHouseService) {
    this.circuitBreaker = new CircuitBreaker({
      name: 'clickhouse-integrity',
      failureThreshold: 3,
      resetTimeout: 60000,
      successThreshold: 2,
    });
  }

  /**
   * Verify audit log chain integrity
   */
  async verifyIntegrity(query: VerifyIntegrityQueryDto): Promise<IntegrityVerificationResponse> {
    const startTime = Date.now();
    const limit = query.limit ?? 10000;

    // Build WHERE clause
    const conditions: string[] = ["checksum != ''"];
    const params: Record<string, string | number> = {};

    if (query.startDate) {
      conditions.push('timestamp >= {startDate:DateTime}');
      params.startDate = query.startDate;
    }

    if (query.endDate) {
      conditions.push('timestamp <= {endDate:DateTime}');
      params.endDate = query.endDate;
    }

    if (query.actorId) {
      conditions.push('actor_id = {actorId:String}');
      params.actorId = query.actorId;
    }

    if (query.serviceId) {
      conditions.push('service_id = {serviceId:String}');
      params.serviceId = query.serviceId;
    }

    const whereClause = conditions.join(' AND ');

    // Fetch entries for verification
    const result = await this.circuitBreaker.execute(() =>
      this.clickhouse.query<AuditLogRow>(
        `SELECT
          id, timestamp, actor_id, actor_type, service_id,
          action, resource_type, resource_id,
          before_state, after_state,
          checksum, previous_checksum
        FROM audit_db.admin_audit_logs
        WHERE ${whereClause}
        ORDER BY timestamp ASC
        LIMIT ${limit}`,
        params,
      ),
    );

    const entries = result.data;
    const invalidEntries: InvalidEntryDetail[] = [];
    let validCount = 0;
    let firstInvalidEntry: InvalidEntryDetail | undefined;

    // Verify each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Parse JSON states
      let beforeState: unknown;
      let afterState: unknown;
      try {
        beforeState = entry.before_state ? JSON.parse(entry.before_state) : undefined;
        afterState = entry.after_state ? JSON.parse(entry.after_state) : undefined;
      } catch {
        // If JSON parsing fails, use raw string
        beforeState = entry.before_state || undefined;
        afterState = entry.after_state || undefined;
      }

      // Calculate expected checksum
      const expectedChecksum = this.checksumService.calculateChecksum({
        id: entry.id,
        timestamp: entry.timestamp,
        actorId: entry.actor_id,
        actorType: entry.actor_type,
        serviceId: entry.service_id || undefined,
        action: entry.action,
        resourceType: entry.resource_type,
        resourceId: entry.resource_id || undefined,
        beforeState,
        afterState,
        previousChecksum: entry.previous_checksum || undefined,
      });

      if (expectedChecksum !== entry.checksum) {
        const invalidEntry: InvalidEntryDetail = {
          id: entry.id,
          timestamp: entry.timestamp,
          reason: 'Checksum mismatch',
          expectedChecksum: expectedChecksum.substring(0, 32) + '...',
          actualChecksum: entry.checksum.substring(0, 32) + '...',
        };

        invalidEntries.push(invalidEntry);

        if (!firstInvalidEntry) {
          firstInvalidEntry = invalidEntry;
        }

        if (query.stopOnFirstInvalid) {
          break;
        }
      } else {
        validCount++;
      }

      // Also verify chain linkage
      if (i > 0 && entry.previous_checksum) {
        const previousEntry = entries[i - 1];
        if (entry.previous_checksum !== previousEntry.checksum) {
          const chainBreak: InvalidEntryDetail = {
            id: entry.id,
            timestamp: entry.timestamp,
            reason: `Chain break: previous_checksum does not match entry ${previousEntry.id}`,
          };

          // Don't double-count if already invalid
          if (!invalidEntries.find((e) => e.id === entry.id)) {
            invalidEntries.push(chainBreak);
            if (!firstInvalidEntry) {
              firstInvalidEntry = chainBreak;
            }
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Determine date range from results
    let dateRange: { start: string; end: string } | undefined;
    if (entries.length > 0) {
      dateRange = {
        start: entries[0].timestamp,
        end: entries[entries.length - 1].timestamp,
      };
    }

    return {
      valid: invalidEntries.length === 0,
      totalVerified: entries.length,
      validCount,
      invalidCount: invalidEntries.length,
      invalidEntries: invalidEntries.slice(0, 100),
      firstInvalidEntry,
      verifiedAt: new Date().toISOString(),
      dateRange,
      durationMs,
    };
  }

  /**
   * Get chain statistics
   */
  async getChainStats(): Promise<ChainStatsResponse> {
    // Get total count
    const totalResult = await this.circuitBreaker.execute(() =>
      this.clickhouse.query<CountRow>(`SELECT count() as count FROM audit_db.admin_audit_logs`),
    );

    // Get count with checksums
    const checksumResult = await this.circuitBreaker.execute(() =>
      this.clickhouse.query<CountRow>(
        `SELECT count() as count FROM audit_db.admin_audit_logs WHERE checksum != ''`,
      ),
    );

    // Get date range
    const dateRangeResult = await this.circuitBreaker.execute(() =>
      this.clickhouse.query<DateRangeRow>(
        `SELECT
          min(timestamp) as oldest,
          max(timestamp) as newest
        FROM audit_db.admin_audit_logs`,
      ),
    );

    // Get counts by service
    const byServiceResult = await this.circuitBreaker.execute(() =>
      this.clickhouse.query<ServiceCountRow>(
        `SELECT
          service_id,
          count() as count
        FROM audit_db.admin_audit_logs
        WHERE service_id != ''
        GROUP BY service_id
        ORDER BY count DESC
        LIMIT 20`,
      ),
    );

    const totalEntries = parseInt(totalResult.data[0]?.count || '0', 10);
    const entriesWithChecksum = parseInt(checksumResult.data[0]?.count || '0', 10);
    const dateRange = dateRangeResult.data[0] || { oldest: '', newest: '' };

    return {
      totalEntries,
      entriesWithChecksum,
      entriesWithoutChecksum: totalEntries - entriesWithChecksum,
      dateRange: {
        oldest: dateRange.oldest,
        newest: dateRange.newest,
      },
      byService: byServiceResult.data.map((row) => ({
        serviceId: row.service_id,
        count: parseInt(row.count, 10),
      })),
    };
  }
}
