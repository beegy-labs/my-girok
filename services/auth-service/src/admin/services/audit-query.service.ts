import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  AuditLogQueryDto,
  AuditStatsQueryDto,
  AuditLogResponse,
  AuditStatsResponse,
  PaginatedAuditLogResponse,
} from '../dto/audit-query.dto';
import { AdminPayload } from '../types/admin.types';

interface AuditLogRow {
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
  admin_email?: string;
  admin_name?: string;
}

interface CountResult {
  count: bigint;
}

interface StatsResult {
  total: bigint;
  success_count: bigint;
}

interface ActorCountResult {
  admin_id: string;
  count: bigint;
}

interface ResourceCountResult {
  resource: string;
  action: string;
  count: bigint;
}

interface TimelineResult {
  date: Date;
  count: bigint;
}

/**
 * AuditQueryService handles querying audit logs
 *
 * Currently queries PostgreSQL audit_logs table.
 * When ClickHouse is configured, this will query ClickHouse for
 * high-volume historical data and PostgreSQL for recent data.
 */
@Injectable()
export class AuditQueryService {
  private readonly useClickHouse: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.useClickHouse = this.configService.get<string>('CLICKHOUSE_ENABLED', 'false') === 'true';
  }

  /**
   * Query audit logs with filters and pagination
   */
  async query(query: AuditLogQueryDto, admin: AdminPayload): Promise<PaginatedAuditLogResponse> {
    // For now, query PostgreSQL
    // TODO: When ClickHouse is ready, route queries there
    return this.queryPostgres(query, admin);
  }

  /**
   * Get audit statistics
   */
  async getStats(query: AuditStatsQueryDto, admin: AdminPayload): Promise<AuditStatsResponse> {
    return this.getStatsFromPostgres(query, admin);
  }

  private async queryPostgres(
    query: AuditLogQueryDto,
    admin: AdminPayload,
  ): Promise<PaginatedAuditLogResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];

    if (query.actorId) {
      conditions.push(`al.admin_id = '${query.actorId}'`);
    }

    if (query.resource) {
      conditions.push(`al.resource = '${query.resource}'`);
    }

    if (query.action) {
      conditions.push(`al.action = '${query.action}'`);
    }

    if (query.targetId) {
      conditions.push(`al.resource_id = '${query.targetId}'`);
    }

    if (query.startDate) {
      conditions.push(`al.created_at >= '${query.startDate}'`);
    }

    if (query.endDate) {
      conditions.push(`al.created_at <= '${query.endDate}'`);
    }

    // Admin scope filtering (non-system admins can only see their own logs)
    if (admin.scope !== 'SYSTEM') {
      conditions.push(`al.admin_id = '${admin.sub}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await this.prisma.$queryRawUnsafe<CountResult[]>(`
      SELECT COUNT(*) as count FROM audit_logs al ${whereClause}
    `);
    const total = Number(countResult[0]?.count || 0);

    // Get paginated results
    const rows = await this.prisma.$queryRawUnsafe<AuditLogRow[]>(`
      SELECT
        al.id, al.admin_id, al.action, al.resource, al.resource_id,
        al.before_state, al.after_state, al.ip_address, al.user_agent,
        al.created_at, a.email as admin_email, a.name as admin_name
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const data: AuditLogResponse[] = rows.map((row) => ({
      id: row.id,
      timestamp: row.created_at.toISOString(),
      actorType: 'ADMIN',
      actorId: row.admin_id,
      actorEmail: row.admin_email || '',
      serviceSlug: null,
      resource: row.resource,
      action: row.action,
      targetType: row.resource,
      targetId: row.resource_id,
      method: '',
      path: '',
      statusCode: 200,
      ipAddress: row.ip_address || '',
      success: true,
      errorMessage: null,
      durationMs: 0,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getStatsFromPostgres(
    query: AuditStatsQueryDto,
    admin: AdminPayload,
  ): Promise<AuditStatsResponse> {
    const conditions: string[] = [];

    if (query.startDate) {
      conditions.push(`created_at >= '${query.startDate}'`);
    }

    if (query.endDate) {
      conditions.push(`created_at <= '${query.endDate}'`);
    }

    if (admin.scope !== 'SYSTEM') {
      conditions.push(`admin_id = '${admin.sub}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total stats
    const totalStats = await this.prisma.$queryRawUnsafe<StatsResult[]>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) as success_count
      FROM audit_logs
      ${whereClause}
    `);

    // Get by actor
    const byActor = await this.prisma.$queryRawUnsafe<ActorCountResult[]>(`
      SELECT admin_id, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY admin_id
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get by resource/action
    const byResource = await this.prisma.$queryRawUnsafe<ResourceCountResult[]>(`
      SELECT resource, action, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY resource, action
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get timeline
    const dateFormat =
      query.groupBy === 'month'
        ? "DATE_TRUNC('month', created_at)"
        : query.groupBy === 'week'
          ? "DATE_TRUNC('week', created_at)"
          : "DATE_TRUNC('day', created_at)";

    const timeline = await this.prisma.$queryRawUnsafe<TimelineResult[]>(`
      SELECT ${dateFormat} as date, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY ${dateFormat}
      ORDER BY date DESC
      LIMIT 30
    `);

    return {
      totalActions: Number(totalStats[0]?.total || 0),
      successCount: Number(totalStats[0]?.success_count || 0),
      failureCount: 0,
      avgDurationMs: 0,
      byActor: byActor.map((a) => ({
        actorType: 'ADMIN',
        actorId: a.admin_id,
        count: Number(a.count),
      })),
      byResource: byResource.map((r) => ({
        resource: r.resource,
        action: r.action,
        count: Number(r.count),
      })),
      byService: [],
      timeline: timeline.map((t) => ({
        date: t.date.toISOString().split('T')[0],
        count: Number(t.count),
        successCount: Number(t.count),
        failureCount: 0,
      })),
    };
  }

  // ============================================================
  // ClickHouse Query Methods (for future use)
  // ============================================================

  /*
  private async queryClickHouse(
    query: AuditLogQueryDto,
    admin: AdminPayload,
  ): Promise<PaginatedAuditLogResponse> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (query.actorType) {
      conditions.push('actor_type = {actorType:String}');
      params.actorType = query.actorType;
    }

    if (query.actorId) {
      conditions.push('actor_id = {actorId:String}');
      params.actorId = query.actorId;
    }

    if (query.serviceSlug) {
      conditions.push('service_slug = {serviceSlug:String}');
      params.serviceSlug = query.serviceSlug;
    }

    if (query.resource) {
      conditions.push('resource = {resource:String}');
      params.resource = query.resource;
    }

    if (query.startDate) {
      conditions.push('timestamp >= {startDate:DateTime}');
      params.startDate = query.startDate;
    }

    if (query.endDate) {
      conditions.push('timestamp <= {endDate:DateTime}');
      params.endDate = query.endDate;
    }

    // Admin scope filtering
    if (admin.scope !== 'SYSTEM' && admin.services) {
      const serviceSlugs = Object.keys(admin.services);
      conditions.push('service_slug IN {serviceSlugs:Array(String)}');
      params.serviceSlugs = serviceSlugs;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const offset = ((query.page || 1) - 1) * (query.limit || 20);

    // Execute ClickHouse queries
    // const countResult = await this.clickhouse.query({...});
    // const result = await this.clickhouse.query({...});

    return {
      data: [],
      meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
    };
  }
  */
}
