import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Session } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { PaginatedResponse } from '../../common/pagination';
import { CreateSessionDto, RevokeSessionDto, SessionQueryDto } from './dto';
import * as crypto from 'crypto';

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

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly defaultSessionDurationMs: number;

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly configService: ConfigService,
  ) {
    this.defaultSessionDurationMs = this.configService.get<number>(
      'session.defaultDurationMs',
      24 * 60 * 60 * 1000, // 24 hours default
    );
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new session
   */
  async create(dto: CreateSessionDto): Promise<CreatedSessionResponse> {
    this.logger.log(`Creating session for account: ${dto.accountId}`);

    // Verify account exists
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${dto.accountId} not found`);
    }

    // Verify device exists if provided
    if (dto.deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { id: dto.deviceId },
      });
      if (!device) {
        throw new NotFoundException(`Device with ID ${dto.deviceId} not found`);
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
        refreshToken: this.hashToken(refreshToken),
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        expiresAt,
        isActive: true,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Session created with ID: ${session.id}`);

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
      throw new NotFoundException(`Session with ID ${id} not found`);
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
   */
  async refresh(refreshToken: string): Promise<CreatedSessionResponse> {
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: { refreshToken: refreshTokenHash },
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

    // Generate new tokens
    const newAccessToken = this.generateToken();
    const newRefreshToken = this.generateToken();
    const newTokenHash = this.hashToken(newAccessToken);
    const newRefreshTokenHash = this.hashToken(newRefreshToken);

    // Extend expiration
    const newExpiresAt = new Date(Date.now() + this.defaultSessionDurationMs);

    const updatedSession = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: newTokenHash,
        refreshToken: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Session ${session.id} refreshed`);

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
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    await this.prisma.session.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: dto?.reason || 'User initiated logout',
      },
    });

    this.logger.log(`Session ${id} revoked`);
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

    this.logger.log(`Revoked ${result.count} sessions for account ${accountId}`);
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
