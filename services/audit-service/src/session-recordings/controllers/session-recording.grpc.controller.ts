import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { SessionRecordingService } from '../services/session-recording.service';

// ============================================================
// Request/Response Interfaces matching proto definitions
// ============================================================

interface SaveEventBatchRequest {
  sessionId: string;
  sequenceStart: number;
  sequenceEnd: number;
  events: Buffer; // JSON-encoded rrweb events
  timestamp?: { seconds: number; nanos: number };
  metadata?: Record<string, string>;
}

interface SaveEventBatchResponse {
  success: boolean;
  batchId: string;
  message: string;
}

interface SessionMetadata {
  sessionId: string;
  actorId?: string;
  actorType?: number;
  actorEmail?: string;
  serviceSlug?: string;
  browser: string;
  os: string;
  deviceType: number;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
  deviceFingerprint: string;
  ipAddress?: string;
  countryCode?: string;
}

interface StartSessionRequest {
  metadata: SessionMetadata;
}

interface StartSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

interface EndSessionRequest {
  sessionId: string;
  endedAt?: { seconds: number; nanos: number };
  durationMs: number;
}

interface EndSessionResponse {
  success: boolean;
  message: string;
}

interface SavePageViewRequest {
  sessionId: string;
  path: string;
  title: string;
  referrer?: string;
  timestamp?: { seconds: number; nanos: number };
  actorId?: string;
  serviceSlug?: string;
}

interface SavePageViewResponse {
  success: boolean;
  message: string;
}

interface SaveCustomEventRequest {
  sessionId: string;
  eventData: Buffer;
  timestamp?: { seconds: number; nanos: number };
}

interface SaveCustomEventResponse {
  success: boolean;
  message: string;
}

interface ListSessionsRequest {
  serviceSlug?: string;
  actorId?: string;
  deviceType?: number;
  startDate?: { seconds: number; nanos: number };
  endDate?: { seconds: number; nanos: number };
  status?: number;
  page: number;
  limit: number;
}

interface SessionSummary {
  sessionId: string;
  actorId?: string;
  actorType?: number;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: { seconds: number; nanos: number };
  endedAt?: { seconds: number; nanos: number };
  durationSeconds: number;
  totalEvents: number;
  pageViews: number;
  clicks: number;
  entryPage: string;
  exitPage?: string;
  browser: string;
  os: string;
  deviceType: number;
  countryCode: string;
  status: number;
}

interface ListSessionsResponse {
  sessions: SessionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface GetSessionEventsRequest {
  sessionId: string;
}

interface GetSessionEventsResponse {
  sessionId: string;
  metadata: SessionSummary;
  events: Buffer;
}

@Controller()
export class SessionRecordingGrpcController {
  private readonly logger = new Logger(SessionRecordingGrpcController.name);

  constructor(private readonly sessionRecordingService: SessionRecordingService) {}

  @GrpcMethod('SessionRecordingService', 'SaveEventBatch')
  async saveEventBatch(request: SaveEventBatchRequest): Promise<SaveEventBatchResponse> {
    this.logger.debug(
      `SaveEventBatch: session=${request.sessionId}, seq=${request.sequenceStart}-${request.sequenceEnd}`,
    );

    try {
      // Parse events from Buffer (JSON)
      const eventsJson = request.events.toString('utf8');
      const events = JSON.parse(eventsJson) as unknown[];

      await this.sessionRecordingService.saveEventBatch(
        {
          sessionId: request.sessionId,
          sequenceStart: request.sequenceStart,
          sequenceEnd: request.sequenceEnd,
          events,
          timestamp: request.timestamp
            ? new Date(request.timestamp.seconds * 1000).toISOString()
            : new Date().toISOString(),
        },
        {
          serviceSlug: request.metadata?.serviceSlug || 'unknown',
          ipAddress: request.metadata?.ipAddress || '',
          userAgent: request.metadata?.userAgent || '',
        },
      );

      return {
        success: true,
        batchId: `${request.sessionId}-${request.sequenceStart}`,
        message: 'Event batch saved',
      };
    } catch (error) {
      this.logger.error(`SaveEventBatch failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to save event batch',
      });
    }
  }

  @GrpcMethod('SessionRecordingService', 'StartSession')
  async startSession(request: StartSessionRequest): Promise<StartSessionResponse> {
    const metadata = request.metadata;
    this.logger.debug(`StartSession: session=${metadata.sessionId}, actor=${metadata.actorId}`);

    try {
      await this.sessionRecordingService.handleSessionEvent(
        {
          action: 'start',
          sessionId: metadata.sessionId,
          startedAt: new Date().toISOString(),
          actorId: metadata.actorId,
          actorType: this.sessionRecordingService.convertActorTypeFromNumber(
            metadata.actorType || 0,
          ),
          actorEmail: metadata.actorEmail,
          serviceSlug: metadata.serviceSlug,
          browser: metadata.browser,
          os: metadata.os,
          deviceType: this.sessionRecordingService.convertDeviceTypeToString(
            metadata.deviceType,
          ) as 'desktop' | 'mobile' | 'tablet',
          screenResolution: metadata.screenResolution,
          timezone: metadata.timezone,
          language: metadata.language,
          userAgent: metadata.userAgent,
          deviceFingerprint: metadata.deviceFingerprint,
        },
        {
          ipAddress: metadata.ipAddress || '',
          userAgent: metadata.userAgent,
        },
      );

      return {
        success: true,
        sessionId: metadata.sessionId,
        message: 'Session started',
      };
    } catch (error) {
      this.logger.error(`StartSession failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to start session',
      });
    }
  }

  @GrpcMethod('SessionRecordingService', 'EndSession')
  async endSession(request: EndSessionRequest): Promise<EndSessionResponse> {
    this.logger.debug(`EndSession: session=${request.sessionId}`);

    try {
      await this.sessionRecordingService.handleSessionEvent(
        {
          action: 'end',
          sessionId: request.sessionId,
          endedAt: request.endedAt
            ? new Date(request.endedAt.seconds * 1000).toISOString()
            : new Date().toISOString(),
          duration: Number(request.durationMs),
        },
        { ipAddress: '', userAgent: '' },
      );

      return {
        success: true,
        message: 'Session ended',
      };
    } catch (error) {
      this.logger.error(`EndSession failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to end session',
      });
    }
  }

  @GrpcMethod('SessionRecordingService', 'SavePageView')
  async savePageView(request: SavePageViewRequest): Promise<SavePageViewResponse> {
    this.logger.debug(`SavePageView: session=${request.sessionId}, path=${request.path}`);

    try {
      await this.sessionRecordingService.savePageView({
        sessionId: request.sessionId,
        path: request.path,
        title: request.title,
        referrer: request.referrer,
        timestamp: request.timestamp
          ? new Date(request.timestamp.seconds * 1000).toISOString()
          : new Date().toISOString(),
        actorId: request.actorId,
        serviceSlug: request.serviceSlug,
      });

      return {
        success: true,
        message: 'Page view saved',
      };
    } catch (error) {
      this.logger.error(`SavePageView failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to save page view',
      });
    }
  }

  @GrpcMethod('SessionRecordingService', 'SaveCustomEvent')
  async saveCustomEvent(request: SaveCustomEventRequest): Promise<SaveCustomEventResponse> {
    this.logger.debug(`SaveCustomEvent: session=${request.sessionId}`);

    // Custom events are acknowledged but not stored separately for now
    return {
      success: true,
      message: 'Custom event acknowledged',
    };
  }

  @GrpcMethod('SessionRecordingService', 'ListSessions')
  async listSessions(request: ListSessionsRequest): Promise<ListSessionsResponse> {
    this.logger.debug(`ListSessions: page=${request.page}, limit=${request.limit}`);

    try {
      const result = await this.sessionRecordingService.listSessions({
        serviceSlug: request.serviceSlug,
        actorId: request.actorId,
        deviceType: request.deviceType
          ? this.sessionRecordingService.convertDeviceTypeToString(request.deviceType)
          : undefined,
        startDate: request.startDate
          ? new Date(request.startDate.seconds * 1000).toISOString()
          : undefined,
        endDate: request.endDate
          ? new Date(request.endDate.seconds * 1000).toISOString()
          : undefined,
        page: request.page || 1,
        limit: request.limit || 20,
      });

      const sessions: SessionSummary[] = result.data.map((s) => ({
        sessionId: s.sessionId,
        actorId: s.actorId,
        actorType: s.actorType
          ? this.sessionRecordingService.convertActorTypeToNumber(s.actorType)
          : 0,
        actorEmail: s.actorEmail,
        serviceSlug: s.serviceSlug,
        startedAt: { seconds: Math.floor(new Date(s.startedAt).getTime() / 1000), nanos: 0 },
        endedAt: s.endedAt
          ? { seconds: Math.floor(new Date(s.endedAt).getTime() / 1000), nanos: 0 }
          : undefined,
        durationSeconds: s.durationSeconds,
        totalEvents: s.totalEvents,
        pageViews: s.pageViews,
        clicks: s.clicks,
        entryPage: s.entryPage,
        exitPage: s.exitPage,
        browser: s.browser,
        os: s.os,
        deviceType: this.sessionRecordingService.convertDeviceTypeToNumber(s.deviceType),
        countryCode: s.countryCode,
        status: this.sessionRecordingService.convertStatusToNumber(s.status),
      }));

      return {
        sessions,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    } catch (error) {
      this.logger.error(`ListSessions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to list sessions',
      });
    }
  }

  @GrpcMethod('SessionRecordingService', 'GetSessionEvents')
  async getSessionEvents(request: GetSessionEventsRequest): Promise<GetSessionEventsResponse> {
    this.logger.debug(`GetSessionEvents: session=${request.sessionId}`);

    try {
      const result = await this.sessionRecordingService.getSessionEvents(request.sessionId);

      if (!result) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: `Session ${request.sessionId} not found`,
        });
      }

      const metadata = result.metadata;
      const sessionSummary: SessionSummary = {
        sessionId: metadata.sessionId,
        actorId: metadata.actorId,
        actorType: metadata.actorType
          ? this.sessionRecordingService.convertActorTypeToNumber(metadata.actorType)
          : 0,
        actorEmail: metadata.actorEmail,
        serviceSlug: metadata.serviceSlug,
        startedAt: { seconds: Math.floor(new Date(metadata.startedAt).getTime() / 1000), nanos: 0 },
        endedAt: metadata.endedAt
          ? { seconds: Math.floor(new Date(metadata.endedAt).getTime() / 1000), nanos: 0 }
          : undefined,
        durationSeconds: metadata.durationSeconds,
        totalEvents: metadata.totalEvents,
        pageViews: metadata.pageViews,
        clicks: metadata.clicks,
        entryPage: metadata.entryPage,
        exitPage: metadata.exitPage,
        browser: metadata.browser,
        os: metadata.os,
        deviceType: this.sessionRecordingService.convertDeviceTypeToNumber(metadata.deviceType),
        countryCode: metadata.countryCode,
        status: this.sessionRecordingService.convertStatusToNumber(metadata.status),
      };

      return {
        sessionId: result.sessionId,
        metadata: sessionSummary,
        events: Buffer.from(JSON.stringify(result.events)),
      };
    } catch (error) {
      this.logger.error(`GetSessionEvents failed: ${error}`);
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Session not found',
      });
    }
  }
}
