import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { SessionStore } from './session.store';
import {
  BffSession,
  CreateSessionInput,
  SessionValidationResult,
  ActiveSession,
  SessionMetadata,
} from '../common/types';
import { hashDeviceFingerprint } from '../common/utils';
import {
  SESSION_CONFIG,
  COOKIE_OPTIONS,
  DEVICE_FINGERPRINT_HEADERS,
  AccountType,
} from '../config/constants';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly cookieName: string;
  private readonly isSecure: boolean;

  constructor(
    private readonly sessionStore: SessionStore,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('session.cookieName', 'girok_session');
    this.isSecure = this.configService.get<boolean>('session.secure', false);
  }

  /**
   * Creates a new session and sets the cookie
   */
  async createSession(
    res: Response,
    input: CreateSessionInput,
    metadata?: SessionMetadata,
  ): Promise<BffSession> {
    const session = await this.sessionStore.create(input, metadata);

    this.setCookie(res, session.id, session.accountType);

    this.logger.log(`Session created for ${input.accountType}:${input.accountId}`);

    return session;
  }

  /**
   * Gets the current session from the request
   */
  async getSession(req: Request): Promise<BffSession | null> {
    const sessionId = this.getSessionIdFromRequest(req);
    if (!sessionId) {
      return null;
    }

    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return null;
    }

    // Verify device fingerprint
    const currentFingerprint = this.getDeviceFingerprint(req);
    if (session.deviceFingerprint !== currentFingerprint) {
      this.logger.warn(`Device fingerprint mismatch for session ${sessionId}`);
      await this.sessionStore.delete(sessionId);
      return null;
    }

    // Touch session to update last activity
    await this.sessionStore.touch(sessionId);

    return session;
  }

  /**
   * Validates the current session
   */
  async validateSession(req: Request): Promise<SessionValidationResult> {
    const session = await this.getSession(req);

    if (!session) {
      return { valid: false, error: 'No valid session found' };
    }

    if (session.mfaRequired && !session.mfaVerified) {
      return { valid: false, session, error: 'MFA verification required' };
    }

    return { valid: true, session };
  }

  /**
   * Updates MFA verification status
   */
  async setMfaVerified(req: Request, verified: boolean): Promise<boolean> {
    const sessionId = this.getSessionIdFromRequest(req);
    if (!sessionId) {
      return false;
    }

    return this.sessionStore.setMfaVerified(sessionId, verified);
  }

  /**
   * Refreshes the session with new tokens
   */
  async refreshSession(
    req: Request,
    res: Response,
    newAccessToken: string,
    newRefreshToken: string,
  ): Promise<BffSession | null> {
    const sessionId = this.getSessionIdFromRequest(req);
    if (!sessionId) {
      return null;
    }

    const session = await this.sessionStore.refresh(sessionId, newAccessToken, newRefreshToken);
    if (session) {
      // Refresh cookie expiration
      this.setCookie(res, session.id, session.accountType);
    }

    return session;
  }

  /**
   * Destroys the current session
   */
  async destroySession(req: Request, res: Response): Promise<boolean> {
    const sessionId = this.getSessionIdFromRequest(req);
    if (!sessionId) {
      return false;
    }

    const deleted = await this.sessionStore.delete(sessionId);
    this.clearCookie(res);

    return deleted;
  }

  /**
   * Gets all active sessions for the current user
   */
  async getActiveSessions(req: Request): Promise<ActiveSession[]> {
    const session = await this.getSession(req);
    if (!session) {
      return [];
    }

    const sessionId = this.getSessionIdFromRequest(req);
    return this.sessionStore.getActiveSessions(
      session.accountType,
      session.accountId,
      sessionId || undefined,
    );
  }

  /**
   * Revokes a specific session
   */
  async revokeSession(req: Request, targetSessionId: string): Promise<boolean> {
    const currentSession = await this.getSession(req);
    if (!currentSession) {
      return false;
    }

    // Verify the target session belongs to the same user
    const targetSession = await this.sessionStore.get(targetSessionId);
    if (!targetSession || targetSession.accountId !== currentSession.accountId) {
      return false;
    }

    return this.sessionStore.delete(targetSessionId);
  }

  /**
   * Revokes all sessions for the current user except the current one
   */
  async revokeAllOtherSessions(req: Request): Promise<number> {
    const session = await this.getSession(req);
    if (!session) {
      return 0;
    }

    const sessionId = this.getSessionIdFromRequest(req);
    return this.sessionStore.revokeAllSessions(
      session.accountType,
      session.accountId,
      sessionId || undefined,
    );
  }

  /**
   * Checks if the session needs to be refreshed
   */
  async needsRefresh(req: Request): Promise<boolean> {
    const sessionId = this.getSessionIdFromRequest(req);
    if (!sessionId) {
      return false;
    }

    return this.sessionStore.needsRefresh(sessionId);
  }

  /**
   * Gets the session with decrypted tokens
   */
  async getSessionWithTokens(
    req: Request,
  ): Promise<
    (BffSession & { decryptedAccessToken: string; decryptedRefreshToken: string }) | null
  > {
    const sessionId = this.getSessionIdFromRequest(req);
    if (!sessionId) {
      return null;
    }

    return this.sessionStore.getWithTokens(sessionId);
  }

  /**
   * Gets the device fingerprint from request headers
   */
  getDeviceFingerprint(req: Request): string {
    const components: string[] = [];

    for (const header of DEVICE_FINGERPRINT_HEADERS) {
      const value = req.headers[header];
      if (value) {
        components.push(Array.isArray(value) ? value[0] : value);
      }
    }

    // Add IP address (consider X-Forwarded-For for proxied requests)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    components.push(Array.isArray(ip) ? ip[0] : ip);

    return hashDeviceFingerprint(components);
  }

  /**
   * Extracts session metadata from request
   */
  extractMetadata(req: Request): SessionMetadata {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    return {
      userAgent: req.headers['user-agent'],
      ipAddress: Array.isArray(ip) ? ip[0] : ip,
      deviceType: this.detectDeviceType(req.headers['user-agent'] || ''),
    };
  }

  private getSessionIdFromRequest(req: Request): string | null {
    return req.cookies?.[this.cookieName] || null;
  }

  private setCookie(res: Response, sessionId: string, accountType: AccountType): void {
    const maxAge = SESSION_CONFIG.TTL[accountType];
    const path = SESSION_CONFIG.COOKIE_PATH[accountType];

    res.cookie(this.cookieName, sessionId, {
      ...COOKIE_OPTIONS,
      secure: this.isSecure,
      path,
      maxAge,
    });
  }

  private clearCookie(res: Response): void {
    res.clearCookie(this.cookieName, {
      ...COOKIE_OPTIONS,
      secure: this.isSecure,
    });
  }

  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }
}
