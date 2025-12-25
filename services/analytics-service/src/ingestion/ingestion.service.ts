import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';
import { ID } from '@my-girok/nest-common';
import { TrackEventDto } from './dto/track-event.dto';
import { PageViewDto } from './dto/page-view.dto';
import { IdentifyDto } from './dto/identify.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private readonly clickhouse: ClickHouseService) {}

  async trackEvents(events: TrackEventDto[], clientIp: string): Promise<void> {
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
    // Update sessions with user_id
    await this.clickhouse.command(`
      ALTER TABLE analytics_db.sessions_local
      UPDATE user_id = '${dto.userId}'
      WHERE anonymous_id = '${dto.anonymousId}'
        AND user_id IS NULL
    `);

    // Update user profile
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

    await this.clickhouse.insert('analytics_db.user_profiles', [profile]);
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

  private anonymizeIp(ip: string): string {
    // GDPR: Remove last octet
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
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
