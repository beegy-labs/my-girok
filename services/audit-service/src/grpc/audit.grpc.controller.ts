import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import {
  AuthEventService,
  LogAuthEventRequest,
  GetAuthEventsRequest,
  AuthEvent,
} from './auth-event.service';

// Response interfaces for gRPC methods
interface LogAuthEventResponse {
  success: boolean;
  eventId: string;
  message: string;
}

interface GetAuthEventsResponse {
  events: AuthEvent[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Security event interfaces (placeholder for future implementation)
interface LogSecurityEventRequest {
  eventType: number;
  severity: number;
  subjectId: string;
  subjectType: number;
  ipAddress: string;
  userAgent: string;
  countryCode?: string;
  description: string;
  metadata?: Record<string, string>;
  actionTaken: boolean;
  actionDescription?: string;
}

interface LogSecurityEventResponse {
  success: boolean;
  eventId: string;
  message: string;
}

// Admin audit log interfaces (placeholder for future implementation)
interface LogAdminActionRequest {
  adminId: string;
  actionType: number;
  targetId: string;
  targetType: string;
  ipAddress: string;
  userAgent: string;
  description: string;
  beforeState?: string;
  afterState?: string;
  metadata?: Record<string, string>;
  success: boolean;
  errorMessage?: string;
}

interface LogAdminActionResponse {
  success: boolean;
  logId: string;
  message: string;
}

@Controller()
export class AuditGrpcController {
  private readonly logger = new Logger(AuditGrpcController.name);

  constructor(private readonly authEventService: AuthEventService) {}

  // ============================================================
  // Authentication Event Methods
  // ============================================================

  @GrpcMethod('AuditService', 'LogAuthEvent')
  async logAuthEvent(request: LogAuthEventRequest): Promise<LogAuthEventResponse> {
    this.logger.debug(`LogAuthEvent: type=${request.eventType}, account=${request.accountId}`);

    try {
      const result = await this.authEventService.logAuthEvent(request);
      return result;
    } catch (error) {
      this.logger.error(`LogAuthEvent failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error logging auth event',
      });
    }
  }

  @GrpcMethod('AuditService', 'GetAuthEvents')
  async getAuthEvents(request: GetAuthEventsRequest): Promise<GetAuthEventsResponse> {
    this.logger.debug(`GetAuthEvents: accountId=${request.accountId}, page=${request.page}`);

    try {
      const result = await this.authEventService.getAuthEvents(request);
      return result;
    } catch (error) {
      this.logger.error(`GetAuthEvents failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error querying auth events',
      });
    }
  }

  // ============================================================
  // Security Event Methods (placeholder)
  // ============================================================

  @GrpcMethod('AuditService', 'LogSecurityEvent')
  async logSecurityEvent(request: LogSecurityEventRequest): Promise<LogSecurityEventResponse> {
    this.logger.debug(`LogSecurityEvent: type=${request.eventType}, subject=${request.subjectId}`);

    // TODO: Implement security event logging
    // For now, return success to not break callers
    return {
      success: true,
      eventId: '',
      message: 'Security event logging not yet implemented',
    };
  }

  @GrpcMethod('AuditService', 'GetSecurityEvents')
  async getSecurityEvents(_request: unknown): Promise<{
    events: unknown[];
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    this.logger.debug('GetSecurityEvents');

    // TODO: Implement security event querying
    return {
      events: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    };
  }

  // ============================================================
  // Admin Audit Log Methods (placeholder)
  // ============================================================

  @GrpcMethod('AuditService', 'LogAdminAction')
  async logAdminAction(request: LogAdminActionRequest): Promise<LogAdminActionResponse> {
    this.logger.debug(`LogAdminAction: admin=${request.adminId}, action=${request.actionType}`);

    // TODO: Implement admin action logging
    return {
      success: true,
      logId: '',
      message: 'Admin action logging not yet implemented',
    };
  }

  @GrpcMethod('AuditService', 'GetAdminAuditLog')
  async getAdminAuditLog(_request: unknown): Promise<{
    logs: unknown[];
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    this.logger.debug('GetAdminAuditLog');

    // TODO: Implement admin audit log querying
    return {
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    };
  }

  // ============================================================
  // Compliance Report Methods (placeholder)
  // ============================================================

  @GrpcMethod('AuditService', 'GenerateComplianceReport')
  async generateComplianceReport(_request: unknown): Promise<{
    success: boolean;
    reportId: string;
    downloadUrl: string;
    expiresAt?: { seconds: number; nanos: number };
    message: string;
  }> {
    this.logger.debug('GenerateComplianceReport');

    // TODO: Implement compliance report generation
    return {
      success: false,
      reportId: '',
      downloadUrl: '',
      message: 'Compliance report generation not yet implemented',
    };
  }
}
