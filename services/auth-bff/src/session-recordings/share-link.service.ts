/**
 * Share Link Service
 *
 * Manages session recording share links with Redis-based expiry
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class ShareLinkService {
  private readonly logger = new Logger(ShareLinkService.name);
  private redisClient: Redis;
  private readonly baseUrl: string;
  private readonly keyPrefix = 'share:';

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SHARE_LINK_BASE_URL') || 'http://localhost:3002';

    // Initialize Valkey/Redis client
    const valkeyHost = this.configService.get<string>('VALKEY_HOST') || 'localhost';
    const valkeyPort = this.configService.get<number>('VALKEY_PORT') || 6379;
    const valkeyDb = this.configService.get<number>('VALKEY_DB') || 3;

    this.redisClient = new Redis({
      host: valkeyHost,
      port: valkeyPort,
      db: valkeyDb,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Failed to connect to Valkey after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redisClient.on('error', (err: Error) => {
      this.logger.error(`Valkey error: ${err.message}`);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Connected to Valkey');
    });
  }

  /**
   * Generate a share link for a session
   */
  async generateLink(sessionId: string, expiresIn: string): Promise<string> {
    const shareToken = this.generateToken();
    const ttl = this.parseExpiry(expiresIn);

    if (ttl === null) {
      // Never expires
      await this.redisClient.set(`${this.keyPrefix}${shareToken}`, sessionId);
    } else {
      await this.redisClient.set(`${this.keyPrefix}${shareToken}`, sessionId, 'PX', ttl);
    }

    return `${this.baseUrl}/shared/${shareToken}`;
  }

  /**
   * Validate share token and get session ID
   */
  async validateAndGetSession(shareToken: string): Promise<string | null> {
    const sessionId = await this.redisClient.get(`${this.keyPrefix}${shareToken}`);
    return sessionId;
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Buffer.from(randomBytes).toString('base64url');
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiresIn: string): number | null {
    switch (expiresIn) {
      case '1h':
        return 60 * 60 * 1000;
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      case 'never':
        return null;
      default:
        return 24 * 60 * 60 * 1000; // Default to 24h
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redisClient.disconnect();
  }
}
