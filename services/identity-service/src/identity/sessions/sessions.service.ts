import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Session } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';
import { PaginatedResponse } from '../../common/pagination';
import { maskUuid } from '../../common/utils/masking.util';
import { CreateSessionDto, RevokeSessionDto, SessionQueryDto } from './dto';

/**
 * Session response type
 */
export interface SessionResponse {
  id: string;
  accountId: string;
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
}

/**
 * Created session response with tokens
 */
export interface CreatedSessionResponse extends SessionResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Session validation context for binding checks
 */
export interface SessionValidationContext {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

/**
 * Session binding validation result
 */
export interface SessionBindingResult {
  valid: boolean;
  reason?: string;
  riskScore: number;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly defaultSessionDurationMs: number;
  private readonly maxSessionsPerAccount: number;
  private readonly enableSessionBinding: boolean;
  private readonly enableTokenReuseDetection: boolean;
  private readonly ipBindingStrict: boolean;

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {
    this.defaultSessionDurationMs = this.configService.get<number>(
      'session.defaultDurationMs',
      24 * 60 * 60 * 1000, // 24 hours default
    );
    this.maxSessionsPerAccount = this.configService.get<number>(
      'session.maxSessionsPerAccount',
      10, // 10 sessions per account default
    );
    // Session binding validation (Zero Trust)
    this.enableSessionBinding = this.configService.get<boolean>('session.enableBinding', true);
    // Token reuse detection (prevents refresh token theft)
    this.enableTokenReuseDetection = this.configService.get<boolean>(
      'session.enableTokenReuseDetection',
      true,
    );
    // Strict IP binding (false allows same /24 subnet)
    this.ipBindingStrict = this.configService.get<boolean>('session.ipBindingStrict', false);
  }

  /**
   * Validate session binding (IP, User-Agent, Device)
   * Implements Zero Trust session validation
   */
  private validateSessionBinding(
    session: Session,
    context: SessionValidationContext,
  ): SessionBindingResult {
    if (!this.enableSessionBinding) {
      return { valid: true, riskScore: 0 };
    }

    let riskScore = 0;
    const issues: string[] = [];

    // IP Address validation
    if (context.ipAddress && session.ipAddress) {
      if (this.ipBindingStrict) {
        // Strict: exact match
        if (context.ipAddress !== session.ipAddress) {
          riskScore += 50;
          issues.push('IP address changed');
        }
      } else {
        // Lenient: same /24 subnet for IPv4
        if (!this.isSameSubnet(context.ipAddress, session.ipAddress)) {
          riskScore += 30;
          issues.push('IP subnet changed');
        }
      }
    }

    // User-Agent validation (browser fingerprint)
    if (context.userAgent && session.userAgent) {
      const similarity = this.calculateUserAgentSimilarity(context.userAgent, session.userAgent);
      if (similarity < 0.8) {
        riskScore += 30;
        issues.push('User-Agent changed significantly');
      } else if (similarity < 0.95) {
        riskScore += 10;
        issues.push('User-Agent minor changes');
      }
    }

    // Device binding validation
    if (context.deviceId && session.deviceId && context.deviceId !== session.deviceId) {
      riskScore += 40;
      issues.push('Device changed');
    }

    // Risk threshold (70+ is suspicious, 100+ is blocked)
    const valid = riskScore < 100;

    if (riskScore > 0) {
      this.logger.warn(
        `Session ${maskUuid(session.id)} binding validation: risk=${riskScore}, issues=${issues.join(', ')}`,
      );
    }

    return {
      valid,
      reason: issues.length > 0 ? issues.join('; ') : undefined,
      riskScore,
    };
  }

  /**
   * Check if two IPs are in the same subnet
   * IPv4: /24 subnet (first 3 octets)
   * IPv6: /64 subnet (first 4 groups - RFC 4291 standard)
   */
  private isSameSubnet(ip1: string, ip2: string): boolean {
    // Handle IPv6 by comparing first 64 bits (/64 prefix - RFC 4291)
    if (ip1.includes(':') || ip2.includes(':')) {
      // Normalize IPv6 addresses (handle compressed format)
      const normalize = (ip: string): string[] => {
        // Expand :: to full form
        if (ip.includes('::')) {
          const parts = ip.split('::');
          const left = parts[0] ? parts[0].split(':') : [];
          const right = parts[1] ? parts[1].split(':') : [];
          const missing = 8 - left.length - right.length;
          const middle = Array(missing).fill('0000');
          return [...left, ...middle, ...right].map((g) => g.padStart(4, '0'));
        }
        return ip.split(':').map((g) => g.padStart(4, '0'));
      };

      const groups1 = normalize(ip1).slice(0, 4); // First 64 bits
      const groups2 = normalize(ip2).slice(0, 4);
      return groups1.join(':').toLowerCase() === groups2.join(':').toLowerCase();
    }

    // IPv4: compare /24 subnet
    const parts1 = ip1.split('.').slice(0, 3);
    const parts2 = ip2.split('.').slice(0, 3);
    return parts1.join('.') === parts2.join('.');
  }

  /**
   * Calculate User-Agent similarity (simple Jaccard similarity on tokens)
   */
  private calculateUserAgentSimilarity(ua1: string, ua2: string): number {
    if (ua1 === ua2) return 1.0;

    const tokens1 = new Set(ua1.toLowerCase().split(/[\s\/\(\);,]+/));
    const tokens2 = new Set(ua2.toLowerCase().split(/[\s\/\(\);,]+/));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate a secure random token using CryptoService (SSOT)
   */
  private generateToken(): string {
    return this.cryptoService.generateToken(32);
  }

  /**
   * Hash a token for storage using CryptoService (SSOT)
   */
  private hashToken(token: string): string {
    return this.cryptoService.hash(token);
  }

  /**
   * Create a new session
   */
  async create(dto: CreateSessionDto): Promise<CreatedSessionResponse> {
    this.logger.log(`Creating session for account: ${maskUuid(dto.accountId)}`);

    // Verify account exists
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check maximum sessions per account limit
    const activeSessionCount = await this.getActiveSessionCount(dto.accountId);
    if (activeSessionCount >= this.maxSessionsPerAccount) {
      throw new BadRequestException(
        `Maximum sessions limit (${this.maxSessionsPerAccount}) reached for this account`,
      );
    }

    // Verify device exists if provided
    if (dto.deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { id: dto.deviceId },
      });
      if (!device) {
        throw new NotFoundException('Device not found');
      }
      if (device.accountId !== dto.accountId) {
        throw new BadRequestException('Device does not belong to the account');
      }
    }

    // Generate tokens
    const accessToken = this.generateToken();
    const refreshToken = this.generateToken();
    const tokenHash = this.hashToken(accessToken);

    // Calculate expiration
    const expiresInMs = dto.expiresInMs || this.defaultSessionDurationMs;
    const expiresAt = new Date(Date.now() + expiresInMs);

    const session = await this.prisma.session.create({
      data: {
        accountId: dto.accountId,
        deviceId: dto.deviceId || null,
        tokenHash,
        refreshTokenHash: this.hashToken(refreshToken),
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        expiresAt,
        isActive: true,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Session created with ID: ${maskUuid(session.id)}`);

    return {
      id: session.id,
      accountId: session.accountId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
      revokedReason: session.revokedReason,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<SessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.toSessionResponse(session);
  }

  /**
   * Find session by token hash
   */
  async findByTokenHash(tokenHash: string): Promise<SessionResponse | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      return null;
    }

    return this.toSessionResponse(session);
  }

  /**
   * Validate and find session by access token
   */
  async validateAccessToken(accessToken: string): Promise<SessionResponse | null> {
    const tokenHash = this.hashToken(accessToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      return null;
    }

    // Check if session is active and not expired
    if (!session.isActive || new Date() > session.expiresAt) {
      return null;
    }

    return this.toSessionResponse(session);
  }

  /**
   * Refresh a session using refresh token
   * Implements token reuse detection for security (RFC 6819)
   *
   * Token Reuse Detection:
   * - Stores previousRefreshTokenHash after rotation
   * - If a reused (old) token is detected, revokes all account sessions
   * - This prevents refresh token theft attacks
   */
  async refresh(
    refreshToken: string,
    context?: SessionValidationContext,
  ): Promise<CreatedSessionResponse> {
    const refreshTokenHash = this.hashToken(refreshToken);

    // First, check if this is a reused (old) token - indicates potential theft
    if (this.enableTokenReuseDetection) {
      const reusedSession = await this.prisma.session.findFirst({
        where: {
          previousRefreshTokenHash: refreshTokenHash,
          isActive: true,
        },
      });

      if (reusedSession) {
        // Token reuse detected! This is a security incident
        this.logger.error(
          `SECURITY: Refresh token reuse detected for session ${maskUuid(reusedSession.id)}. ` +
            `Revoking all sessions for account ${maskUuid(reusedSession.accountId)}`,
        );

        // Revoke ALL sessions for this account (nuclear option for security)
        await this.revokeAllForAccount(reusedSession.accountId);

        throw new ForbiddenException(
          'Token reuse detected. All sessions have been revoked for security.',
        );
      }
    }

    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!session.isActive) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session has expired');
    }

    // Validate session binding if context provided
    if (context) {
      const bindingResult = this.validateSessionBinding(session, context);
      if (!bindingResult.valid) {
        this.logger.warn(
          `Session ${maskUuid(session.id)} binding validation failed: ${bindingResult.reason}`,
        );
        throw new ForbiddenException('Session validation failed. Please log in again.');
      }
    }

    // Generate new tokens
    const newAccessToken = this.generateToken();
    const newRefreshToken = this.generateToken();
    const newTokenHash = this.hashToken(newAccessToken);
    const newRefreshTokenHash = this.hashToken(newRefreshToken);

    // Store current refresh token hash as previous (for reuse detection)
    const previousRefreshTokenHash = this.enableTokenReuseDetection ? refreshTokenHash : null;

    // Extend expiration
    const newExpiresAt = new Date(Date.now() + this.defaultSessionDurationMs);

    const updatedSession = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: newTokenHash,
        refreshTokenHash: newRefreshTokenHash,
        previousRefreshTokenHash,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
        // Update IP if provided (for session continuity tracking)
        ...(context?.ipAddress && { ipAddress: context.ipAddress }),
      },
    });

    this.logger.log(`Session ${maskUuid(session.id)} refreshed`);

    return {
      ...this.toSessionResponse(updatedSession),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke a session
   */
  async revoke(id: string, dto?: RevokeSessionDto): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: dto?.reason || 'User initiated logout',
      },
    });

    this.logger.log(`Session ${maskUuid(id)} revoked`);
  }

  /**
   * Revoke all sessions for an account
   */
  async revokeAllForAccount(accountId: string, excludeSessionId?: string): Promise<number> {
    const where: Prisma.SessionWhereInput = {
      accountId,
      isActive: true,
      ...(excludeSessionId && { id: { not: excludeSessionId } }),
    };

    const result = await this.prisma.session.updateMany({
      where,
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'All sessions revoked',
      },
    });

    this.logger.log(`Revoked ${result.count} sessions for account ${maskUuid(accountId)}`);
    return result.count;
  }

  /**
   * List sessions with pagination and filtering
   */
  async findAll(params: SessionQueryDto): Promise<PaginatedResponse<SessionResponse>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SessionWhereInput = {};

    if (params.accountId) {
      where.accountId = params.accountId;
    }
    if (params.deviceId) {
      where.deviceId = params.deviceId;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.session.count({ where }),
    ]);

    return PaginatedResponse.create(
      sessions.map((session) => this.toSessionResponse(session)),
      total,
      page,
      limit,
    );
  }

  /**
   * Update session activity timestamp
   */
  async touch(id: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return; // Silently fail for non-existent sessions
    }

    await this.prisma.session.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: {
        isActive: false,
        revokedReason: 'Session expired',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * Get active session count for account
   */
  async getActiveSessionCount(accountId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        accountId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Convert Prisma session to response type
   */
  private toSessionResponse(session: Session): SessionResponse {
    return {
      id: session.id,
      accountId: session.accountId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
      revokedReason: session.revokedReason,
    };
  }
}
