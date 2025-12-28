import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';
import { ID } from '@my-girok/nest-common';
import { TrackEventDto } from './dto/track-event.dto';
import { PageViewDto } from './dto/page-view.dto';
import { IdentifyDto } from './dto/identify.dto';

/**
 * UUID pattern for strict validation (RFC 4122)
 * Only allows hex characters and hyphens in correct positions
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whitelist of allowed tables for mutation operations
 * Prevents SQL injection in ALTER TABLE commands
 */
const ALLOWED_MUTATION_TABLES = new Set([
  'analytics_db.sessions_local',
  'analytics_db.events_local',
  'analytics_db.page_views_local',
  'analytics_db.user_profiles_local',
]);

/**
 * Whitelist of allowed tables for insert operations
 */
const ALLOWED_INSERT_TABLES = new Set([
  'analytics_db.events',
  'analytics_db.page_views',
  'analytics_db.sessions',
  'analytics_db.user_profiles',
]);

/**
 * Maximum batch size for event ingestion
 * Prevents memory exhaustion and ClickHouse timeout issues
 */
const MAX_BATCH_SIZE = 1000;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private readonly clickhouse: ClickHouseService) {}

  /**
   * Validate table name against whitelist
   * @throws BadRequestException if table is not allowed
   */
  private validateInsertTable(table: string): void {
    if (!ALLOWED_INSERT_TABLES.has(table)) {
      throw new BadRequestException(`Invalid table name: ${table}`);
    }
  }

  /**
   * Validate mutation table name against whitelist
   * @throws BadRequestException if table is not allowed
   */
  private validateMutationTable(table: string): void {
    if (!ALLOWED_MUTATION_TABLES.has(table)) {
      throw new BadRequestException(`Invalid mutation table name: ${table}`);
    }
  }

  /**
   * Validate UUID format strictly
   * @throws BadRequestException if UUID is invalid
   */
  private validateUUID(value: string, fieldName: string): void {
    if (!UUID_PATTERN.test(value)) {
      throw new BadRequestException(`Invalid ${fieldName} format: must be a valid UUID`);
    }
  }

  async trackEvents(events: TrackEventDto[], clientIp: string): Promise<void> {
    // Validate batch size to prevent memory exhaustion
    if (events.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(
        `Batch size ${events.length} exceeds maximum of ${MAX_BATCH_SIZE}. Please split into smaller batches.`,
      );
    }

    if (events.length === 0) {
      return;
    }

    const anonymizedIp = this.anonymizeIp(clientIp);

    const rows = events.map((event) => ({
      id: ID.generate(),
      timestamp: event.timestamp || new Date().toISOString(),
      session_id: event.sessionId,
      user_id: event.userId || null,
      event_name: event.eventName,
      event_category: this.categorizeEvent(event.eventName),
      properties: JSON.stringify(event.properties || {}),
      page_path: event.context?.page?.path || '',
      page_title: event.context?.page?.title || '',
      element_id: null,
      element_class: null,
      element_text: null,
    }));

    await this.clickhouse.insert('analytics_db.events', rows);
    this.logger.debug(`Tracked ${events.length} events from ${anonymizedIp}`);
  }

  async trackPageView(dto: PageViewDto, _clientIp: string): Promise<void> {
    const row = {
      id: ID.generate(),
      timestamp: new Date().toISOString(),
      session_id: dto.sessionId,
      user_id: dto.userId || null,
      page_path: dto.path,
      page_title: dto.title || '',
      referrer_path: dto.referrer || null,
      time_on_page_seconds: dto.timeOnPreviousPage || 0,
      scroll_depth_percent: dto.scrollDepth || 0,
      load_time_ms: dto.loadTime || 0,
      ttfb_ms: null,
      fcp_ms: null,
      lcp_ms: null,
      cls: null,
    };

    await this.clickhouse.insert('analytics_db.page_views', [row]);
  }

  async identify(dto: IdentifyDto): Promise<void> {
    // Validate UUIDs strictly to prevent SQL injection
    // UUID pattern only allows hex characters [0-9a-f] and hyphens
    this.validateUUID(dto.userId, 'userId');
    this.validateUUID(dto.anonymousId, 'anonymousId');

    // Validate table name against whitelist
    const mutationTable = 'analytics_db.sessions_local';
    this.validateMutationTable(mutationTable);

    // ClickHouse ALTER TABLE UPDATE doesn't support parameterized queries.
    // Security is ensured by:
    // 1. UUID validation: only hex chars [0-9a-f] and hyphens allowed
    // 2. Table whitelist: only predefined tables allowed
    // This is a safe interpolation because UUID regex guarantees no SQL metacharacters.
    await this.clickhouse.command(
      `ALTER TABLE ${mutationTable} ` +
        `UPDATE user_id = '${dto.userId}' ` +
        `WHERE anonymous_id = '${dto.anonymousId}' AND user_id IS NULL`,
    );

    // Validate insert table
    const profileTable = 'analytics_db.user_profiles';
    this.validateInsertTable(profileTable);

    // Update user profile using ReplacingMergeTree (insert replaces existing row)
    const profile = {
      user_id: dto.userId,
      updated_at: new Date().toISOString(),
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      total_sessions: 0,
      total_events: 0,
      total_page_views: 0,
      avg_session_duration_seconds: 0,
      avg_pages_per_session: 0,
      persona: null,
      lifetime_value: 0,
      churn_risk_score: 0,
      engagement_score: 0,
      first_utm_source: null,
      first_utm_medium: null,
      first_utm_campaign: null,
      last_utm_source: null,
      last_utm_medium: null,
      last_utm_campaign: null,
      properties: JSON.stringify(dto.traits || {}),
    };

    await this.clickhouse.insert(profileTable, [profile]);
  }

  async startSession(
    sessionId: string,
    anonymousId: string,
    userId: string | null,
    context: {
      entryPage: string;
      referrer: string;
      utm?: { source?: string; medium?: string; campaign?: string };
      device?: { type?: string; browser?: string; os?: string };
    },
    _clientIp: string,
  ): Promise<void> {
    const row = {
      session_id: sessionId,
      user_id: userId,
      anonymous_id: anonymousId,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_seconds: 0,
      is_bounce: true,
      entry_page: context.entryPage,
      exit_page: context.entryPage,
      referrer: context.referrer,
      utm_source: context.utm?.source || null,
      utm_medium: context.utm?.medium || null,
      utm_campaign: context.utm?.campaign || null,
      utm_term: null,
      utm_content: null,
      page_view_count: 0,
      event_count: 0,
      device_type: context.device?.type || 'unknown',
      browser: context.device?.browser || 'unknown',
      browser_version: '',
      os: context.device?.os || 'unknown',
      os_version: '',
      country_code: 'KR', // Would use GeoIP in production
      region: null,
      city: null,
      is_converted: false,
      conversion_event: null,
      conversion_value: null,
    };

    await this.clickhouse.insert('analytics_db.sessions', [row]);
  }

  /**
   * Anonymize IP address for GDPR compliance
   * - IPv4: Zeroes last octet (e.g., 192.168.1.100 → 192.168.1.0)
   * - IPv6: Zeroes last 80 bits (e.g., 2001:db8::1 → 2001:db8::)
   */
  private anonymizeIp(ip: string): string {
    // IPv4: Remove last octet
    if (ip.includes('.') && !ip.includes(':')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = '0';
        return parts.join('.');
      }
      return ip;
    }

    // IPv6: Zero last 80 bits (keep first 48 bits for /48 prefix)
    // This follows GDPR recommendation for IP anonymization
    if (ip.includes(':')) {
      // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
      if (ip.toLowerCase().startsWith('::ffff:')) {
        const ipv4Part = ip.substring(7);
        return '::ffff:' + this.anonymizeIp(ipv4Part);
      }

      // Expand and anonymize IPv6
      const parts = ip.split(':');
      // Keep first 3 groups (48 bits), zero the rest
      const anonymized = parts.slice(0, 3).concat(['0', '0', '0', '0', '0']);
      // Compress consecutive zeros for valid IPv6 notation
      return anonymized
        .slice(0, 8)
        .join(':')
        .replace(/:0:0:0:0:0$/, '::');
    }

    return ip;
  }

  private categorizeEvent(eventName: string): string {
    const categories: Record<string, string[]> = {
      navigation: ['page_view', 'link_click', 'menu_click'],
      conversion: ['signup', 'purchase', 'subscription', 'checkout'],
      engagement: ['click', 'scroll', 'hover', 'form_submit', 'video_play'],
    };

    for (const [category, events] of Object.entries(categories)) {
      if (events.some((e) => eventName.toLowerCase().includes(e))) {
        return category;
      }
    }
    return 'other';
  }
}
