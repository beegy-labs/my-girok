import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AuthGrpcClient,
  AuditGrpcClient,
  Admin,
  AdminSession,
  Permission,
  AccountType as AuditAccountType,
} from '../grpc-clients';
import { SessionService } from '../session/session.service';
import { BffSession } from '../common/types';
import {
  AdminLoginDto,
  AdminLoginMfaDto,
  AdminInfoDto,
  AdminSessionListDto,
  LoginHistoryQueryDto,
  LoginHistoryResponseDto,
  LoginHistoryEventDto,
} from './dto/admin.dto';
import { AccountType } from '../config/constants';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly authClient: AuthGrpcClient,
    private readonly auditClient: AuditGrpcClient,
    private readonly sessionService: SessionService,
  ) {}

  async login(
    req: Request,
    res: Response,
    dto: AdminLoginDto,
  ): Promise<{
    success: boolean;
    mfaRequired?: boolean;
    challengeId?: string;
    availableMethods?: string[];
    admin?: AdminInfoDto;
    message: string;
  }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

    try {
      const response = await this.authClient.adminLogin({
        email: dto.email,
        password: dto.password,
        ipAddress: ip,
        userAgent,
        deviceFingerprint,
      });

      if (!response.success) {
        throw new UnauthorizedException(response.message || 'Invalid credentials');
      }

      // MFA required - return challenge
      if (response.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          challengeId: response.challengeId,
          availableMethods: this.mapMfaMethods(response.availableMethods),
          message: 'MFA verification required',
        };
      }

      // No MFA - create session directly
      if (response.admin && response.session) {
        await this.createAdminSession(
          req,
          res,
          response.admin,
          response.accessToken,
          response.refreshToken,
          response.session.mfaVerified,
          response.admin.mfaRequired,
          this.extractPermissions(response.admin.role?.permissions),
        );

        // Log successful login
        this.auditClient.logLoginSuccess({
          accountId: response.admin.id,
          accountType: AuditAccountType.ADMIN,
          sessionId: response.session.id,
          ipAddress: ip,
          userAgent,
          deviceFingerprint,
        });

        return {
          success: true,
          admin: this.mapAdminToDto(response.admin),
          message: 'Login successful',
        };
      }

      throw new UnauthorizedException('Login failed');
    } catch (error) {
      this.logger.error(`Admin login failed for ${dto.email}`, error);

      // Log failed login (fire and forget)
      this.auditClient.logLoginFailed({
        accountId: dto.email,
        accountType: AuditAccountType.ADMIN,
        ipAddress: ip,
        userAgent,
        deviceFingerprint,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Login failed');
    }
  }

  async loginMfa(
    req: Request,
    res: Response,
    dto: AdminLoginMfaDto,
  ): Promise<{ success: boolean; admin: AdminInfoDto; message: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

    try {
      const response = await this.authClient.adminLoginMfa({
        challengeId: dto.challengeId,
        code: dto.code,
        method: dto.method === 'totp' ? 1 : 2,
        ipAddress: ip,
        userAgent,
        deviceFingerprint,
      });

      if (!response.success) {
        throw new UnauthorizedException(response.message || 'MFA verification failed');
      }

      // Create session
      await this.createAdminSession(
        req,
        res,
        response.admin,
        response.accessToken,
        response.refreshToken,
        true, // MFA verified
        response.admin.mfaRequired,
        this.extractPermissions(response.admin.role?.permissions),
      );

      // Log successful MFA verification
      this.auditClient.logMfaVerified({
        accountId: response.admin.id,
        accountType: AuditAccountType.ADMIN,
        ipAddress: ip,
        userAgent,
        method: dto.method,
      });

      return {
        success: true,
        admin: this.mapAdminToDto(response.admin),
        message: 'MFA verification successful',
      };
    } catch (error) {
      this.logger.error('Admin MFA login failed', error);

      // Log failed MFA attempt
      this.auditClient.logMfaFailed({
        accountId: dto.challengeId, // We don't have account ID here
        accountType: AuditAccountType.ADMIN,
        ipAddress: ip,
        userAgent,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('MFA verification failed');
    }
  }

  async logout(req: Request, res: Response): Promise<{ success: boolean; message: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      const session = await this.sessionService.getSession(req);

      if (session) {
        // Revoke session in auth-service
        await this.authClient.adminLogout(session.id);

        // Log logout event
        this.auditClient.logLogout({
          accountId: session.accountId,
          accountType: AuditAccountType.ADMIN,
          sessionId: session.id,
          ipAddress: ip,
          userAgent,
        });
      }

      // Destroy BFF session
      await this.sessionService.destroySession(req, res);

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Admin logout failed', error);
      // Still destroy local session even if remote call fails
      await this.sessionService.destroySession(req, res);
      return { success: true, message: 'Logged out' };
    }
  }

  async getMe(session: BffSession): Promise<AdminInfoDto> {
    // Return info from session
    return {
      id: session.accountId,
      email: session.email,
      name: session.email.split('@')[0], // Fallback name from email
      scope: 'SYSTEM', // Would need to fetch from backend if needed
      mfaEnabled: session.mfaVerified,
      permissions: session.permissions,
    };
  }

  async getActiveSessions(
    session: BffSession,
    currentSessionId: string,
  ): Promise<AdminSessionListDto[]> {
    try {
      const response = await this.authClient.adminGetActiveSessions(session.accountId);

      return response.sessions.map((s: AdminSession) => ({
        id: s.id,
        deviceFingerprint: s.deviceFingerprint,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        mfaVerified: s.mfaVerified,
        createdAt: new Date(s.createdAt.seconds * 1000),
        lastActivityAt: new Date(s.lastActivityAt.seconds * 1000),
        isCurrent: s.id === currentSessionId,
      }));
    } catch (error) {
      this.logger.error('Failed to get active sessions', error);
      return [];
    }
  }

  async revokeSession(
    session: BffSession,
    targetSessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Don't allow revoking current session through this endpoint
      if (targetSessionId === session.id) {
        throw new ForbiddenException('Use logout to end current session');
      }

      const response = await this.authClient.adminLogout(targetSessionId);
      return { success: response.success, message: response.message };
    } catch (error) {
      this.logger.error('Failed to revoke session', error);
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Failed to revoke session');
    }
  }

  async revokeAllOtherSessions(
    session: BffSession,
  ): Promise<{ success: boolean; revokedCount: number; message: string }> {
    try {
      const response = await this.authClient.adminRevokeAllSessions(
        session.accountId,
        session.id,
        'User revoked all sessions',
      );

      return {
        success: response.success,
        revokedCount: response.revokedCount,
        message: `Revoked ${response.revokedCount} sessions`,
      };
    } catch (error) {
      this.logger.error('Failed to revoke all sessions', error);
      throw new UnauthorizedException('Failed to revoke sessions');
    }
  }

  async setupMfa(
    session: BffSession,
  ): Promise<{ secret: string; qrCodeUri: string; backupCodes: string[] }> {
    try {
      const response = await this.authClient.adminSetupMfa(session.accountId);
      return {
        secret: response.secret,
        qrCodeUri: response.qrCodeUri,
        backupCodes: response.backupCodes,
      };
    } catch (error) {
      this.logger.error('Failed to setup MFA', error);
      throw new UnauthorizedException('Failed to setup MFA');
    }
  }

  async verifyMfaSetup(
    session: BffSession,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.authClient.adminVerifyMfa(session.accountId, code);
      return { success: response.success, message: response.message };
    } catch (error) {
      this.logger.error('Failed to verify MFA setup', error);
      throw new UnauthorizedException('Failed to verify MFA');
    }
  }

  async disableMfa(
    session: BffSession,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.authClient.adminDisableMfa(session.accountId, password);
      return { success: response.success, message: response.message };
    } catch (error) {
      this.logger.error('Failed to disable MFA', error);
      throw new UnauthorizedException('Failed to disable MFA');
    }
  }

  async regenerateBackupCodes(
    session: BffSession,
    password: string,
  ): Promise<{ backupCodes: string[] }> {
    try {
      const response = await this.authClient.adminRegenerateBackupCodes(
        session.accountId,
        password,
      );
      return { backupCodes: response.backupCodes };
    } catch (error) {
      this.logger.error('Failed to regenerate backup codes', error);
      throw new UnauthorizedException('Failed to regenerate backup codes');
    }
  }

  async changePassword(
    req: Request,
    session: BffSession,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      const response = await this.authClient.adminChangePassword(
        session.accountId,
        currentPassword,
        newPassword,
      );

      if (response.success) {
        // Log password change event
        this.auditClient.logPasswordChanged({
          accountId: session.accountId,
          accountType: AuditAccountType.ADMIN,
          ipAddress: ip,
          userAgent,
        });
      }

      return { success: response.success, message: response.message };
    } catch (error) {
      this.logger.error('Failed to change password', error);
      throw new UnauthorizedException('Failed to change password');
    }
  }

  async refreshSession(
    req: Request,
    res: Response,
    _session: BffSession,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const sessionWithTokens = await this.sessionService.getSessionWithTokens(req);
      if (!sessionWithTokens) {
        throw new UnauthorizedException('Session not found');
      }

      // Hash the refresh token for the gRPC call
      const crypto = require('crypto');
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(sessionWithTokens.decryptedRefreshToken)
        .digest('hex');

      const response = await this.authClient.adminRefreshSession(refreshTokenHash);

      if (!response.success) {
        throw new UnauthorizedException(response.message);
      }

      // Update BFF session with new tokens
      await this.sessionService.refreshSession(
        req,
        res,
        response.accessToken,
        response.refreshToken,
      );

      return { success: true, message: 'Session refreshed' };
    } catch (error) {
      this.logger.error('Failed to refresh session', error);
      throw new UnauthorizedException('Failed to refresh session');
    }
  }

  private async createAdminSession(
    req: Request,
    res: Response,
    admin: Admin,
    accessToken: string,
    refreshToken: string,
    mfaVerified: boolean,
    mfaRequired: boolean,
    permissions: string[],
  ): Promise<void> {
    const metadata = this.sessionService.extractMetadata(req);
    const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

    await this.sessionService.createSession(
      res,
      {
        accountType: AccountType.ADMIN,
        accountId: admin.id,
        email: admin.email,
        accessToken,
        refreshToken,
        deviceFingerprint,
        mfaVerified,
        mfaRequired,
        permissions,
      },
      metadata,
    );
  }

  private mapAdminToDto(admin: Admin): AdminInfoDto {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      scope: admin.scope === 1 ? 'SYSTEM' : 'TENANT',
      mfaEnabled: admin.mfaEnabled,
      roleName: admin.role?.name,
      permissions: this.extractPermissions(admin.role?.permissions),
    };
  }

  private extractPermissions(permissions?: Permission[]): string[] {
    if (!permissions) return [];
    return permissions.map((p) => `${p.resource}:${p.action}`);
  }

  private mapMfaMethods(methods?: number[]): string[] {
    if (!methods) return [];
    return methods.map((m) => {
      switch (m) {
        case 1:
          return 'totp';
        case 2:
          return 'backup_code';
        default:
          return 'unknown';
      }
    });
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  async getLoginHistory(query: LoginHistoryQueryDto): Promise<LoginHistoryResponseDto> {
    try {
      // Convert query params to gRPC request format
      const request = {
        accountId: query.accountId,
        accountType: query.accountType ? this.accountTypeToProto(query.accountType) : undefined,
        eventType: query.eventType ? this.eventTypeToProto(query.eventType) : undefined,
        result: query.result ? this.resultToProto(query.result) : undefined,
        ipAddress: query.ipAddress,
        startTime: query.startDate
          ? { seconds: Math.floor(new Date(query.startDate).getTime() / 1000), nanos: 0 }
          : undefined,
        endTime: query.endDate
          ? { seconds: Math.floor(new Date(query.endDate).getTime() / 1000), nanos: 0 }
          : undefined,
        page: query.page ?? 1,
        pageSize: query.limit ?? 20,
        descending: true,
      };

      const response = await this.auditClient.getAuthEvents(request);

      const data: LoginHistoryEventDto[] = response.events.map((event) => ({
        id: event.id,
        eventType: this.protoToEventType(event.eventType),
        accountType: this.protoToAccountType(event.accountType),
        accountId: event.accountId,
        sessionId: event.sessionId || undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        deviceFingerprint: event.deviceFingerprint || undefined,
        countryCode: event.countryCode || undefined,
        result: this.protoToResult(event.result),
        failureReason: event.failureReason || undefined,
        metadata: event.metadata,
        timestamp: new Date(event.timestamp.seconds * 1000).toISOString(),
      }));

      const totalPages = Math.ceil(response.totalCount / (query.limit ?? 20));

      return {
        data,
        total: response.totalCount,
        page: response.page,
        limit: response.pageSize,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to get login history', error);
      return {
        data: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalPages: 0,
      };
    }
  }

  // Proto enum conversion helpers
  private accountTypeToProto(type: string): number {
    const map: Record<string, number> = {
      USER: AuditAccountType.USER,
      OPERATOR: AuditAccountType.OPERATOR,
      ADMIN: AuditAccountType.ADMIN,
    };
    return map[type] ?? 0;
  }

  private protoToAccountType(proto: number): string {
    const map: Record<number, string> = {
      [AuditAccountType.USER]: 'USER',
      [AuditAccountType.OPERATOR]: 'OPERATOR',
      [AuditAccountType.ADMIN]: 'ADMIN',
    };
    return map[proto] ?? 'UNSPECIFIED';
  }

  private eventTypeToProto(type: string): number {
    const { AuthEventType } = require('../grpc-clients');
    const map: Record<string, number> = {
      LOGIN_SUCCESS: AuthEventType.LOGIN_SUCCESS,
      LOGIN_FAILED: AuthEventType.LOGIN_FAILED,
      LOGIN_BLOCKED: AuthEventType.LOGIN_BLOCKED,
      LOGOUT: AuthEventType.LOGOUT,
      MFA_VERIFIED: AuthEventType.MFA_VERIFIED,
      MFA_FAILED: AuthEventType.MFA_FAILED,
    };
    return map[type] ?? 0;
  }

  private protoToEventType(proto: number): string {
    const { AuthEventType } = require('../grpc-clients');
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
      [AuthEventType.PASSWORD_CHANGED]: 'PASSWORD_CHANGED',
      [AuthEventType.PASSWORD_RESET]: 'PASSWORD_RESET',
      [AuthEventType.TOKEN_REFRESHED]: 'TOKEN_REFRESHED',
      [AuthEventType.TOKEN_REVOKED]: 'TOKEN_REVOKED',
    };
    return map[proto] ?? 'UNSPECIFIED';
  }

  private resultToProto(result: string): number {
    const { AuthEventResult } = require('../grpc-clients');
    const map: Record<string, number> = {
      SUCCESS: AuthEventResult.SUCCESS,
      FAILURE: AuthEventResult.FAILURE,
      BLOCKED: AuthEventResult.BLOCKED,
    };
    return map[result] ?? 0;
  }

  private protoToResult(proto: number): string {
    const { AuthEventResult } = require('../grpc-clients');
    const map: Record<number, string> = {
      [AuthEventResult.SUCCESS]: 'SUCCESS',
      [AuthEventResult.FAILURE]: 'FAILURE',
      [AuthEventResult.BLOCKED]: 'BLOCKED',
    };
    return map[proto] ?? 'UNSPECIFIED';
  }
}
