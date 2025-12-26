import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '../../shared/clickhouse/clickhouse.service';
import {
  AdminActionQueryDto,
  AdminActionResponseDto,
  PaginatedAdminActionResponseDto,
} from '../dto/admin-action.dto';

interface AdminActionRow {
  id: string;
  timestamp: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  changes: string;
  ip_address: string;
}

@Injectable()
export class AdminActionService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async getAdminActions(query: AdminActionQueryDto): Promise<PaginatedAdminActionResponseDto> {
    const offset = ((query.page ?? 1) - 1) * (query.limit ?? 20);

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

    if (query.adminId) {
      conditions.push('admin_id = {adminId:String}');
      params.adminId = query.adminId;
    }
    if (query.action) {
      conditions.push('action = {action:String}');
      params.action = query.action;
    }
    if (query.targetType) {
      conditions.push('target_type = {targetType:String}');
      params.targetType = query.targetType;
    }
    if (query.targetId) {
      conditions.push('target_id = {targetId:String}');
      params.targetId = query.targetId;
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countSql = `
      SELECT count() as total
      FROM audit_db.admin_actions
      WHERE ${whereClause}
    `;
    const countResult = await this.clickhouse.query<{ total: string }>(countSql, params);
    const total = parseInt(countResult.data[0]?.total ?? '0', 10);

    // Data
    const dataSql = `
      SELECT
        id,
        timestamp,
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        changes,
        ip_address
      FROM audit_db.admin_actions
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `;

    const result = await this.clickhouse.query<AdminActionRow>(dataSql, params);

    const data: AdminActionResponseDto[] = result.data.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ip_address,
    }));

    return {
      data,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      totalPages: Math.ceil(total / (query.limit ?? 20)),
    };
  }

  async getAdminActionById(id: string): Promise<AdminActionResponseDto | null> {
    const sql = `
      SELECT
        id,
        timestamp,
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        changes,
        ip_address
      FROM audit_db.admin_actions
      WHERE id = {id:String}
      LIMIT 1
    `;

    const result = await this.clickhouse.query<AdminActionRow>(sql, { id });

    if (result.data.length === 0) {
      return null;
    }

    const row = result.data[0];
    return {
      id: row.id,
      timestamp: row.timestamp,
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ip_address,
    };
  }
}
