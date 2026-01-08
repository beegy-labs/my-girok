import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, catchError, of } from 'rxjs';
import { Audit } from '@my-girok/types';

// Re-export from shared types for convenience
export const AuthEventType = Audit.AuthEventType;
export const AccountType = Audit.AccountType;
export const AuthEventResult = Audit.AuthEventResult;

// Request interfaces
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
    const host = this.configService.get<string>('grpc.audit.host', 'localhost');
    const port = this.configService.get<number>('grpc.audit.port', 50054);

    try {
      const { ClientProxyFactory } = require('@nestjs/microservices');
      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'audit.v1',
          protoPath: join(__dirname, '../../../../packages/proto/audit/v1/audit.proto'),
          url: `${host}:${port}`,
          loader: {
            keepCase: false,
            longs: Number,
            enums: Number,
            defaults: true,
            oneofs: true,
            includeDirs: [join(__dirname, '../../../../packages/proto')],
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
   * Fails silently if audit service is unavailable to not block auth operations.
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

  // Convenience methods for common events

  async logLoginSuccess(params: {
    accountId: string;
    accountType: number;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
    countryCode?: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.LOGIN_SUCCESS,
      accountType: params.accountType,
      accountId: params.accountId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceFingerprint: params.deviceFingerprint,
      countryCode: params.countryCode,
      result: AuthEventResult.SUCCESS,
    });
  }

  async logLoginFailed(params: {
    accountId: string;
    accountType: number;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
    countryCode?: string;
    failureReason: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.LOGIN_FAILED,
      accountType: params.accountType,
      accountId: params.accountId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceFingerprint: params.deviceFingerprint,
      countryCode: params.countryCode,
      result: AuthEventResult.FAILURE,
      failureReason: params.failureReason,
    });
  }

  async logLogout(params: {
    accountId: string;
    accountType: number;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.LOGOUT,
      accountType: params.accountType,
      accountId: params.accountId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: AuthEventResult.SUCCESS,
    });
  }

  async logMfaVerified(params: {
    accountId: string;
    accountType: number;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    method?: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.MFA_VERIFIED,
      accountType: params.accountType,
      accountId: params.accountId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: AuthEventResult.SUCCESS,
      metadata: params.method ? { method: params.method } : undefined,
    });
  }

  async logMfaFailed(params: {
    accountId: string;
    accountType: number;
    ipAddress: string;
    userAgent: string;
    failureReason: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.MFA_FAILED,
      accountType: params.accountType,
      accountId: params.accountId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: AuthEventResult.FAILURE,
      failureReason: params.failureReason,
    });
  }

  async logPasswordChanged(params: {
    accountId: string;
    accountType: number;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.PASSWORD_CHANGED,
      accountType: params.accountType,
      accountId: params.accountId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: AuthEventResult.SUCCESS,
    });
  }

  async logSessionRevoked(params: {
    accountId: string;
    accountType: number;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    reason?: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.SESSION_REVOKED,
      accountType: params.accountType,
      accountId: params.accountId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: AuthEventResult.SUCCESS,
      metadata: params.reason ? { reason: params.reason } : undefined,
    });
  }

  async logTokenRefreshed(params: {
    accountId: string;
    accountType: number;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    await this.logAuthEvent({
      eventType: AuthEventType.TOKEN_REFRESHED,
      accountType: params.accountType,
      accountId: params.accountId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: AuthEventResult.SUCCESS,
    });
  }
}
