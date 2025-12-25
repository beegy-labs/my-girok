import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogResponse,
  AuditLogFilterOptions,
} from '../dto/admin-audit.dto';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List audit logs with filters and pagination
   */
  async listAuditLogs(query: AuditLogListQuery): Promise<AuditLogListResponse> {
    const { action, resource, adminId, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }
    if (resource) {
      where.resource = resource;
    }
    if (adminId) {
      where.admin_id = adminId;
    }
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        (where.created_at as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.created_at as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where,
        include: {
          admins: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get filter options for UI
   */
  async getFilterOptions(): Promise<AuditLogFilterOptions> {
    const [actions, resources, admins] = await Promise.all([
      this.prisma.audit_logs.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      this.prisma.audit_logs.findMany({
        select: { resource: true },
        distinct: ['resource'],
        orderBy: { resource: 'asc' },
      }),
      this.prisma.admins.findMany({
        where: {
          audit_logs: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      actions: actions.map((a) => a.action),
      resources: resources.map((r) => r.resource),
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
      })),
    };
  }

  /**
   * Export audit logs as CSV
   */
  async exportCsv(query: AuditLogListQuery): Promise<string> {
    // Get all matching logs (no pagination for export)
    const { action, resource, adminId, dateFrom, dateTo } = query;

    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }
    if (resource) {
      where.resource = resource;
    }
    if (adminId) {
      where.admin_id = adminId;
    }
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        (where.created_at as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.created_at as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    const items = await this.prisma.audit_logs.findMany({
      where,
      include: {
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10000, // Limit export to 10k rows
    });

    // Generate CSV
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

    const rows = items.map((item) => [
      item.id,
      item.created_at.toISOString(),
      item.admins.name,
      item.action,
      item.resource,
      item.resource_id || '',
      item.ip_address || '',
      item.user_agent || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(item: {
    id: string;
    admin_id: string;
    action: string;
    resource: string;
    resource_id: string | null;
    before_state: unknown;
    after_state: unknown;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
    admins: {
      id: string;
      name: string;
      email: string;
    };
  }): AuditLogResponse {
    return {
      id: item.id,
      adminId: item.admin_id,
      admin: {
        id: item.admins.id,
        name: item.admins.name,
        email: item.admins.email,
      },
      action: item.action,
      resource: item.resource,
      resourceId: item.resource_id,
      beforeState: item.before_state as Record<string, unknown> | null,
      afterState: item.after_state as Record<string, unknown> | null,
      ipAddress: item.ip_address,
      userAgent: item.user_agent,
      createdAt: item.created_at,
    };
  }
}
