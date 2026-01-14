import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { CircuitBreaker } from '@my-girok/nest-common';
import { randomUUID } from 'crypto';
import {
  RecordingEventBatchDto,
  SessionEventDto,
  PageViewEventDto,
  SessionRecordingQueryDto,
  SessionRecordingMetadataDto,
  SessionRecordingListResponseDto,
  SessionRecordingEventsDto,
} from '../dto/session-recording.dto';

@Injectable()
export class SessionRecordingService {
  private readonly logger = new Logger(SessionRecordingService.name);
  private readonly circuitBreaker: CircuitBreaker;
  private readonly database: string;

  constructor(
    private readonly clickhouse: ClickHouseService,
    private readonly configService: ConfigService,
  ) {
    this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
    this.circuitBreaker = new CircuitBreaker({
      name: 'clickhouse-recordings',
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
    });
  }

  private async executeQuery<T>(
    queryFn: () => Promise<{ data: T[] }>,
    fallbackData: T[] = [],
  ): Promise<{ data: T[] }> {
    return this.circuitBreaker.executeWithFallback(queryFn, () => {
      this.logger.warn('Circuit breaker open, returning fallback data');
      return { data: fallbackData };
    });
  }

  /**
   * Save a batch of recording events
   */
  async saveEventBatch(
    batch: RecordingEventBatchDto,
    context: {
      actorId?: string;
      actorType?: string;
      actorEmail?: string;
      serviceSlug: string;
      ipAddress: string;
      userAgent: string;
    },
  ): Promise<{ success: boolean; eventId: string }> {
    const eventId = randomUUID();
    const now = new Date();

    // Parse device info from user agent
    const deviceInfo = this.parseUserAgent(context.userAgent);

    // Anonymize IP for GDPR
    const ipAnonymized = this.anonymizeIp(context.ipAddress);

    try {
      await this.clickhouse.insert(`${this.database}.session_recordings`, [
        {
          id: eventId,
          timestamp: now.toISOString(),
          date: now.toISOString().split('T')[0],
          session_id: batch.sessionId,
          sequence_start: batch.sequenceStart,
          sequence_end: batch.sequenceEnd,
          actor_id: context.actorId || null,
          actor_type: context.actorType || null,
          actor_email: context.actorEmail || null,
          service_slug: context.serviceSlug,
          service_version: null,
          events: JSON.stringify(batch.events),
          events_count: batch.events.length,
          events_compressed: false,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browserVersion,
          os: deviceInfo.os,
          os_version: deviceInfo.osVersion,
          device_type: deviceInfo.deviceType,
          screen_resolution: batch.metadata?.screenResolution || '',
          viewport_width: batch.metadata?.viewportWidth || 0,
          viewport_height: batch.metadata?.viewportHeight || 0,
          timezone: batch.metadata?.timezone || '',
          language: batch.metadata?.language || '',
          user_agent: context.userAgent,
          device_fingerprint: batch.metadata?.deviceFingerprint || null,
          ip_address: context.ipAddress,
          ip_anonymized: ipAnonymized,
          country_code: '', // Would be resolved by GeoIP in production
          trace_id: null,
          span_id: null,
          retention_until: this.getRetentionDate(90),
        },
      ]);

      this.logger.debug(`Saved recording batch for session ${batch.sessionId}`);
      return { success: true, eventId };
    } catch (error) {
      this.logger.error(`Failed to save recording batch: ${error}`);
      throw error;
    }
  }

  /**
   * Handle session start/end events
   */
  async handleSessionEvent(
    event: SessionEventDto,
    context: { ipAddress: string; userAgent: string },
  ): Promise<{ success: boolean }> {
    const deviceInfo = this.parseUserAgent(context.userAgent);

    if (event.action === 'start') {
      // Create or update session metadata
      await this.clickhouse.insert(`${this.database}.session_recording_metadata`, [
        {
          session_id: event.sessionId,
          date: new Date().toISOString().split('T')[0],
          actor_id: event.actorId || null,
          actor_type: event.actorType || null,
          actor_email: event.actorEmail || null,
          service_slug: event.serviceSlug || 'unknown',
          started_at: event.startedAt || new Date().toISOString(),
          ended_at: null,
          last_event_at: new Date().toISOString(),
          duration_seconds: 0,
          total_events: 0,
          total_batches: 0,
          total_bytes: 0,
          page_views: 0,
          clicks: 0,
          inputs: 0,
          scrolls: 0,
          errors: 0,
          entry_page: '',
          exit_page: '',
          pages_visited: [],
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_type: deviceInfo.deviceType,
          screen_resolution: event.screenResolution || '',
          country_code: '',
          device_fingerprint: event.deviceFingerprint || null,
          status: 'recording',
          has_errors: false,
          retention_until: this.getRetentionDate(90),
        },
      ]);
    } else if (event.action === 'end') {
      // Update session metadata with end time
      const duration = event.duration ? Math.floor(event.duration / 1000) : 0;
      await this.clickhouse.query(
        `ALTER TABLE ${this.database}.session_recording_metadata_local
         UPDATE
           ended_at = {endedAt:DateTime64(3)},
           last_event_at = {endedAt:DateTime64(3)},
           duration_seconds = {duration:UInt32},
           status = 'completed'
         WHERE session_id = {sessionId:String}`,
        {
          sessionId: event.sessionId,
          endedAt: event.endedAt || new Date().toISOString(),
          duration,
        },
      );
    }

    return { success: true };
  }

  /**
   * Save page view event
   */
  async savePageView(event: PageViewEventDto): Promise<{ success: boolean }> {
    // Update session metadata with page view
    await this.clickhouse.query(
      `ALTER TABLE ${this.database}.session_recording_metadata_local
       UPDATE
         page_views = page_views + 1,
         last_event_at = {timestamp:DateTime64(3)},
         pages_visited = arrayPushBack(pages_visited, {path:String}),
         exit_page = {path:String}
       WHERE session_id = {sessionId:String}`,
      {
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        path: event.path,
      },
    );

    return { success: true };
  }

  /**
   * List session recordings with filters
   */
  async listSessions(query: SessionRecordingQueryDto): Promise<SessionRecordingListResponseDto> {
    const { serviceSlug, actorId, deviceType, startDate, endDate, page = 1, limit = 20 } = query;

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (serviceSlug) {
      conditions.push('service_slug = {serviceSlug:String}');
      params.serviceSlug = serviceSlug;
    }
    if (actorId) {
      conditions.push('actor_id = {actorId:UUID}');
      params.actorId = actorId;
    }
    if (deviceType) {
      conditions.push('device_type = {deviceType:String}');
      params.deviceType = deviceType;
    }
    if (startDate) {
      conditions.push('date >= {startDate:Date}');
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push('date <= {endDate:Date}');
      params.endDate = endDate;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.executeQuery<{ count: number }>(
      () =>
        this.clickhouse.query<{ count: number }>(
          `SELECT count() as count FROM ${this.database}.session_recording_metadata ${whereClause}`,
          params,
        ),
      [{ count: 0 }],
    );
    const total = countResult.data[0]?.count || 0;

    // Get sessions
    const result = await this.executeQuery<SessionRecordingMetadataDto>(() =>
      this.clickhouse.query<SessionRecordingMetadataDto>(
        `SELECT
          session_id as sessionId,
          actor_id as actorId,
          actor_type as actorType,
          actor_email as actorEmail,
          service_slug as serviceSlug,
          started_at as startedAt,
          ended_at as endedAt,
          duration_seconds as durationSeconds,
          total_events as totalEvents,
          page_views as pageViews,
          clicks,
          entry_page as entryPage,
          exit_page as exitPage,
          browser,
          os,
          device_type as deviceType,
          country_code as countryCode,
          status
        FROM ${this.database}.session_recording_metadata
        ${whereClause}
        ORDER BY started_at DESC
        LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
        { ...params, limit, offset },
      ),
    );

    return {
      data: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get session recording events for replay
   */
  async getSessionEvents(sessionId: string): Promise<SessionRecordingEventsDto | null> {
    // Get metadata
    const metadataResult = await this.executeQuery<SessionRecordingMetadataDto>(() =>
      this.clickhouse.query<SessionRecordingMetadataDto>(
        `SELECT
          session_id as sessionId,
          actor_id as actorId,
          actor_type as actorType,
          actor_email as actorEmail,
          service_slug as serviceSlug,
          started_at as startedAt,
          ended_at as endedAt,
          duration_seconds as durationSeconds,
          total_events as totalEvents,
          page_views as pageViews,
          clicks,
          entry_page as entryPage,
          exit_page as exitPage,
          browser,
          os,
          device_type as deviceType,
          country_code as countryCode,
          status
        FROM ${this.database}.session_recording_metadata
        WHERE session_id = {sessionId:String}
        LIMIT 1`,
        { sessionId },
      ),
    );

    if (metadataResult.data.length === 0) {
      return null;
    }

    // Get all event batches
    const eventsResult = await this.executeQuery<{ events: string }>(() =>
      this.clickhouse.query<{ events: string }>(
        `SELECT events
        FROM ${this.database}.session_recordings
        WHERE session_id = {sessionId:String}
        ORDER BY sequence_start ASC`,
        { sessionId },
      ),
    );

    // Merge all events from batches
    const allEvents: unknown[] = [];
    for (const batch of eventsResult.data) {
      try {
        const parsed = JSON.parse(batch.events);
        if (Array.isArray(parsed)) {
          allEvents.push(...parsed);
        }
      } catch {
        this.logger.warn(`Failed to parse events for session ${sessionId}`);
      }
    }

    return {
      sessionId,
      metadata: metadataResult.data[0],
      events: allEvents,
    };
  }

  /**
   * Get session statistics for analytics
   */
  async getSessionStats(query: { startDate?: string; endDate?: string; serviceSlug?: string }) {
    const result = await this.executeQuery(() =>
      this.clickhouse.query(
        `SELECT
          count() as totalSessions,
          avg(duration_seconds) as avgDuration,
          sum(page_views) as totalPageViews,
          sum(clicks) as totalClicks,
          uniq(actor_id) as uniqueUsers
        FROM ${this.database}.session_recording_metadata
        WHERE date BETWEEN {startDate:Date} AND {endDate:Date}
          ${query.serviceSlug ? 'AND service_slug = {serviceSlug:String}' : ''}`,
        {
          startDate: query.startDate || '1970-01-01',
          endDate: query.endDate || '2099-12-31',
          serviceSlug: query.serviceSlug,
        },
      ),
    );

    return result.data[0] || {};
  }

  /**
   * Get device breakdown statistics
   */
  async getDeviceBreakdown(query: { startDate?: string; endDate?: string }) {
    const result = await this.executeQuery(() =>
      this.clickhouse.query(
        `SELECT
          device_type as deviceType,
          count() as count,
          avg(duration_seconds) as avgDuration
        FROM ${this.database}.session_recording_metadata
        WHERE date BETWEEN {startDate:Date} AND {endDate:Date}
        GROUP BY device_type`,
        {
          startDate: query.startDate || '1970-01-01',
          endDate: query.endDate || '2099-12-31',
        },
      ),
    );

    return result.data;
  }

  /**
   * Get top pages by visits
   */
  async getTopPages(query: { startDate?: string; endDate?: string; limit?: number }) {
    const result = await this.executeQuery(() =>
      this.clickhouse.query(
        `SELECT
          entry_page as page,
          count() as visits,
          avg(duration_seconds) as avgDuration,
          sum(clicks) as totalClicks
        FROM ${this.database}.session_recording_metadata
        WHERE date BETWEEN {startDate:Date} AND {endDate:Date}
        GROUP BY entry_page
        ORDER BY visits DESC
        LIMIT {limit:UInt32}`,
        {
          startDate: query.startDate || '1970-01-01',
          endDate: query.endDate || '2099-12-31',
          limit: query.limit || 10,
        },
      ),
    );

    return result.data;
  }

  // Helper methods

  private parseUserAgent(userAgent: string): {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  } {
    let browser = 'Unknown';
    let browserVersion = '';
    let os = 'Unknown';
    let osVersion = '';
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

    // Simple UA parsing
    if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match?.[1] || '';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      browserVersion = match?.[1] || '';
    } else if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match?.[1] || '';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match?.[1] || '';
    }

    if (userAgent.includes('Windows')) {
      os = 'Windows';
      const match = userAgent.match(/Windows NT (\d+\.\d+)/);
      osVersion = match?.[1] || '';
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      osVersion = match?.[1]?.replace('_', '.') || '';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      deviceType = 'mobile';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
      os = 'iOS';
      deviceType = 'mobile';
    }

    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    return { browser, browserVersion, os, osVersion, deviceType };
  }

  private anonymizeIp(ip: string): string {
    // Zero out last octet for IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
    return ip;
  }

  private getRetentionDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}
