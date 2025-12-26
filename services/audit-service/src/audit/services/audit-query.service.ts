import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '../../shared/clickhouse/clickhouse.service';
import {
  AuditLogQueryDto,
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
} from '../dto/audit-log.dto';

interface AuditLogRow {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  resource: string;
  ip_address: string;
  user_agent: string;
  metadata: string;
}

@Injectable()
export class AuditQueryService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async getAccessLogs(query: AuditLogQueryDto): Promise<PaginatedAuditLogResponseDto> {
    const offset = ((query.page ?? 1) - 1) * (query.limit ?? 20);

    // Build WHERE conditions
    const conditions: string[] = [
      'timestamp >= {startDate:DateTime64}',
      'timestamp <= {endDate:DateTime64}',
    ];
    const params: Record<string, unknown> = {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ?? 20,
      offset,
    };

    if (query.userId) {
      conditions.push('user_id = {userId:String}');
      params.userId = query.userId;
    }
    if (query.action) {
      conditions.push('action = {action:String}');
      params.action = query.action;
    }
    if (query.resource) {
      conditions.push('resource LIKE {resource:String}');
      params.resource = `%${query.resource}%`;
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countSql = `
      SELECT count() as total
      FROM audit_db.access_logs
      WHERE ${whereClause}
    `;
    const countResult = await this.clickhouse.query<{ total: string }>(countSql, params);
    const total = parseInt(countResult.data[0]?.total ?? '0', 10);

    // Data query
    const dataSql = `
      SELECT
        id,
        timestamp,
        user_id,
        action,
        resource,
        ip_address,
        user_agent,
        metadata
      FROM audit_db.access_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `;

    const result = await this.clickhouse.query<AuditLogRow>(dataSql, params);

    const data: AuditLogResponseDto[] = result.data.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));

    return {
      data,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      totalPages: Math.ceil(total / (query.limit ?? 20)),
    };
  }

  async getAccessLogById(id: string): Promise<AuditLogResponseDto | null> {
    const sql = `
      SELECT
        id,
        timestamp,
        user_id,
        action,
        resource,
        ip_address,
        user_agent,
        metadata
      FROM audit_db.access_logs
      WHERE id = {id:String}
      LIMIT 1
    `;

    const result = await this.clickhouse.query<AuditLogRow>(sql, { id });

    if (result.data.length === 0) {
      return null;
    }

    const row = result.data[0];
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
