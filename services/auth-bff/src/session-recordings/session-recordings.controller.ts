import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, AllowedAccountTypes } from '../common/decorators';
import { AccountType } from '../config/constants';
import {
  SessionRecordingGrpcClient,
  DeviceType,
  ActorType,
} from '../grpc-clients/session-recording.client';

// ============================================================
// DTOs
// ============================================================

class SaveEventBatchDto {
  sessionId!: string;
  sequenceStart!: number;
  sequenceEnd!: number;
  events!: unknown[];
  timestamp!: string;
  metadata?: Record<string, unknown>;
}

class SessionStartDto {
  action!: 'start';
  sessionId!: string;
  startedAt?: string;
  actorId?: string;
  actorType?: 'USER' | 'OPERATOR' | 'ADMIN';
  actorEmail?: string;
  serviceSlug?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  screenResolution?: string;
  timezone?: string;
  language?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

class SessionEndDto {
  action!: 'end';
  sessionId!: string;
  endedAt?: string;
  duration?: number;
}

type SessionEventDto = SessionStartDto | SessionEndDto;

class PageViewDto {
  sessionId!: string;
  path!: string;
  title!: string;
  referrer?: string;
  timestamp!: string;
  actorId?: string;
  serviceSlug?: string;
}

class CustomEventDto {
  sessionId!: string;
  event!: Record<string, unknown>;
  timestamp!: string;
}

class ListSessionsQueryDto {
  serviceSlug?: string;
  actorId?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// Response Types
// ============================================================

interface SessionSummaryResponse {
  sessionId: string;
  actorId?: string;
  actorType?: string;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  totalEvents: number;
  pageViews: number;
  clicks: number;
  entryPage: string;
  exitPage?: string;
  browser: string;
  os: string;
  deviceType: string;
  countryCode: string;
  status: string;
}

interface ListSessionsResponse {
  data: SessionSummaryResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SessionEventsResponse {
  sessionId: string;
  metadata: SessionSummaryResponse;
  events: unknown[];
}

// Helper functions
function deviceTypeToEnum(deviceType?: string): number {
  switch (deviceType) {
    case 'desktop':
      return DeviceType.DESKTOP;
    case 'mobile':
      return DeviceType.MOBILE;
    case 'tablet':
      return DeviceType.TABLET;
    default:
      return DeviceType.DESKTOP;
  }
}

function deviceTypeFromEnum(deviceType: number): string {
  switch (deviceType) {
    case DeviceType.MOBILE:
      return 'mobile';
    case DeviceType.TABLET:
      return 'tablet';
    default:
      return 'desktop';
  }
}

function actorTypeToEnum(actorType?: string): number {
  switch (actorType) {
    case 'USER':
      return ActorType.USER;
    case 'OPERATOR':
      return ActorType.OPERATOR;
    case 'ADMIN':
      return ActorType.ADMIN;
    default:
      return ActorType.UNSPECIFIED;
  }
}

function actorTypeFromEnum(actorType: number): string | undefined {
  switch (actorType) {
    case ActorType.USER:
      return 'USER';
    case ActorType.OPERATOR:
      return 'OPERATOR';
    case ActorType.ADMIN:
      return 'ADMIN';
    default:
      return undefined;
  }
}

function timestampToProto(isoString: string): { seconds: number; nanos: number } {
  const date = new Date(isoString);
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanos: (date.getTime() % 1000) * 1000000,
  };
}

function timestampFromProto(timestamp: { seconds: number; nanos: number }): string {
  return new Date(timestamp.seconds * 1000).toISOString();
}

@ApiTags('recordings')
@Controller('recordings')
export class SessionRecordingsController {
  constructor(private readonly sessionRecordingClient: SessionRecordingGrpcClient) {}

  /**
   * Save event batch from tracking SDK
   * This is called frequently by the SDK, so we allow public access
   */
  @Post('events')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save recording event batch' })
  @ApiResponse({ status: 200, description: 'Events saved' })
  async saveEventBatch(
    @Req() req: Request,
    @Body() dto: SaveEventBatchDto,
  ): Promise<{ success: boolean }> {
    const result = await this.sessionRecordingClient.saveEventBatch({
      sessionId: dto.sessionId,
      sequenceStart: dto.sequenceStart,
      sequenceEnd: dto.sequenceEnd,
      events: Buffer.from(JSON.stringify(dto.events)),
      timestamp: timestampToProto(dto.timestamp),
      metadata: {
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    return { success: result.success };
  }

  /**
   * Handle session start/end events
   */
  @Post('sessions')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or end a session' })
  @ApiResponse({ status: 200, description: 'Session event processed' })
  async handleSessionEvent(
    @Req() req: Request,
    @Body() dto: SessionEventDto,
  ): Promise<{ success: boolean }> {
    if (dto.action === 'start') {
      const startDto = dto as SessionStartDto;
      const result = await this.sessionRecordingClient.startSession({
        metadata: {
          sessionId: startDto.sessionId,
          actorId: startDto.actorId,
          actorType: actorTypeToEnum(startDto.actorType),
          actorEmail: startDto.actorEmail,
          serviceSlug: startDto.serviceSlug,
          browser: startDto.browser || '',
          os: startDto.os || '',
          deviceType: deviceTypeToEnum(startDto.deviceType),
          screenResolution: startDto.screenResolution || '',
          timezone: startDto.timezone || '',
          language: startDto.language || '',
          userAgent: startDto.userAgent || req.headers['user-agent'] || '',
          deviceFingerprint: startDto.deviceFingerprint || '',
          ipAddress: req.ip || '',
        },
      });
      return { success: result.success };
    } else {
      const endDto = dto as SessionEndDto;
      const result = await this.sessionRecordingClient.endSession({
        sessionId: endDto.sessionId,
        endedAt: endDto.endedAt ? timestampToProto(endDto.endedAt) : undefined,
        durationMs: endDto.duration || 0,
      });
      return { success: result.success };
    }
  }

  /**
   * Save page view event
   */
  @Post('pageviews')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save page view' })
  @ApiResponse({ status: 200, description: 'Page view saved' })
  async savePageView(@Body() dto: PageViewDto): Promise<{ success: boolean }> {
    const result = await this.sessionRecordingClient.savePageView({
      sessionId: dto.sessionId,
      path: dto.path,
      title: dto.title,
      referrer: dto.referrer,
      timestamp: timestampToProto(dto.timestamp),
      actorId: dto.actorId,
      serviceSlug: dto.serviceSlug,
    });

    return { success: result.success };
  }

  /**
   * Save custom event
   */
  @Post('events/custom')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save custom event' })
  @ApiResponse({ status: 200, description: 'Custom event saved' })
  async saveCustomEvent(@Body() dto: CustomEventDto): Promise<{ success: boolean }> {
    const result = await this.sessionRecordingClient.saveCustomEvent({
      sessionId: dto.sessionId,
      eventData: Buffer.from(JSON.stringify(dto.event)),
      timestamp: timestampToProto(dto.timestamp),
    });

    return { success: result.success };
  }

  /**
   * List recorded sessions (admin only)
   */
  @Get('sessions')
  @AllowedAccountTypes(AccountType.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List recorded sessions' })
  @ApiResponse({ status: 200, description: 'Sessions list' })
  @ApiQuery({ name: 'serviceSlug', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'deviceType', required: false, enum: ['desktop', 'mobile', 'tablet'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listSessions(@Query() query: ListSessionsQueryDto): Promise<ListSessionsResponse> {
    const result = await this.sessionRecordingClient.listSessions({
      serviceSlug: query.serviceSlug,
      actorId: query.actorId,
      deviceType: query.deviceType ? deviceTypeToEnum(query.deviceType) : undefined,
      startDate: query.startDate ? timestampToProto(query.startDate) : undefined,
      endDate: query.endDate ? timestampToProto(query.endDate) : undefined,
      page: query.page || 1,
      limit: query.limit || 20,
    });

    return {
      data: result.sessions.map((s) => ({
        sessionId: s.sessionId,
        actorId: s.actorId,
        actorType: actorTypeFromEnum(s.actorType || 0),
        actorEmail: s.actorEmail,
        serviceSlug: s.serviceSlug,
        startedAt: timestampFromProto(s.startedAt),
        endedAt: s.endedAt ? timestampFromProto(s.endedAt) : undefined,
        durationSeconds: s.durationSeconds,
        totalEvents: s.totalEvents,
        pageViews: s.pageViews,
        clicks: s.clicks,
        entryPage: s.entryPage,
        exitPage: s.exitPage,
        browser: s.browser,
        os: s.os,
        deviceType: deviceTypeFromEnum(s.deviceType),
        countryCode: s.countryCode,
        status: s.status === 1 ? 'active' : 'ended',
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get session events for replay (admin only)
   */
  @Get('sessions/:sessionId/events')
  @AllowedAccountTypes(AccountType.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get session events for replay' })
  @ApiResponse({ status: 200, description: 'Session events' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionEvents(@Param('sessionId') sessionId: string): Promise<SessionEventsResponse> {
    const result = await this.sessionRecordingClient.getSessionEvents({ sessionId });

    if (!result) {
      return {
        sessionId,
        metadata: {
          sessionId,
          serviceSlug: '',
          startedAt: new Date().toISOString(),
          durationSeconds: 0,
          totalEvents: 0,
          pageViews: 0,
          clicks: 0,
          entryPage: '',
          browser: '',
          os: '',
          deviceType: 'desktop',
          countryCode: '',
          status: 'ended',
        },
        events: [],
      };
    }

    const m = result.metadata;
    return {
      sessionId: result.sessionId,
      metadata: {
        sessionId: m.sessionId,
        actorId: m.actorId,
        actorType: actorTypeFromEnum(m.actorType || 0),
        actorEmail: m.actorEmail,
        serviceSlug: m.serviceSlug,
        startedAt: timestampFromProto(m.startedAt),
        endedAt: m.endedAt ? timestampFromProto(m.endedAt) : undefined,
        durationSeconds: m.durationSeconds,
        totalEvents: m.totalEvents,
        pageViews: m.pageViews,
        clicks: m.clicks,
        entryPage: m.entryPage,
        exitPage: m.exitPage,
        browser: m.browser,
        os: m.os,
        deviceType: deviceTypeFromEnum(m.deviceType),
        countryCode: m.countryCode,
        status: m.status === 1 ? 'active' : 'ended',
      },
      events: JSON.parse(result.events.toString('utf8')),
    };
  }
}
