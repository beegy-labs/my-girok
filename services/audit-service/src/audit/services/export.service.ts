import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Client as MinioClient } from 'minio';
import { ClickHouseService } from '../../shared/clickhouse/clickhouse.service';
import { ID, CacheKey, CacheTTL } from '@my-girok/nest-common';
import {
  CreateExportDto,
  ExportResponseDto,
  ExportStatus,
  ExportType,
  ExportFormat,
} from '../dto/export.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly minioClient: MinioClient;
  private readonly exportBucket: string;

  constructor(
    private readonly clickhouse: ClickHouseService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const minioConfig = this.configService.get('minio');
    const exportConfig = this.configService.get('export');

    this.minioClient = new MinioClient({
      endPoint: minioConfig?.endpoint || 'localhost',
      port: minioConfig?.port || 9000,
      useSSL: minioConfig?.useSSL || false,
      accessKey: minioConfig?.accessKey || '',
      secretKey: minioConfig?.secretKey || '',
    });

    this.exportBucket = exportConfig?.bucket || 'audit-exports';
  }

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

    await this.cache.set(cacheKey, exportRecord, CacheTTL.EXPORT_STATUS);
    this.logger.debug(`Cache SET: ${cacheKey}`);

    // Start async processing
    this.processExport(exportId, dto, requestedBy).catch(async (error) => {
      this.logger.error(`Export ${exportId} failed`, error);
      const record = await this.cache.get<ExportResponseDto>(cacheKey);
      if (record) {
        record.status = ExportStatus.FAILED;
        record.error = error.message;
        await this.cache.set(cacheKey, record, CacheTTL.EXPORT_STATUS);
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

    // Generate presigned URL for MinIO download
    return this.getPresignedDownloadUrl(exportId, record.format);
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
    await this.cache.set(cacheKey, record, CacheTTL.EXPORT_STATUS);

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

    // Generate file content based on format
    const fileName = `audit-export-${exportId}.${dto.format}`;
    const fileContent = await this.generateFileContent(data, dto.format);

    // Upload to MinIO
    await this.uploadToMinIO(fileName, fileContent, dto.format);
    this.logger.log(`Export file uploaded to MinIO: ${fileName}`);

    // Log the export action
    await this.logExportAction(exportId, dto.userId, requestedBy);

    record.status = ExportStatus.COMPLETED;
    record.completedAt = new Date().toISOString();
    record.downloadUrl = `/v1/audit/export/${exportId}/download`;

    // Save completed status to cache
    await this.cache.set(cacheKey, record, CacheTTL.EXPORT_STATUS);
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

  /**
   * Generate file content based on format (CSV or JSON)
   */
  private async generateFileContent(
    data: Record<string, unknown[]>,
    format: ExportFormat,
  ): Promise<Buffer> {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
    }

    // CSV format: combine all data types into sections
    const lines: string[] = [];

    for (const [section, records] of Object.entries(data)) {
      if (records.length === 0) continue;

      lines.push(`# ${section.toUpperCase()}`);

      // Get headers from first record
      const headers = Object.keys(records[0] as object);
      lines.push(headers.join(','));

      // Add data rows
      for (const record of records) {
        const values = headers.map((h) => {
          const val = (record as Record<string, unknown>)[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        });
        lines.push(values.join(','));
      }

      lines.push(''); // Empty line between sections
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  /**
   * Upload file to MinIO bucket
   */
  private async uploadToMinIO(
    fileName: string,
    content: Buffer,
    format: ExportFormat,
  ): Promise<void> {
    const contentType = format === 'json' ? 'application/json' : 'text/csv';

    // Ensure bucket exists
    const bucketExists = await this.minioClient.bucketExists(this.exportBucket);
    if (!bucketExists) {
      await this.minioClient.makeBucket(this.exportBucket);
      this.logger.log(`Created MinIO bucket: ${this.exportBucket}`);
    }

    await this.minioClient.putObject(this.exportBucket, fileName, content, content.length, {
      'Content-Type': contentType,
    });
  }

  /**
   * Generate presigned URL for export file download
   */
  async getPresignedDownloadUrl(exportId: string, format: ExportFormat): Promise<string> {
    const fileName = `audit-export-${exportId}.${format}`;
    const expirySeconds = 3600; // 1 hour

    return this.minioClient.presignedGetObject(this.exportBucket, fileName, expirySeconds);
  }
}
