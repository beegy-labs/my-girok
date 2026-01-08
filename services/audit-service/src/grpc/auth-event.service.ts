import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { ID } from '@my-girok/nest-common';
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

export interface GetAuthEventsRequest {
  accountId?: string;
  accountType?: number;
  eventType?: number;
  result?: number;
  ipAddress?: string;
  sessionId?: string;
  startTime?: { seconds: number; nanos: number };
  endTime?: { seconds: number; nanos: number };
  page?: number;
  pageSize?: number;
  orderBy?: string;
  descending?: boolean;
}

// Response interfaces
export interface AuthEvent {
  id: string;
  eventType: number;
  accountType: number;
  accountId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  countryCode: string;
  result: number;
  failureReason: string;
  metadata: Record<string, string>;
  timestamp: { seconds: number; nanos: number };
}

// ClickHouse row interface
interface AuthEventRow {
  id: string;
  event_type: string;
  account_type: string;
  account_id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint: string;
  country_code: string;
  result: string;
  failure_reason: string;
  metadata: string;
  timestamp: string;
}

@Injectable()
export class AuthEventService {
  private readonly logger = new Logger(AuthEventService.name);

  constructor(private readonly clickhouse: ClickHouseService) {}

  /**
   * Log an authentication event to ClickHouse
   */
  async logAuthEvent(
    request: LogAuthEventRequest,
  ): Promise<{ success: boolean; eventId: string; message: string }> {
    const eventId = ID.generate();
    const now = new Date();

    try {
      // Convert proto enums to string values for ClickHouse
      const eventTypeStr = this.protoToEventType(request.eventType);
      const accountTypeStr = this.protoToAccountType(request.accountType);
      const resultStr = this.protoToResult(request.result);

      await this.clickhouse.insert('audit_db.auth_events', [
        {
          id: eventId,
          event_type: eventTypeStr,
          account_type: accountTypeStr,
          account_id: request.accountId,
          session_id: request.sessionId ?? '',
          ip_address: request.ipAddress,
          user_agent: request.userAgent,
          device_fingerprint: request.deviceFingerprint ?? '',
          country_code: request.countryCode ?? '',
          result: resultStr,
          failure_reason: request.failureReason ?? '',
          metadata: request.metadata ? JSON.stringify(request.metadata) : '{}',
          timestamp: now.toISOString(),
        },
      ]);

      this.logger.debug(
        `Logged auth event: ${eventTypeStr} for ${accountTypeStr}:${request.accountId}`,
      );

      return {
        success: true,
        eventId,
        message: 'Event logged successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to log auth event: ${error}`);
      return {
        success: false,
        eventId: '',
        message: `Failed to log event: ${error}`,
      };
    }
  }

  /**
   * Query authentication events from ClickHouse
   */
  async getAuthEvents(request: GetAuthEventsRequest): Promise<{
    events: AuthEvent[];
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    const page = request.page ?? 1;
    const pageSize = request.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    try {
      // Build WHERE conditions
      const conditions: string[] = [];
      const params: Record<string, unknown> = {
        limit: pageSize,
        offset,
      };

      if (request.accountId) {
        conditions.push('account_id = {accountId:String}');
        params.accountId = request.accountId;
      }

      if (request.accountType !== undefined && request.accountType !== 0) {
        conditions.push('account_type = {accountType:String}');
        params.accountType = this.protoToAccountType(request.accountType);
      }

      if (request.eventType !== undefined && request.eventType !== 0) {
        conditions.push('event_type = {eventType:String}');
        params.eventType = this.protoToEventType(request.eventType);
      }

      if (request.result !== undefined && request.result !== 0) {
        conditions.push('result = {result:String}');
        params.result = this.protoToResult(request.result);
      }

      if (request.ipAddress) {
        conditions.push('ip_address = {ipAddress:String}');
        params.ipAddress = request.ipAddress;
      }

      if (request.sessionId) {
        conditions.push('session_id = {sessionId:String}');
        params.sessionId = request.sessionId;
      }

      if (request.startTime) {
        const startDate = new Date(request.startTime.seconds * 1000);
        conditions.push('timestamp >= {startTime:DateTime64}');
        params.startTime = startDate.toISOString();
      }

      if (request.endTime) {
        const endDate = new Date(request.endTime.seconds * 1000);
        conditions.push('timestamp <= {endTime:DateTime64}');
        params.endTime = endDate.toISOString();
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Order by
      const orderBy = request.orderBy || 'timestamp';
      const orderDirection = request.descending !== false ? 'DESC' : 'ASC';

      // Count query
      const countSql = `SELECT count() as total FROM audit_db.auth_events ${whereClause}`;
      const countResult = await this.clickhouse.query<{ total: string }>(countSql, params);
      const totalCount = parseInt(countResult.data[0]?.total ?? '0', 10);

      // Data query
      const dataSql = `
        SELECT
          id, event_type, account_type, account_id, session_id,
          ip_address, user_agent, device_fingerprint, country_code,
          result, failure_reason, metadata, timestamp
        FROM audit_db.auth_events
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT {limit:UInt32}
        OFFSET {offset:UInt32}
      `;

      const result = await this.clickhouse.query<AuthEventRow>(dataSql, params);

      const events: AuthEvent[] = result.data.map((row) => this.mapRowToAuthEvent(row));

      return {
        events,
        totalCount,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(`Failed to query auth events: ${error}`);
      return {
        events: [],
        totalCount: 0,
        page,
        pageSize,
      };
    }
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private mapRowToAuthEvent(row: AuthEventRow): AuthEvent {
    const timestamp = new Date(row.timestamp);
    return {
      id: row.id,
      eventType: this.eventTypeToProto(row.event_type),
      accountType: this.accountTypeToProto(row.account_type),
      accountId: row.account_id,
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceFingerprint: row.device_fingerprint,
      countryCode: row.country_code,
      result: this.resultToProto(row.result),
      failureReason: row.failure_reason,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      timestamp: {
        seconds: Math.floor(timestamp.getTime() / 1000),
        nanos: (timestamp.getTime() % 1000) * 1000000,
      },
    };
  }

  private protoToEventType(proto: number): string {
    const map: Record<number, string> = {
      [AuthEventType.LOGIN_SUCCESS]: 'LOGIN_SUCCESS',
      [AuthEventType.LOGIN_FAILED]: 'LOGIN_FAILED',
      [AuthEventType.LOGIN_BLOCKED]: 'LOGIN_BLOCKED',
      [AuthEventType.LOGOUT]: 'LOGOUT',
      [AuthEventType.SESSION_EXPIRED]: 'SESSION_EXPIRED',
      [AuthEventType.SESSION_REVOKED]: 'SESSION_REVOKED',
      [AuthEventType.MFA_SETUP]: 'MFA_SETUP',
      [AuthEventType.MFA_VERIFIED]: 'MFA_VERIFIED',
      [AuthEventType.MFA_FAILED]: 'MFA_FAILED',
      [AuthEventType.MFA_DISABLED]: 'MFA_DISABLED',
      [AuthEventType.BACKUP_CODE_USED]: 'BACKUP_CODE_USED',
      [AuthEventType.BACKUP_CODES_REGENERATED]: 'BACKUP_CODES_REGENERATED',
      [AuthEventType.PASSWORD_CHANGED]: 'PASSWORD_CHANGED',
      [AuthEventType.PASSWORD_RESET]: 'PASSWORD_RESET',
      [AuthEventType.PASSWORD_RESET_REQUESTED]: 'PASSWORD_RESET_REQUESTED',
      [AuthEventType.ACCOUNT_CREATED]: 'ACCOUNT_CREATED',
      [AuthEventType.ACCOUNT_LOCKED]: 'ACCOUNT_LOCKED',
      [AuthEventType.ACCOUNT_UNLOCKED]: 'ACCOUNT_UNLOCKED',
      [AuthEventType.ACCOUNT_DELETED]: 'ACCOUNT_DELETED',
      [AuthEventType.TOKEN_REFRESHED]: 'TOKEN_REFRESHED',
      [AuthEventType.TOKEN_REVOKED]: 'TOKEN_REVOKED',
      [AuthEventType.OPERATOR_ASSIGNED]: 'OPERATOR_ASSIGNED',
      [AuthEventType.OPERATOR_REVOKED]: 'OPERATOR_REVOKED',
      [AuthEventType.OPERATOR_LOGIN]: 'OPERATOR_LOGIN',
      [AuthEventType.OPERATOR_LOGOUT]: 'OPERATOR_LOGOUT',
    };
    return map[proto] ?? 'UNSPECIFIED';
  }

  private eventTypeToProto(str: string): number {
    const map: Record<string, number> = {
      LOGIN_SUCCESS: AuthEventType.LOGIN_SUCCESS,
      LOGIN_FAILED: AuthEventType.LOGIN_FAILED,
      LOGIN_BLOCKED: AuthEventType.LOGIN_BLOCKED,
      LOGOUT: AuthEventType.LOGOUT,
      SESSION_EXPIRED: AuthEventType.SESSION_EXPIRED,
      SESSION_REVOKED: AuthEventType.SESSION_REVOKED,
      MFA_SETUP: AuthEventType.MFA_SETUP,
      MFA_VERIFIED: AuthEventType.MFA_VERIFIED,
      MFA_FAILED: AuthEventType.MFA_FAILED,
      MFA_DISABLED: AuthEventType.MFA_DISABLED,
      BACKUP_CODE_USED: AuthEventType.BACKUP_CODE_USED,
      BACKUP_CODES_REGENERATED: AuthEventType.BACKUP_CODES_REGENERATED,
      PASSWORD_CHANGED: AuthEventType.PASSWORD_CHANGED,
      PASSWORD_RESET: AuthEventType.PASSWORD_RESET,
      PASSWORD_RESET_REQUESTED: AuthEventType.PASSWORD_RESET_REQUESTED,
      ACCOUNT_CREATED: AuthEventType.ACCOUNT_CREATED,
      ACCOUNT_LOCKED: AuthEventType.ACCOUNT_LOCKED,
      ACCOUNT_UNLOCKED: AuthEventType.ACCOUNT_UNLOCKED,
      ACCOUNT_DELETED: AuthEventType.ACCOUNT_DELETED,
      TOKEN_REFRESHED: AuthEventType.TOKEN_REFRESHED,
      TOKEN_REVOKED: AuthEventType.TOKEN_REVOKED,
      OPERATOR_ASSIGNED: AuthEventType.OPERATOR_ASSIGNED,
      OPERATOR_REVOKED: AuthEventType.OPERATOR_REVOKED,
      OPERATOR_LOGIN: AuthEventType.OPERATOR_LOGIN,
      OPERATOR_LOGOUT: AuthEventType.OPERATOR_LOGOUT,
    };
    return map[str] ?? AuthEventType.UNSPECIFIED;
  }

  private protoToAccountType(proto: number): string {
    const map: Record<number, string> = {
      [AccountType.USER]: 'USER',
      [AccountType.OPERATOR]: 'OPERATOR',
      [AccountType.ADMIN]: 'ADMIN',
    };
    return map[proto] ?? 'UNSPECIFIED';
  }

  private accountTypeToProto(str: string): number {
    const map: Record<string, number> = {
      USER: AccountType.USER,
      OPERATOR: AccountType.OPERATOR,
      ADMIN: AccountType.ADMIN,
    };
    return map[str] ?? AccountType.UNSPECIFIED;
  }

  private protoToResult(proto: number): string {
    const map: Record<number, string> = {
      [AuthEventResult.SUCCESS]: 'SUCCESS',
      [AuthEventResult.FAILURE]: 'FAILURE',
      [AuthEventResult.BLOCKED]: 'BLOCKED',
    };
    return map[proto] ?? 'UNSPECIFIED';
  }

  private resultToProto(str: string): number {
    const map: Record<string, number> = {
      SUCCESS: AuthEventResult.SUCCESS,
      FAILURE: AuthEventResult.FAILURE,
      BLOCKED: AuthEventResult.BLOCKED,
    };
    return map[str] ?? AuthEventResult.UNSPECIFIED;
  }
}
