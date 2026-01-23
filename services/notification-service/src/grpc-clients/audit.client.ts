import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, catchError, of } from 'rxjs';

// Audit Service Interfaces

export enum AuthEventType {
  AUTH_EVENT_TYPE_UNSPECIFIED = 0,
  LOGIN_SUCCESS = 1,
  LOGIN_FAILED = 2,
  LOGOUT = 3,
  MFA_VERIFIED = 4,
  MFA_FAILED = 5,
  PASSWORD_CHANGED = 6,
  SESSION_REVOKED = 7,
  TOKEN_REFRESHED = 8,
  ACCOUNT_LOCKED = 9,
  ACCOUNT_UNLOCKED = 10,
}

export enum AccountType {
  ACCOUNT_TYPE_UNSPECIFIED = 0,
  ADMIN = 1,
  USER = 2,
  OPERATOR = 3,
  SYSTEM = 4,
}

export enum AuthEventResult {
  AUTH_EVENT_RESULT_UNSPECIFIED = 0,
  SUCCESS = 1,
  FAILURE = 2,
}

export interface LogAuthEventRequest {
  eventType: number;
  accountType: number;
  accountId: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  countryCode?: string;
  result: number;
  failureReason?: string;
  metadata?: Record<string, string>;
}

export interface LogAuthEventResponse {
  success: boolean;
  eventId: string;
  message: string;
}

interface AuditServiceClient {
  logAuthEvent(request: LogAuthEventRequest): Observable<LogAuthEventResponse>;
}

@Injectable()
export class AuditGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AuditGrpcClient.name);
  private auditService!: AuditServiceClient;
  private client!: ClientGrpc;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const enabled = this.configService.get<boolean>('audit.enabled', false);
    if (!enabled) {
      this.logger.log('Audit service integration disabled');
      return;
    }

    const host = this.configService.get<string>('grpc.audit.host', 'localhost');
    const port = this.configService.get<number>('grpc.audit.port', 50053);

    try {
      const protoBasePath = join(process.cwd(), '../../packages/proto');
      const { ClientProxyFactory } = require('@nestjs/microservices');
      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'audit.v1',
          protoPath: join(protoBasePath, 'audit/v1/audit.proto'),
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

      this.auditService = this.client.getService<AuditServiceClient>('AuditService');
      this.isConnected = true;
      this.logger.log(`Audit gRPC client initialized: ${host}:${port}`);
    } catch (error) {
      this.logger.warn(`Failed to initialize audit gRPC client: ${error}`);
      this.isConnected = false;
    }
  }

  /**
   * Log an authentication event to the audit service.
   * Fails silently if audit service is unavailable.
   */
  async logAuthEvent(request: LogAuthEventRequest): Promise<LogAuthEventResponse> {
    if (!this.isConnected || !this.auditService) {
      this.logger.debug('Audit service not connected, skipping auth event logging');
      return { success: false, eventId: '', message: 'Audit service not connected' };
    }

    try {
      return await firstValueFrom(
        this.auditService.logAuthEvent(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to log auth event: ${error.message}`);
            return of({ success: false, eventId: '', message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to log auth event: ${error}`);
      return { success: false, eventId: '', message: `Failed: ${error}` };
    }
  }

  // Convenience methods for notification-related audit events

  async logSecurityNotificationSent(params: {
    accountId: string;
    accountType: AccountType;
    notificationType: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
      accountType: params.accountType,
      accountId: params.accountId,
      ipAddress: params.ipAddress || 'notification-service',
      userAgent: params.userAgent || 'notification-service',
      result: AuthEventResult.SUCCESS,
      metadata: {
        notificationType: params.notificationType,
        action: 'NOTIFICATION_SENT',
      },
    });
  }

  async logAccountLockedNotification(params: {
    accountId: string;
    accountType: AccountType;
    reason?: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.ACCOUNT_LOCKED,
      accountType: params.accountType,
      accountId: params.accountId,
      ipAddress: 'notification-service',
      userAgent: 'notification-service',
      result: AuthEventResult.SUCCESS,
      metadata: {
        action: 'NOTIFICATION_SENT',
        reason: params.reason || 'Security policy',
      },
    });
  }

  async logLoginAlertNotification(params: {
    accountId: string;
    accountType: AccountType;
    ipAddress: string;
    location?: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.LOGIN_SUCCESS,
      accountType: params.accountType,
      accountId: params.accountId,
      ipAddress: params.ipAddress,
      userAgent: 'notification-service',
      result: AuthEventResult.SUCCESS,
      metadata: {
        action: 'LOGIN_ALERT_SENT',
        location: params.location || 'Unknown',
      },
    });
  }
}
