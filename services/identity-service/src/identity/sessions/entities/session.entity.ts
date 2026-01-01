import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Session } from '.prisma/identity-client';
import { Exclude, Expose } from 'class-transformer';

/**
 * Session Entity
 * Serialized response for session data with sensitive fields excluded
 */
@Exclude()
export class SessionEntity {
  @Expose()
  @ApiProperty({ description: 'Session ID' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Device ID' })
  deviceId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'IP address (masked for privacy)' })
  ipAddress?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'User agent string' })
  userAgent?: string | null;

  @Expose()
  @ApiProperty({ description: 'Whether the session is active' })
  isActive!: boolean;

  @Expose()
  @ApiProperty({ description: 'Session expiration time' })
  expiresAt!: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'When the session was revoked' })
  revokedAt?: Date | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Reason for revocation' })
  revokedReason?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  lastActivityAt?: Date | null;

  @Expose()
  @ApiProperty({ description: 'Session creation time' })
  createdAt!: Date;

  // Sensitive fields - NEVER exposed in API responses
  @Exclude()
  tokenHash?: string;

  @Exclude()
  refreshTokenHash?: string | null;

  @Exclude()
  previousRefreshTokenHash?: string | null;

  /**
   * Create SessionEntity from Prisma model
   * Masks sensitive data for safe API responses
   */
  static fromPrisma(session: Session): SessionEntity {
    const entity = new SessionEntity();
    entity.id = session.id;
    entity.accountId = session.accountId;
    entity.deviceId = session.deviceId;
    entity.ipAddress = session.ipAddress ? maskIpAddress(session.ipAddress) : null;
    entity.userAgent = session.userAgent;
    entity.isActive = session.isActive;
    entity.expiresAt = session.expiresAt;
    entity.revokedAt = session.revokedAt;
    entity.revokedReason = session.revokedReason;
    entity.lastActivityAt = session.lastActivityAt;
    entity.createdAt = session.createdAt;
    // Token hashes are never included
    return entity;
  }

  /**
   * Create array of SessionEntity from Prisma models
   */
  static fromPrismaArray(sessions: Session[]): SessionEntity[] {
    return sessions.map((session) => SessionEntity.fromPrisma(session));
  }

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if session is valid (active and not expired)
   */
  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  /**
   * Get session age in milliseconds
   */
  getAgeMs(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get time until expiration in milliseconds
   */
  getTimeToExpiryMs(): number {
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }
}

/**
 * Mask IP address for privacy
 * IPv4: 192.168.1.xxx
 * IPv6: 2001:db8:85a3:xxxx:xxxx:xxxx:xxxx:xxxx
 */
function maskIpAddress(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: mask last 4 segments
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
    }
  } else {
    // IPv4: mask last octet
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  return ip;
}
