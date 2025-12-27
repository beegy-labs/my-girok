import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogFilterOptions,
} from '../dto/admin-audit.dto';

/**
 * AdminAuditService
 *
 * TODO: Migrate to ClickHouse audit_db.audit_logs
 * Audit logs have been moved from PostgreSQL to ClickHouse for better performance.
 * See: services/audit-service for ClickHouse integration
 *
 * This service currently returns empty data as PostgreSQL audit_logs table was removed.
 * Integration with ClickHouse audit_db should be implemented.
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List audit logs with filters and pagination
   * TODO: Implement ClickHouse query
   */
  async listAuditLogs(query: AuditLogListQuery): Promise<AuditLogListResponse> {
    const { page = 1, limit = 20 } = query;

    // TODO: Query ClickHouse audit_db.audit_logs
    console.log('[AdminAuditService] listAuditLogs - TODO: Implement ClickHouse query', query);

    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  /**
   * Get filter options for UI
   * TODO: Implement ClickHouse query
   */
  async getFilterOptions(): Promise<AuditLogFilterOptions> {
    // TODO: Query ClickHouse audit_db for distinct values
    console.log('[AdminAuditService] getFilterOptions - TODO: Implement ClickHouse query');

    // Return admins from PostgreSQL (still available)
    const admins = await this.prisma.admins.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    return {
      actions: [],
      resources: [],
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
      })),
    };
  }

  /**
   * Export audit logs as CSV
   * TODO: Implement ClickHouse query
   */
  async exportCsv(query: AuditLogListQuery): Promise<string> {
    // TODO: Query ClickHouse audit_db.audit_logs
    console.log('[AdminAuditService] exportCsv - TODO: Implement ClickHouse query', query);

    const headers = [
      'ID',
      'Date',
      'Admin',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address',
      'User Agent',
    ];

    return headers.join(',') + '\n';
  }
}
