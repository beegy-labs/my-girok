import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { hashToken, getSessionExpiresAt, SESSION_EXPIRY } from '../../common/utils/session.utils';
import { OutboxService } from '../../common/outbox/outbox.service';

export interface SessionMetadata {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}

export interface AdminSessionData {
  id: string;
  adminId: string;
  tokenHash: string;
  refreshTokenHash: string | null;
  mfaVerified: boolean;
  mfaVerifiedAt: Date | null;
  mfaMethod: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date | null;
  createdAt: Date;
}

export interface CreateSessionResult {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ValidateSessionResult {
  valid: boolean;
  adminId?: string;
  sessionId?: string;
  mfaVerified?: boolean;
  expiresAt?: Date;
  message: string;
}

export interface RefreshSessionResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  message: string;
}

interface AdminRow {
  id: string;
  email: string;
  name: string;
  scope: string;
  roleId: string;
  roleName: string;
  roleLevel: number;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantType: string | null;
  accountMode: string;
  isActive: boolean;
}

@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Create a new admin session after successful authentication
   */
  async createSession(
    adminId: string,
    metadata: SessionMetadata,
    mfaVerified: boolean = false,
    mfaMethod?: string,
  ): Promise<CreateSessionResult> {
    const admin = await this.getAdminForToken(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    const { accessToken, refreshToken } = await this.generateTokens(admin);
    const tokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);
    const sessionId = ID.generate();
    const expiresAt = getSessionExpiresAt();
    const now = new Date();

    await this.prisma.$executeRaw`
      INSERT INTO admin_sessions (
        id, admin_id, token_hash, refresh_token_hash,
        mfa_verified, mfa_verified_at, mfa_method,
        ip_address, user_agent, device_fingerprint,
        is_active, expires_at, last_activity_at, created_at
      ) VALUES (
        ${sessionId}::uuid, ${adminId}::uuid, ${tokenHash}, ${refreshTokenHash},
        ${mfaVerified}, ${mfaVerified ? now : null}, ${mfaMethod ?? null},
        ${metadata.ipAddress}, ${metadata.userAgent}, ${metadata.deviceFingerprint ?? null},
        true, ${expiresAt}, ${now}, ${now}
      )
    `;

    this.logger.log(`Session created for admin ${adminId}: ${sessionId}`);

    return {
      sessionId,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Validate an admin session by token hash
   */
  async validateSession(tokenHash: string): Promise<ValidateSessionResult> {
    const sessions = await this.prisma.$queryRaw<AdminSessionData[]>`
      SELECT
        id, admin_id as "adminId", token_hash as "tokenHash",
        mfa_verified as "mfaVerified", mfa_verified_at as "mfaVerifiedAt",
        is_active as "isActive", expires_at as "expiresAt",
        revoked_at as "revokedAt"
      FROM admin_sessions
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;

    if (!sessions.length) {
      return { valid: false, message: 'Session not found' };
    }

    const session = sessions[0];

    if (!session.isActive) {
      return { valid: false, message: 'Session is inactive' };
    }

    if (new Date(session.expiresAt) < new Date()) {
      return { valid: false, message: 'Session expired' };
    }

    // Update last activity
    await this.updateLastActivity(session.id);

    return {
      valid: true,
      adminId: session.adminId,
      sessionId: session.id,
      mfaVerified: session.mfaVerified,
      expiresAt: session.expiresAt,
      message: 'Session valid',
    };
  }

  /**
   * Refresh an admin session using refresh token hash
   */
  async refreshSession(refreshTokenHash: string): Promise<RefreshSessionResult> {
    const sessions = await this.prisma.$queryRaw<
      (AdminSessionData & { previousRefreshTokenHash: string | null })[]
    >`
      SELECT
        s.id, s.admin_id as "adminId",
        s.refresh_token_hash as "refreshTokenHash",
        s.previous_refresh_token_hash as "previousRefreshTokenHash",
        s.mfa_verified as "mfaVerified",
        s.is_active as "isActive", s.expires_at as "expiresAt"
      FROM admin_sessions s
      WHERE (s.refresh_token_hash = ${refreshTokenHash} OR s.previous_refresh_token_hash = ${refreshTokenHash})
        AND s.is_active = true
        AND s.revoked_at IS NULL
      LIMIT 1
    `;

    if (!sessions.length) {
      return { success: false, message: 'Invalid refresh token' };
    }

    const session = sessions[0];

    // Check if using old refresh token (possible replay attack)
    if (session.previousRefreshTokenHash === refreshTokenHash) {
      // Revoke entire session - possible token theft
      await this.revokeSession(session.id, 'Refresh token reuse detected');
      this.logger.warn(`Possible token theft detected for session ${session.id}`);
      return { success: false, message: 'Session revoked due to security concern' };
    }

    if (new Date(session.expiresAt) < new Date()) {
      return { success: false, message: 'Session expired' };
    }

    // Generate new tokens
    const admin = await this.getAdminForToken(session.adminId);
    if (!admin) {
      return { success: false, message: 'Admin not found' };
    }

    const { accessToken, refreshToken } = await this.generateTokens(admin);
    const newTokenHash = hashToken(accessToken);
    const newRefreshTokenHash = hashToken(refreshToken);
    const newExpiresAt = getSessionExpiresAt();

    // Update session with new tokens (store previous for replay detection)
    await this.prisma.$executeRaw`
      UPDATE admin_sessions
      SET token_hash = ${newTokenHash},
          refresh_token_hash = ${newRefreshTokenHash},
          previous_refresh_token_hash = ${refreshTokenHash},
          expires_at = ${newExpiresAt},
          last_activity_at = NOW()
      WHERE id = ${session.id}::uuid
    `;

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresAt: newExpiresAt,
      message: 'Session refreshed',
    };
  }

  /**
   * Logout a single session
   */
  async logout(sessionId: string): Promise<boolean> {
    const result = await this.prisma.$executeRaw`
      UPDATE admin_sessions
      SET is_active = false, revoked_at = NOW(), revoked_reason = 'logout'
      WHERE id = ${sessionId}::uuid AND is_active = true
    `;

    if (result > 0) {
      this.logger.log(`Session logged out: ${sessionId}`);
    }

    return result > 0;
  }

  /**
   * Revoke all sessions for an admin
   */
  async revokeAllSessions(
    adminId: string,
    excludeSessionId?: string,
    reason: string = 'admin_request',
  ): Promise<number> {
    let result: number;

    if (excludeSessionId) {
      result = await this.prisma.$executeRaw`
        UPDATE admin_sessions
        SET is_active = false, revoked_at = NOW(), revoked_reason = ${reason}
        WHERE admin_id = ${adminId}::uuid
          AND is_active = true
          AND id != ${excludeSessionId}::uuid
      `;
    } else {
      result = await this.prisma.$executeRaw`
        UPDATE admin_sessions
        SET is_active = false, revoked_at = NOW(), revoked_reason = ${reason}
        WHERE admin_id = ${adminId}::uuid AND is_active = true
      `;
    }

    if (result > 0) {
      this.logger.log(`Revoked ${result} sessions for admin ${adminId}`);

      await this.outboxService.addEventDirect('ADMIN_SESSION_REVOKED', adminId, {
        adminId,
        revokedCount: result,
        reason,
        excludedSessionId: excludeSessionId ?? null,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Get all active sessions for an admin
   */
  async getActiveSessions(adminId: string): Promise<AdminSessionData[]> {
    return this.prisma.$queryRaw<AdminSessionData[]>`
      SELECT
        id, admin_id as "adminId", token_hash as "tokenHash",
        refresh_token_hash as "refreshTokenHash",
        mfa_verified as "mfaVerified", mfa_verified_at as "mfaVerifiedAt",
        mfa_method as "mfaMethod",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_fingerprint as "deviceFingerprint",
        is_active as "isActive", expires_at as "expiresAt",
        last_activity_at as "lastActivityAt", created_at as "createdAt"
      FROM admin_sessions
      WHERE admin_id = ${adminId}::uuid
        AND is_active = true
        AND expires_at > NOW()
      ORDER BY last_activity_at DESC NULLS LAST
    `;
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE admin_sessions
      SET last_activity_at = NOW()
      WHERE id = ${sessionId}::uuid
    `;
  }

  /**
   * Mark MFA as verified for a session
   */
  async markMfaVerified(sessionId: string, method: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE admin_sessions
      SET mfa_verified = true, mfa_verified_at = NOW(), mfa_method = ${method}
      WHERE id = ${sessionId}::uuid
    `;
  }

  private async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE admin_sessions
      SET is_active = false, revoked_at = NOW(), revoked_reason = ${reason}
      WHERE id = ${sessionId}::uuid
    `;
  }

  private async getAdminForToken(adminId: string): Promise<AdminRow | null> {
    const admins = await this.prisma.$queryRaw<AdminRow[]>`
      SELECT
        a.id, a.email, a.name, a.scope,
        a.role_id as "roleId", a.is_active as "isActive",
        COALESCE(a.account_mode, 'SERVICE') as "accountMode",
        a.tenant_id as "tenantId",
        t.slug as "tenantSlug", t.type as "tenantType",
        r.name as "roleName", r.level as "roleLevel"
      FROM admins a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      JOIN roles r ON a.role_id = r.id
      WHERE a.id = ${adminId}::uuid AND a.is_active = true
      LIMIT 1
    `;
    return admins[0] ?? null;
  }

  private async generateTokens(
    admin: AdminRow,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'ADMIN_ACCESS',
      scope: admin.scope,
      roleId: admin.roleId,
      roleName: admin.roleName,
      level: admin.roleLevel,
      tenantId: admin.tenantId,
      tenantSlug: admin.tenantSlug,
      accountMode: admin.accountMode,
    };

    const refreshPayload = {
      sub: admin.id,
      type: 'ADMIN_REFRESH',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '1h'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get(
          'JWT_REFRESH_EXPIRATION',
          `${SESSION_EXPIRY.REFRESH_TOKEN_DAYS}d`,
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
