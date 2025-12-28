import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ClickHouseService } from '../../shared/clickhouse/clickhouse.service';
import { ID, CacheKey } from '@my-girok/nest-common';
import { CreateExportDto, ExportResponseDto, ExportStatus, ExportType } from '../dto/export.dto';

// TTL for export records: 24 hours in milliseconds
const EXPORT_TTL = 24 * 60 * 60 * 1000;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly clickhouse: ClickHouseService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Generate cache key for export record
   * Format: {env}:audit:export:{exportId}
   */
  private exportCacheKey(exportId: string): string {
    return CacheKey.make('audit', 'export', exportId);
  }

  async createExport(dto: CreateExportDto, requestedBy: string): Promise<ExportResponseDto> {
    const exportId = ID.generate();
    const cacheKey = this.exportCacheKey(exportId);

    const exportRecord: ExportResponseDto = {
      id: exportId,
      userId: dto.userId,
      format: dto.format,
      status: ExportStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, exportRecord, EXPORT_TTL);
    this.logger.debug(`Cache SET: ${cacheKey}`);

    // Start async processing
    this.processExport(exportId, dto, requestedBy).catch(async (error) => {
      this.logger.error(`Export ${exportId} failed`, error);
      const record = await this.cache.get<ExportResponseDto>(cacheKey);
      if (record) {
        record.status = ExportStatus.FAILED;
        record.error = error.message;
        await this.cache.set(cacheKey, record, EXPORT_TTL);
      }
    });

    return exportRecord;
  }

  async getExportStatus(exportId: string): Promise<ExportResponseDto> {
    const cacheKey = this.exportCacheKey(exportId);
    const record = await this.cache.get<ExportResponseDto>(cacheKey);

    if (!record) {
      this.logger.debug(`Cache MISS: ${cacheKey}`);
      throw new NotFoundException(`Export ${exportId} not found`);
    }

    this.logger.debug(`Cache HIT: ${cacheKey}`);
    return record;
  }

  async getExportDownloadUrl(exportId: string): Promise<string> {
    const cacheKey = this.exportCacheKey(exportId);
    const record = await this.cache.get<ExportResponseDto>(cacheKey);

    if (!record) {
      throw new NotFoundException(`Export ${exportId} not found`);
    }
    if (record.status !== ExportStatus.COMPLETED) {
      throw new NotFoundException(`Export ${exportId} is not ready for download`);
    }
    // In production, generate a pre-signed S3 URL
    return record.downloadUrl ?? '';
  }

  private async processExport(
    exportId: string,
    dto: CreateExportDto,
    requestedBy: string,
  ): Promise<void> {
    const cacheKey = this.exportCacheKey(exportId);
    const record = await this.cache.get<ExportResponseDto>(cacheKey);
    if (!record) return;

    record.status = ExportStatus.PROCESSING;
    await this.cache.set(cacheKey, record, EXPORT_TTL);

    const data: Record<string, unknown[]> = {};

    // Collect data based on requested types
    for (const type of dto.includeTypes) {
      switch (type) {
        case ExportType.ACCESS_LOGS:
          data.accessLogs = await this.getAccessLogsForExport(
            dto.userId,
            dto.startDate,
            dto.endDate,
          );
          break;
        case ExportType.CONSENT_HISTORY:
          data.consentHistory = await this.getConsentHistoryForExport(
            dto.userId,
            dto.startDate,
            dto.endDate,
          );
          break;
        case ExportType.ADMIN_ACTIONS:
          data.adminActions = await this.getAdminActionsForExport(
            dto.userId,
            dto.startDate,
            dto.endDate,
          );
          break;
      }
    }

    // Generate file (PDF/CSV)
    // In production, upload to S3 and store URL
    const fileName = `audit-export-${exportId}.${dto.format}`;
    this.logger.log(`Generated export file: ${fileName}`);

    // Log the export action
    await this.logExportAction(exportId, dto.userId, requestedBy);

    record.status = ExportStatus.COMPLETED;
    record.completedAt = new Date().toISOString();
    record.downloadUrl = `/v1/audit/export/${exportId}/download`;

    // Save completed status to cache
    await this.cache.set(cacheKey, record, EXPORT_TTL);
    this.logger.log(`Export ${exportId} completed and cached`);
  }

  private async getAccessLogsForExport(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<unknown[]> {
    const sql = `
      SELECT *
      FROM audit_db.access_logs
      WHERE user_id = {userId:UUID}
        AND timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
      ORDER BY timestamp DESC
      LIMIT 10000
    `;

    const result = await this.clickhouse.query(sql, { userId, startDate, endDate });
    return result.data;
  }

  private async getConsentHistoryForExport(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<unknown[]> {
    const sql = `
      SELECT *
      FROM audit_db.consent_history
      WHERE user_id = {userId:UUID}
        AND timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
      ORDER BY timestamp DESC
      LIMIT 10000
    `;

    const result = await this.clickhouse.query(sql, { userId, startDate, endDate });
    return result.data;
  }

  private async getAdminActionsForExport(
    targetUserId: string,
    startDate: string,
    endDate: string,
  ): Promise<unknown[]> {
    const sql = `
      SELECT *
      FROM audit_db.admin_actions
      WHERE target_id = {targetUserId:UUID}
        AND target_type = 'user'
        AND timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
      ORDER BY timestamp DESC
      LIMIT 10000
    `;

    const result = await this.clickhouse.query(sql, { targetUserId, startDate, endDate });
    return result.data;
  }

  private async logExportAction(
    exportId: string,
    userId: string,
    requestedBy: string,
  ): Promise<void> {
    await this.clickhouse.insert('audit_db.data_exports', [
      {
        id: ID.generate(),
        timestamp: new Date().toISOString(),
        user_id: userId,
        export_type: 'admin_export',
        requested_by: requestedBy,
        status: 'completed',
        file_path: `/exports/${exportId}`,
        completed_at: new Date().toISOString(),
        retention_until: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  }
}
