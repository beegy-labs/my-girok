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
    // Route to ClickHouse for historical data when enabled
    if (this.useClickHouse && query.startDate) {
      // TODO: Implement ClickHouse query
      // return this.queryClickHouse(query, admin);
    }
    return this.queryPostgres(query, admin);
  }

  /**
   * Get audit statistics
   */
  async getStats(query: AuditStatsQueryDto, admin: AdminPayload): Promise<AuditStatsResponse> {
    return this.getStatsFromPostgres(query, admin);
  }

  /**
   * Query PostgreSQL with parameterized filters
   * Uses COALESCE pattern for optional filters (SQL-injection safe)
   */
  private async queryPostgres(
    query: AuditLogQueryDto,
    admin: AdminPayload,
  ): Promise<PaginatedAuditLogResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Use COALESCE pattern: (column = param OR param IS NULL)
    const actorIdFilter = query.actorId ?? null;
    const resourceFilter = query.resource ?? null;
    const actionFilter = query.action ?? null;
    const targetIdFilter = query.targetId ?? null;
    const startDateFilter = query.startDate ? new Date(query.startDate) : null;
    const endDateFilter = query.endDate ? new Date(query.endDate) : null;

    // Admin scope filtering (non-system admins can only see their own logs)
    const scopeFilter = admin.scope !== 'SYSTEM' ? admin.sub : null;

    // Count total
    const countResult = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM audit_logs al
      WHERE (al.admin_id = ${actorIdFilter} OR ${actorIdFilter}::TEXT IS NULL)
        AND (al.resource = ${resourceFilter} OR ${resourceFilter}::TEXT IS NULL)
        AND (al.action = ${actionFilter} OR ${actionFilter}::TEXT IS NULL)
        AND (al.resource_id = ${targetIdFilter} OR ${targetIdFilter}::TEXT IS NULL)
        AND (al.created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
        AND (al.created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
        AND (al.admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
    `;
    const total = Number(countResult[0]?.count || 0);

    // Get paginated results
    const rows = await this.prisma.$queryRaw<AuditLogRow[]>`
      SELECT
        al.id, al.admin_id, al.action, al.resource, al.resource_id,
        al.before_state, al.after_state, al.ip_address, al.user_agent,
        al.created_at, a.email as admin_email, a.name as admin_name
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      WHERE (al.admin_id = ${actorIdFilter} OR ${actorIdFilter}::TEXT IS NULL)
        AND (al.resource = ${resourceFilter} OR ${resourceFilter}::TEXT IS NULL)
        AND (al.action = ${actionFilter} OR ${actionFilter}::TEXT IS NULL)
        AND (al.resource_id = ${targetIdFilter} OR ${targetIdFilter}::TEXT IS NULL)
        AND (al.created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
        AND (al.created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
        AND (al.admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

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

  /**
   * Get stats from PostgreSQL with parameterized filters
   * Uses COALESCE pattern for optional filters (SQL-injection safe)
   */
  private async getStatsFromPostgres(
    query: AuditStatsQueryDto,
    admin: AdminPayload,
  ): Promise<AuditStatsResponse> {
    // Use COALESCE pattern for optional filters
    const startDateFilter = query.startDate ? new Date(query.startDate) : null;
    const endDateFilter = query.endDate ? new Date(query.endDate) : null;
    const scopeFilter = admin.scope !== 'SYSTEM' ? admin.sub : null;

    // Get total stats
    const totalStats = await this.prisma.$queryRaw<StatsResult[]>`
      SELECT
        COUNT(*) as total,
        COUNT(*) as success_count
      FROM audit_logs
      WHERE (created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
        AND (created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
        AND (admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
    `;

    // Get by actor
    const byActor = await this.prisma.$queryRaw<ActorCountResult[]>`
      SELECT admin_id, COUNT(*) as count
      FROM audit_logs
      WHERE (created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
        AND (created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
        AND (admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
      GROUP BY admin_id
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get by resource/action
    const byResource = await this.prisma.$queryRaw<ResourceCountResult[]>`
      SELECT resource, action, COUNT(*) as count
      FROM audit_logs
      WHERE (created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
        AND (created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
        AND (admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
      GROUP BY resource, action
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get timeline - use separate queries for different group by options
    let timeline: TimelineResult[];

    if (query.groupBy === 'month') {
      timeline = await this.prisma.$queryRaw<TimelineResult[]>`
        SELECT DATE_TRUNC('month', created_at) as date, COUNT(*) as count
        FROM audit_logs
        WHERE (created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
          AND (created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
          AND (admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
    } else if (query.groupBy === 'week') {
      timeline = await this.prisma.$queryRaw<TimelineResult[]>`
        SELECT DATE_TRUNC('week', created_at) as date, COUNT(*) as count
        FROM audit_logs
        WHERE (created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
          AND (created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
          AND (admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
    } else {
      timeline = await this.prisma.$queryRaw<TimelineResult[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM audit_logs
        WHERE (created_at >= ${startDateFilter} OR ${startDateFilter}::TIMESTAMP IS NULL)
          AND (created_at <= ${endDateFilter} OR ${endDateFilter}::TIMESTAMP IS NULL)
          AND (admin_id = ${scopeFilter} OR ${scopeFilter}::TEXT IS NULL)
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
    }

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
