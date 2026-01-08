import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BffSession, CreateSessionInput, ActiveSession, SessionMetadata } from '../common/types';
import { encrypt, decrypt, generateSessionId } from '../common/utils';
import { SESSION_CONFIG, AccountType } from '../config/constants';

const SESSION_PREFIX = 'bff:session:';
const USER_SESSIONS_PREFIX = 'bff:user_sessions:';
const SESSION_METADATA_PREFIX = 'bff:session_meta:';

@Injectable()
export class SessionStore implements OnModuleDestroy {
  private readonly logger = new Logger(SessionStore.name);
  private readonly redis: Redis;
  private readonly encryptionKey: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('valkey.host', 'localhost');
    const port = this.configService.get<number>('valkey.port', 6379);
    const password = this.configService.get<string>('valkey.password', '');
    const db = this.configService.get<number>('valkey.db', 3);

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.encryptionKey = this.configService.get<string>(
      'encryption.key',
      'encryption-key-32-chars-change!',
    );

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for session store');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Creates a new session
   */
  async create(input: CreateSessionInput, metadata?: SessionMetadata): Promise<BffSession> {
    const sessionId = generateSessionId();
    const now = new Date();
    const ttl = SESSION_CONFIG.TTL[input.accountType];
    const expiresAt = new Date(now.getTime() + ttl);

    const session: BffSession = {
      id: sessionId,
      accountType: input.accountType,
      accountId: input.accountId,
      email: input.email,
      appSlug: input.appSlug,
      serviceId: input.serviceId,
      accessToken: encrypt(input.accessToken, this.encryptionKey),
      refreshToken: encrypt(input.refreshToken, this.encryptionKey),
      deviceFingerprint: input.deviceFingerprint,
      mfaVerified: input.mfaVerified ?? false,
      mfaRequired: input.mfaRequired ?? false,
      permissions: input.permissions,
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
    };

    const pipeline = this.redis.pipeline();

    // Store the session
    pipeline.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session), 'PX', ttl);

    // Add to user's session set for tracking active sessions
    const userSessionKey = `${USER_SESSIONS_PREFIX}${input.accountType}:${input.accountId}`;
    pipeline.sadd(userSessionKey, sessionId);
    pipeline.expire(userSessionKey, Math.ceil(ttl / 1000) + 3600); // Add 1 hour buffer

    // Store metadata separately if provided
    if (metadata) {
      pipeline.set(`${SESSION_METADATA_PREFIX}${sessionId}`, JSON.stringify(metadata), 'PX', ttl);
    }

    await pipeline.exec();

    this.logger.debug(`Created session ${sessionId} for ${input.accountType}:${input.accountId}`);

    return session;
  }

  /**
   * Gets a session by ID
   */
  async get(sessionId: string): Promise<BffSession | null> {
    const data = await this.redis.get(`${SESSION_PREFIX}${sessionId}`);
    if (!data) {
      return null;
    }

    const session = JSON.parse(data) as BffSession;

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.delete(sessionId);
      return null;
    }

    // Parse dates
    session.createdAt = new Date(session.createdAt);
    session.expiresAt = new Date(session.expiresAt);
    session.lastActivityAt = new Date(session.lastActivityAt);

    return session;
  }

  /**
   * Gets a session with decrypted tokens
   */
  async getWithTokens(
    sessionId: string,
  ): Promise<
    (BffSession & { decryptedAccessToken: string; decryptedRefreshToken: string }) | null
  > {
    const session = await this.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      ...session,
      decryptedAccessToken: decrypt(session.accessToken, this.encryptionKey),
      decryptedRefreshToken: decrypt(session.refreshToken, this.encryptionKey),
    };
  }

  /**
   * Updates a session's last activity time
   */
  async touch(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    if (!session) {
      return false;
    }

    session.lastActivityAt = new Date();
    const ttl = await this.redis.pttl(`${SESSION_PREFIX}${sessionId}`);

    if (ttl > 0) {
      await this.redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session), 'PX', ttl);
    }

    return true;
  }

  /**
   * Updates MFA verification status
   */
  async setMfaVerified(sessionId: string, verified: boolean): Promise<boolean> {
    const session = await this.get(sessionId);
    if (!session) {
      return false;
    }

    session.mfaVerified = verified;
    session.lastActivityAt = new Date();

    const ttl = await this.redis.pttl(`${SESSION_PREFIX}${sessionId}`);
    if (ttl > 0) {
      await this.redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session), 'PX', ttl);
    }

    return true;
  }

  /**
   * Refreshes a session with new tokens and extended expiration
   */
  async refresh(
    sessionId: string,
    newAccessToken: string,
    newRefreshToken: string,
  ): Promise<BffSession | null> {
    const session = await this.get(sessionId);
    if (!session) {
      return null;
    }

    const now = new Date();
    const ttl = SESSION_CONFIG.TTL[session.accountType];
    const newExpiresAt = new Date(now.getTime() + ttl);

    session.accessToken = encrypt(newAccessToken, this.encryptionKey);
    session.refreshToken = encrypt(newRefreshToken, this.encryptionKey);
    session.expiresAt = newExpiresAt;
    session.lastActivityAt = now;

    await this.redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session), 'PX', ttl);

    this.logger.debug(`Refreshed session ${sessionId}`);

    return session;
  }

  /**
   * Deletes a session
   */
  async delete(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    if (!session) {
      return false;
    }

    const pipeline = this.redis.pipeline();

    // Remove session
    pipeline.del(`${SESSION_PREFIX}${sessionId}`);
    pipeline.del(`${SESSION_METADATA_PREFIX}${sessionId}`);

    // Remove from user's session set
    const userSessionKey = `${USER_SESSIONS_PREFIX}${session.accountType}:${session.accountId}`;
    pipeline.srem(userSessionKey, sessionId);

    await pipeline.exec();

    this.logger.debug(`Deleted session ${sessionId}`);

    return true;
  }

  /**
   * Gets all active sessions for a user
   */
  async getActiveSessions(
    accountType: AccountType,
    accountId: string,
    currentSessionId?: string,
  ): Promise<ActiveSession[]> {
    const userSessionKey = `${USER_SESSIONS_PREFIX}${accountType}:${accountId}`;
    const sessionIds = await this.redis.smembers(userSessionKey);

    const sessions: ActiveSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.get(sessionId);
      if (session) {
        const metadataStr = await this.redis.get(`${SESSION_METADATA_PREFIX}${sessionId}`);
        const metadata = metadataStr ? JSON.parse(metadataStr) : undefined;

        sessions.push({
          id: sessionId,
          accountType: session.accountType,
          deviceFingerprint: session.deviceFingerprint,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
          metadata,
          isCurrent: sessionId === currentSessionId,
        });
      } else {
        // Clean up stale session reference
        await this.redis.srem(userSessionKey, sessionId);
      }
    }

    return sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  /**
   * Revokes all sessions for a user except the current one
   */
  async revokeAllSessions(
    accountType: AccountType,
    accountId: string,
    exceptSessionId?: string,
  ): Promise<number> {
    const userSessionKey = `${USER_SESSIONS_PREFIX}${accountType}:${accountId}`;
    const sessionIds = await this.redis.smembers(userSessionKey);

    let revokedCount = 0;

    for (const sessionId of sessionIds) {
      if (sessionId !== exceptSessionId) {
        await this.delete(sessionId);
        revokedCount++;
      }
    }

    this.logger.debug(`Revoked ${revokedCount} sessions for ${accountType}:${accountId}`);

    return revokedCount;
  }

  /**
   * Checks if a session needs refresh based on remaining TTL
   */
  async needsRefresh(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    if (!session) {
      return false;
    }

    const threshold = SESSION_CONFIG.REFRESH_THRESHOLD[session.accountType];
    const remainingTime = session.expiresAt.getTime() - Date.now();

    return remainingTime < threshold;
  }
}
