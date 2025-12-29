import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { CircuitBreaker } from '@my-girok/nest-common';
import {
  UIEventsQueryDto,
  APILogsQueryDto,
  AuditLogsQueryDto,
  SessionsQueryDto,
  StatsQueryDto,
  UIEventResponse,
  APILogResponse,
  AuditLogResponse,
  SessionResponse,
  TraceResponse,
  PaginatedResponse,
  StatsResponse,
  StatsOverview,
  ActionStats,
  ActorStats,
  ErrorStats,
} from '../dto/admin-audit.dto';

/** Maximum results for unbounded queries (actor activity, target history) */
const MAX_UNBOUNDED_RESULTS = 1000;

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly clickhouse: ClickHouseService) {
    this.circuitBreaker = new CircuitBreaker({
      name: 'clickhouse-audit',
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
    });
  }

  /**
   * Execute a ClickHouse query with circuit breaker protection
   */
  private async executeQuery<T>(
    queryFn: () => Promise<{ data: T[] }>,
    fallbackData: T[] = [],
  ): Promise<{ data: T[] }> {
    return this.circuitBreaker.executeWithFallback(queryFn, () => {
      this.logger.warn('Circuit breaker open, returning fallback data');
      return { data: fallbackData };
    });
  }

  // ===== UI Events =====

  async getUIEvents(query: UIEventsQueryDto): Promise<PaginatedResponse<UIEventResponse>> {
    const {
      startDate,
      endDate,
      serviceId,
      actorId,
      eventType,
      eventCategory,
      sessionId,
      pagePath,
      page = 1,
      limit = 50,
    } = query;

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    // Date range (required for efficient partitioning)
    if (startDate) {
      conditions.push('date >= {startDate:Date}');
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push('date <= {endDate:Date}');
      params.endDate = endDate;
    }

    // Optional filters
    if (serviceId) {
      conditions.push('service_id = {serviceId:UUID}');
      params.serviceId = serviceId;
    }
    if (actorId) {
      conditions.push('actor_id = {actorId:UUID}');
      params.actorId = actorId;
    }
    if (eventType) {
      conditions.push('event_type = {eventType:String}');
      params.eventType = eventType;
    }
    if (eventCategory) {
      conditions.push('event_category = {eventCategory:String}');
      params.eventCategory = eventCategory;
    }
    if (sessionId) {
      conditions.push('session_id = {sessionId:String}');
      params.sessionId = sessionId;
    }
    if (pagePath) {
      conditions.push('page_path LIKE {pagePath:String}');
      params.pagePath = `%${pagePath}%`;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    // Get total count with circuit breaker
    const countResult = await this.executeQuery<{ count: number }>(
      () =>
        this.clickhouse.query<{ count: number }>(
          `SELECT count() as count FROM audit_db.admin_ui_events ${whereClause}`,
          params,
        ),
      [{ count: 0 }],
    );
    const total = countResult.data[0]?.count || 0;

    // Get data with circuit breaker
    const result = await this.executeQuery<UIEventResponse>(() =>
      this.clickhouse.query<UIEventResponse>(
        `SELECT
        id,
        timestamp,
        session_id as sessionId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        event_type as eventType,
        event_name as eventName,
        event_category as eventCategory,
        page_path as pagePath,
        trace_id as traceId
      FROM audit_db.admin_ui_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
        { ...params, limit, offset },
      ),
    );

    return {
      data: result.data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUIEventById(id: string): Promise<UIEventResponse | null> {
    const result = await this.executeQuery<UIEventResponse>(() =>
      this.clickhouse.query<UIEventResponse>(
        `SELECT
        id,
        timestamp,
        session_id as sessionId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        event_type as eventType,
        event_name as eventName,
        event_category as eventCategory,
        page_path as pagePath,
        trace_id as traceId
      FROM audit_db.admin_ui_events
      WHERE id = {id:UUID}
      LIMIT 1`,
        { id },
      ),
    );
    return result.data[0] || null;
  }

  // ===== API Logs =====

  async getAPILogs(query: APILogsQueryDto): Promise<PaginatedResponse<APILogResponse>> {
    const {
      startDate,
      endDate,
      serviceId,
      actorId,
      method,
      pathTemplate,
      statusCode,
      minResponseTime,
      maxResponseTime,
      requestId,
      page = 1,
      limit = 50,
    } = query;

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (startDate) {
      conditions.push('date >= {startDate:Date}');
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push('date <= {endDate:Date}');
      params.endDate = endDate;
    }
    if (serviceId) {
      conditions.push('service_id = {serviceId:UUID}');
      params.serviceId = serviceId;
    }
    if (actorId) {
      conditions.push('actor_id = {actorId:UUID}');
      params.actorId = actorId;
    }
    if (method) {
      conditions.push('method = {method:String}');
      params.method = method;
    }
    if (pathTemplate) {
      conditions.push('path_template LIKE {pathTemplate:String}');
      params.pathTemplate = `%${pathTemplate}%`;
    }
    if (statusCode !== undefined) {
      conditions.push('status_code = {statusCode:UInt16}');
      params.statusCode = statusCode;
    }
    if (minResponseTime !== undefined) {
      conditions.push('response_time_ms >= {minResponseTime:UInt32}');
      params.minResponseTime = minResponseTime;
    }
    if (maxResponseTime !== undefined) {
      conditions.push('response_time_ms <= {maxResponseTime:UInt32}');
      params.maxResponseTime = maxResponseTime;
    }
    if (requestId) {
      conditions.push('request_id = {requestId:String}');
      params.requestId = requestId;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await this.executeQuery<{ count: number }>(
      () =>
        this.clickhouse.query<{ count: number }>(
          `SELECT count() as count FROM audit_db.admin_api_logs ${whereClause}`,
          params,
        ),
      [{ count: 0 }],
    );
    const total = countResult.data[0]?.count || 0;

    const result = await this.executeQuery<APILogResponse>(() =>
      this.clickhouse.query<APILogResponse>(
        `SELECT
        id,
        timestamp,
        request_id as requestId,
        trace_id as traceId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        method,
        path,
        path_template as pathTemplate,
        status_code as statusCode,
        response_time_ms as responseTimeMs,
        error_type as errorType,
        error_message as errorMessage
      FROM audit_db.admin_api_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
        { ...params, limit, offset },
      ),
    );

    return {
      data: result.data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAPILogById(id: string): Promise<APILogResponse | null> {
    const result = await this.executeQuery<APILogResponse>(() =>
      this.clickhouse.query<APILogResponse>(
        `SELECT
        id,
        timestamp,
        request_id as requestId,
        trace_id as traceId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        method,
        path,
        path_template as pathTemplate,
        status_code as statusCode,
        response_time_ms as responseTimeMs,
        error_type as errorType,
        error_message as errorMessage
      FROM audit_db.admin_api_logs
      WHERE id = {id:UUID}
      LIMIT 1`,
        { id },
      ),
    );
    return result.data[0] || null;
  }

  // ===== Audit Logs =====

  async getAuditLogs(query: AuditLogsQueryDto): Promise<PaginatedResponse<AuditLogResponse>> {
    const {
      startDate,
      endDate,
      serviceId,
      actorId,
      resource,
      action,
      targetId,
      complianceTags,
      page = 1,
      limit = 50,
    } = query;

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (startDate) {
      conditions.push('date >= {startDate:Date}');
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push('date <= {endDate:Date}');
      params.endDate = endDate;
    }
    if (serviceId) {
      conditions.push('service_id = {serviceId:UUID}');
      params.serviceId = serviceId;
    }
    if (actorId) {
      conditions.push('actor_id = {actorId:UUID}');
      params.actorId = actorId;
    }
    if (resource) {
      conditions.push('resource = {resource:String}');
      params.resource = resource;
    }
    if (action) {
      conditions.push('action = {action:String}');
      params.action = action;
    }
    if (targetId) {
      conditions.push('target_id = {targetId:UUID}');
      params.targetId = targetId;
    }
    if (complianceTags && complianceTags.length > 0) {
      conditions.push('hasAny(compliance_tags, {complianceTags:Array(String)})');
      params.complianceTags = complianceTags;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await this.executeQuery<{ count: number }>(
      () =>
        this.clickhouse.query<{ count: number }>(
          `SELECT count() as count FROM audit_db.admin_audit_logs ${whereClause}`,
          params,
        ),
      [{ count: 0 }],
    );
    const total = countResult.data[0]?.count || 0;

    const result = await this.executeQuery<AuditLogResponse>(() =>
      this.clickhouse.query<AuditLogResponse>(
        `SELECT
        id,
        timestamp,
        trace_id as traceId,
        actor_id as actorId,
        actor_email as actorEmail,
        actor_type as actorType,
        service_id as serviceId,
        resource,
        action,
        target_id as targetId,
        target_name as targetName,
        old_values as oldValues,
        new_values as newValues,
        compliance_tags as complianceTags
      FROM audit_db.admin_audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
        { ...params, limit, offset },
      ),
    );

    return {
      data: result.data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAuditLogById(id: string): Promise<AuditLogResponse | null> {
    const result = await this.executeQuery<AuditLogResponse>(() =>
      this.clickhouse.query<AuditLogResponse>(
        `SELECT
        id,
        timestamp,
        trace_id as traceId,
        actor_id as actorId,
        actor_email as actorEmail,
        actor_type as actorType,
        service_id as serviceId,
        resource,
        action,
        target_id as targetId,
        target_name as targetName,
        old_values as oldValues,
        new_values as newValues,
        compliance_tags as complianceTags
      FROM audit_db.admin_audit_logs
      WHERE id = {id:UUID}
      LIMIT 1`,
        { id },
      ),
    );
    return result.data[0] || null;
  }

  // ===== Sessions =====

  async getSessions(query: SessionsQueryDto): Promise<PaginatedResponse<SessionResponse>> {
    const {
      startDate,
      endDate,
      serviceId,
      actorId,
      userAgent,
      country,
      page = 1,
      limit = 50,
    } = query;

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (startDate) {
      conditions.push('date >= {startDate:Date}');
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push('date <= {endDate:Date}');
      params.endDate = endDate;
    }
    if (serviceId) {
      conditions.push('service_id = {serviceId:UUID}');
      params.serviceId = serviceId;
    }
    if (actorId) {
      conditions.push('actor_id = {actorId:UUID}');
      params.actorId = actorId;
    }
    if (userAgent) {
      conditions.push('user_agent LIKE {userAgent:String}');
      params.userAgent = `%${userAgent}%`;
    }
    if (country) {
      conditions.push('country = {country:String}');
      params.country = country;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await this.executeQuery<{ count: number }>(
      () =>
        this.clickhouse.query<{ count: number }>(
          `SELECT count() as count FROM audit_db.admin_sessions ${whereClause}`,
          params,
        ),
      [{ count: 0 }],
    );
    const total = countResult.data[0]?.count || 0;

    const result = await this.executeQuery<SessionResponse>(() =>
      this.clickhouse.query<SessionResponse>(
        `SELECT
        session_id as sessionId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        started_at as startedAt,
        last_activity_at as lastActivityAt,
        ended_at as endedAt,
        duration_seconds as duration,
        event_count as eventCount,
        page_count as pageCount,
        user_agent as userAgent,
        country
      FROM audit_db.admin_sessions
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
        { ...params, limit, offset },
      ),
    );

    return {
      data: result.data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSessionById(sessionId: string): Promise<SessionResponse | null> {
    const result = await this.executeQuery<SessionResponse>(() =>
      this.clickhouse.query<SessionResponse>(
        `SELECT
        session_id as sessionId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        started_at as startedAt,
        last_activity_at as lastActivityAt,
        ended_at as endedAt,
        duration_seconds as duration,
        event_count as eventCount,
        page_count as pageCount,
        user_agent as userAgent,
        country
      FROM audit_db.admin_sessions
      WHERE session_id = {sessionId:String}
      LIMIT 1`,
        { sessionId },
      ),
    );
    return result.data[0] || null;
  }

  async getSessionEvents(sessionId: string): Promise<UIEventResponse[]> {
    const result = await this.executeQuery<UIEventResponse>(() =>
      this.clickhouse.query<UIEventResponse>(
        `SELECT
        id,
        timestamp,
        session_id as sessionId,
        actor_id as actorId,
        actor_email as actorEmail,
        service_id as serviceId,
        event_type as eventType,
        event_name as eventName,
        event_category as eventCategory,
        page_path as pagePath,
        trace_id as traceId
      FROM audit_db.admin_ui_events
      WHERE session_id = {sessionId:String}
      ORDER BY timestamp ASC`,
        { sessionId },
      ),
    );
    return result.data;
  }

  // ===== Traces =====

  async getTraceById(traceId: string): Promise<TraceResponse> {
    const [uiEvents, apiLogs, auditLogs] = await Promise.all([
      this.executeQuery<UIEventResponse>(() =>
        this.clickhouse.query<UIEventResponse>(
          `SELECT
          id, timestamp, session_id as sessionId, actor_id as actorId,
          actor_email as actorEmail, service_id as serviceId,
          event_type as eventType, event_name as eventName,
          event_category as eventCategory, page_path as pagePath,
          trace_id as traceId
        FROM audit_db.admin_ui_events
        WHERE trace_id = {traceId:String}
        ORDER BY timestamp ASC`,
          { traceId },
        ),
      ),
      this.executeQuery<APILogResponse>(() =>
        this.clickhouse.query<APILogResponse>(
          `SELECT
          id, timestamp, request_id as requestId, trace_id as traceId,
          actor_id as actorId, actor_email as actorEmail,
          service_id as serviceId, method, path, path_template as pathTemplate,
          status_code as statusCode, response_time_ms as responseTimeMs,
          error_type as errorType, error_message as errorMessage
        FROM audit_db.admin_api_logs
        WHERE trace_id = {traceId:String}
        ORDER BY timestamp ASC`,
          { traceId },
        ),
      ),
      this.executeQuery<AuditLogResponse>(() =>
        this.clickhouse.query<AuditLogResponse>(
          `SELECT
          id, timestamp, trace_id as traceId, actor_id as actorId,
          actor_email as actorEmail, actor_type as actorType,
          service_id as serviceId, resource, action,
          target_id as targetId, target_name as targetName,
          old_values as oldValues, new_values as newValues,
          compliance_tags as complianceTags
        FROM audit_db.admin_audit_logs
        WHERE trace_id = {traceId:String}
        ORDER BY timestamp ASC`,
          { traceId },
        ),
      ),
    ]);

    return {
      traceId,
      uiEvents: uiEvents.data,
      apiLogs: apiLogs.data,
      auditLogs: auditLogs.data,
    };
  }

  // ===== Actor Activity =====

  async getActorActivity(
    actorId: string,
    startDate: string,
    endDate: string,
  ): Promise<AuditLogResponse[]> {
    const result = await this.executeQuery<AuditLogResponse>(() =>
      this.clickhouse.query<AuditLogResponse>(
        `SELECT
          id, timestamp, trace_id as traceId, actor_id as actorId,
          actor_email as actorEmail, actor_type as actorType,
          service_id as serviceId, resource, action,
          target_id as targetId, target_name as targetName,
          old_values as oldValues, new_values as newValues,
          compliance_tags as complianceTags
        FROM audit_db.admin_audit_logs
        WHERE actor_id = {actorId:UUID}
          AND date >= {startDate:Date}
          AND date <= {endDate:Date}
        ORDER BY timestamp DESC
        LIMIT {maxResults:UInt32}`,
        { actorId, startDate, endDate, maxResults: MAX_UNBOUNDED_RESULTS },
      ),
    );
    return result.data;
  }

  // ===== Target History =====

  async getTargetHistory(targetId: string): Promise<AuditLogResponse[]> {
    const result = await this.executeQuery<AuditLogResponse>(() =>
      this.clickhouse.query<AuditLogResponse>(
        `SELECT
          id, timestamp, trace_id as traceId, actor_id as actorId,
          actor_email as actorEmail, actor_type as actorType,
          service_id as serviceId, resource, action,
          target_id as targetId, target_name as targetName,
          old_values as oldValues, new_values as newValues,
          compliance_tags as complianceTags
        FROM audit_db.admin_audit_logs
        WHERE target_id = {targetId:UUID}
        ORDER BY timestamp DESC
        LIMIT {maxResults:UInt32}`,
        { targetId, maxResults: MAX_UNBOUNDED_RESULTS },
      ),
    );
    return result.data;
  }

  // ===== Stats =====

  async getStats(query: StatsQueryDto): Promise<StatsResponse> {
    const { serviceId, startDate, endDate } = query;

    const serviceFilter = serviceId ? 'AND service_id = {serviceId:UUID}' : '';
    const params: Record<string, unknown> = { startDate, endDate };
    if (serviceId) params.serviceId = serviceId;

    const [overview, actions, actors, errors] = await Promise.all([
      // Overview stats
      this.getOverviewStats(startDate, endDate, serviceId),

      // Actions by resource
      this.executeQuery<ActionStats>(() =>
        this.clickhouse.query<ActionStats>(
          `SELECT resource, action, count() as count
        FROM audit_db.admin_audit_logs
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}
        GROUP BY resource, action
        ORDER BY count DESC
        LIMIT 50`,
          params,
        ),
      ),

      // Top actors
      this.executeQuery<ActorStats>(() =>
        this.clickhouse.query<ActorStats>(
          `SELECT actor_id as actorId, actor_email as actorEmail, count() as count
        FROM audit_db.admin_audit_logs
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}
        GROUP BY actor_id, actor_email
        ORDER BY count DESC
        LIMIT 10`,
          params,
        ),
      ),

      // Error summary
      this.executeQuery<ErrorStats>(() =>
        this.clickhouse.query<ErrorStats>(
          `SELECT error_type as errorType, count() as count
        FROM audit_db.admin_api_logs
        WHERE date >= {startDate:Date} AND date <= {endDate:Date}
          ${serviceFilter}
          AND status_code >= 400
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 20`,
          params,
        ),
      ),
    ]);

    return {
      overview,
      actionsByResource: actions.data,
      topActors: actors.data,
      errorSummary: errors.data,
    };
  }

  private async getOverviewStats(
    startDate: string,
    endDate: string,
    serviceId?: string,
  ): Promise<StatsOverview> {
    const serviceFilter = serviceId ? 'AND service_id = {serviceId:UUID}' : '';
    const params: Record<string, unknown> = { startDate, endDate };
    if (serviceId) params.serviceId = serviceId;

    const [uiCount, apiStats, auditCount, sessionCount, actorCount] = await Promise.all([
      this.executeQuery<{ count: number }>(
        () =>
          this.clickhouse.query<{ count: number }>(
            `SELECT count() as count FROM audit_db.admin_ui_events
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}`,
            params,
          ),
        [{ count: 0 }],
      ),
      this.executeQuery<{ count: number; avgTime: number; errorCount: number }>(
        () =>
          this.clickhouse.query<{ count: number; avgTime: number; errorCount: number }>(
            `SELECT
          count() as count,
          avg(response_time_ms) as avgTime,
          countIf(status_code >= 400) as errorCount
        FROM audit_db.admin_api_logs
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}`,
            params,
          ),
        [{ count: 0, avgTime: 0, errorCount: 0 }],
      ),
      this.executeQuery<{ count: number }>(
        () =>
          this.clickhouse.query<{ count: number }>(
            `SELECT count() as count FROM audit_db.admin_audit_logs
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}`,
            params,
          ),
        [{ count: 0 }],
      ),
      this.executeQuery<{ count: number }>(
        () =>
          this.clickhouse.query<{ count: number }>(
            `SELECT count() as count FROM audit_db.admin_sessions
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}`,
            params,
          ),
        [{ count: 0 }],
      ),
      this.executeQuery<{ count: number }>(
        () =>
          this.clickhouse.query<{ count: number }>(
            `SELECT uniq(actor_id) as count FROM audit_db.admin_audit_logs
        WHERE date >= {startDate:Date} AND date <= {endDate:Date} ${serviceFilter}`,
            params,
          ),
        [{ count: 0 }],
      ),
    ]);

    const apiData = apiStats.data[0] || { count: 0, avgTime: 0, errorCount: 0 };
    const totalRequests = apiData.count;
    const errorRate = totalRequests > 0 ? (apiData.errorCount / totalRequests) * 100 : 0;

    return {
      totalUIEvents: uiCount.data[0]?.count || 0,
      totalAPIRequests: totalRequests,
      totalAuditLogs: auditCount.data[0]?.count || 0,
      totalSessions: sessionCount.data[0]?.count || 0,
      uniqueActors: actorCount.data[0]?.count || 0,
      avgResponseTime: Math.round(apiData.avgTime || 0),
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }
}
