import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, catchError, of } from 'rxjs';

// ============================================================
// Request/Response Interfaces matching proto definitions
// ============================================================

export interface SaveEventBatchRequest {
  sessionId: string;
  sequenceStart: number;
  sequenceEnd: number;
  events: Buffer;
  timestamp?: { seconds: number; nanos: number };
  metadata?: Record<string, string>;
}

export interface SaveEventBatchResponse {
  success: boolean;
  batchId: string;
  message: string;
}

export interface SessionMetadata {
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

export interface StartSessionRequest {
  metadata: SessionMetadata;
}

export interface StartSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface EndSessionRequest {
  sessionId: string;
  endedAt?: { seconds: number; nanos: number };
  durationMs: number;
}

export interface EndSessionResponse {
  success: boolean;
  message: string;
}

export interface SavePageViewRequest {
  sessionId: string;
  path: string;
  title: string;
  referrer?: string;
  timestamp?: { seconds: number; nanos: number };
  actorId?: string;
  serviceSlug?: string;
}

export interface SavePageViewResponse {
  success: boolean;
  message: string;
}

export interface SaveCustomEventRequest {
  sessionId: string;
  eventData: Buffer;
  timestamp?: { seconds: number; nanos: number };
}

export interface SaveCustomEventResponse {
  success: boolean;
  message: string;
}

export interface ListSessionsRequest {
  serviceSlug?: string;
  actorId?: string;
  deviceType?: number;
  startDate?: { seconds: number; nanos: number };
  endDate?: { seconds: number; nanos: number };
  status?: number;
  page: number;
  limit: number;
}

export interface SessionSummary {
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

export interface ListSessionsResponse {
  sessions: SessionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetSessionEventsRequest {
  sessionId: string;
}

export interface GetSessionEventsResponse {
  sessionId: string;
  metadata: SessionSummary;
  events: Buffer;
}

// Device type enum mapping
export const DeviceType = {
  UNSPECIFIED: 0,
  DESKTOP: 1,
  MOBILE: 2,
  TABLET: 3,
} as const;

// Actor type enum mapping
export const ActorType = {
  UNSPECIFIED: 0,
  USER: 1,
  OPERATOR: 2,
  ADMIN: 3,
} as const;

// Session status enum mapping
export const SessionStatus = {
  UNSPECIFIED: 0,
  ACTIVE: 1,
  ENDED: 2,
} as const;

interface SessionRecordingServiceClient {
  saveEventBatch(request: SaveEventBatchRequest): Observable<SaveEventBatchResponse>;
  startSession(request: StartSessionRequest): Observable<StartSessionResponse>;
  endSession(request: EndSessionRequest): Observable<EndSessionResponse>;
  savePageView(request: SavePageViewRequest): Observable<SavePageViewResponse>;
  saveCustomEvent(request: SaveCustomEventRequest): Observable<SaveCustomEventResponse>;
  listSessions(request: ListSessionsRequest): Observable<ListSessionsResponse>;
  getSessionEvents(request: GetSessionEventsRequest): Observable<GetSessionEventsResponse>;
}

@Injectable()
export class SessionRecordingGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(SessionRecordingGrpcClient.name);
  private sessionRecordingService!: SessionRecordingServiceClient;
  private client!: ClientGrpc;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('grpc.audit.host', 'localhost');
    const port = this.configService.get<number>('grpc.audit.port', 50054);

    try {
      const protoBasePath = join(process.cwd(), '../../packages/proto');
      const { ClientProxyFactory } = require('@nestjs/microservices');
      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'session_recording.v1',
          protoPath: join(protoBasePath, 'session-recording/v1/session-recording.proto'),
          url: `${host}:${port}`,
          loader: {
            keepCase: false,
            longs: Number,
            enums: Number,
            defaults: true,
            oneofs: true,
            includeDirs: [protoBasePath],
          },
        },
      });

      this.sessionRecordingService =
        this.client.getService<SessionRecordingServiceClient>('SessionRecordingService');
      this.isConnected = true;
      this.logger.log(`Session Recording gRPC client initialized: ${host}:${port}`);
    } catch (error) {
      this.logger.warn(`Failed to initialize session recording gRPC client: ${error}`);
      this.isConnected = false;
    }
  }

  async saveEventBatch(request: SaveEventBatchRequest): Promise<SaveEventBatchResponse> {
    if (!this.isConnected || !this.sessionRecordingService) {
      this.logger.debug('Session recording service not connected');
      return { success: false, batchId: '', message: 'Service not connected' };
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.saveEventBatch(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to save event batch: ${error.message}`);
            return of({ success: false, batchId: '', message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to save event batch: ${error}`);
      return { success: false, batchId: '', message: `Failed: ${error}` };
    }
  }

  async startSession(request: StartSessionRequest): Promise<StartSessionResponse> {
    if (!this.isConnected || !this.sessionRecordingService) {
      this.logger.debug('Session recording service not connected');
      return { success: false, sessionId: '', message: 'Service not connected' };
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.startSession(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to start session: ${error.message}`);
            return of({ success: false, sessionId: '', message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to start session: ${error}`);
      return { success: false, sessionId: '', message: `Failed: ${error}` };
    }
  }

  async endSession(request: EndSessionRequest): Promise<EndSessionResponse> {
    if (!this.isConnected || !this.sessionRecordingService) {
      this.logger.debug('Session recording service not connected');
      return { success: false, message: 'Service not connected' };
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.endSession(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to end session: ${error.message}`);
            return of({ success: false, message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to end session: ${error}`);
      return { success: false, message: `Failed: ${error}` };
    }
  }

  async savePageView(request: SavePageViewRequest): Promise<SavePageViewResponse> {
    if (!this.isConnected || !this.sessionRecordingService) {
      this.logger.debug('Session recording service not connected');
      return { success: false, message: 'Service not connected' };
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.savePageView(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to save page view: ${error.message}`);
            return of({ success: false, message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to save page view: ${error}`);
      return { success: false, message: `Failed: ${error}` };
    }
  }

  async saveCustomEvent(request: SaveCustomEventRequest): Promise<SaveCustomEventResponse> {
    if (!this.isConnected || !this.sessionRecordingService) {
      return { success: false, message: 'Service not connected' };
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.saveCustomEvent(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to save custom event: ${error.message}`);
            return of({ success: false, message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to save custom event: ${error}`);
      return { success: false, message: `Failed: ${error}` };
    }
  }

  async listSessions(request: ListSessionsRequest): Promise<ListSessionsResponse> {
    if (!this.isConnected || !this.sessionRecordingService) {
      this.logger.debug('Session recording service not connected');
      return {
        sessions: [],
        total: 0,
        page: request.page || 1,
        limit: request.limit || 20,
        totalPages: 0,
      };
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.listSessions(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to list sessions: ${error.message}`);
            return of({
              sessions: [],
              total: 0,
              page: request.page || 1,
              limit: request.limit || 20,
              totalPages: 0,
            });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to list sessions: ${error}`);
      return {
        sessions: [],
        total: 0,
        page: request.page || 1,
        limit: request.limit || 20,
        totalPages: 0,
      };
    }
  }

  async getSessionEvents(
    request: GetSessionEventsRequest,
  ): Promise<GetSessionEventsResponse | null> {
    if (!this.isConnected || !this.sessionRecordingService) {
      this.logger.debug('Session recording service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.sessionRecordingService.getSessionEvents(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to get session events: ${error.message}`);
            return of(null as unknown as GetSessionEventsResponse);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to get session events: ${error}`);
      return null;
    }
  }
}
