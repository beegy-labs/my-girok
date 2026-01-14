/**
 * Session Recordings WebSocket Gateway (Placeholder)
 *
 * Real-time live sessions monitoring
 *
 * TODO: Install @nestjs/websockets and @nestjs/platform-ws
 * npm install @nestjs/websockets @nestjs/platform-ws ws @types/ws
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Live session data structure
 */
export interface LiveSession {
  sessionId: string;
  actorId?: string;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: string;
  lastEventAt: string;
  totalEvents: number;
  browser: string;
  deviceType: string;
  countryCode: string;
}

@Injectable()
export class SessionRecordingsGateway {
  private readonly logger = new Logger(SessionRecordingsGateway.name);

  constructor() {
    this.logger.log('WebSocket Gateway initialized (placeholder mode)');
    this.logger.warn(
      'To enable WebSocket functionality, install: @nestjs/websockets @nestjs/platform-ws ws @types/ws',
    );
  }

  /**
   * Broadcast when a new session starts
   */
  async broadcastSessionStarted(session: LiveSession) {
    this.logger.debug(`Session started: ${session.sessionId}`);
    // TODO: Implement WebSocket broadcast
  }

  /**
   * Broadcast when session is updated
   */
  async broadcastSessionUpdated(session: LiveSession) {
    this.logger.debug(`Session updated: ${session.sessionId}`);
    // TODO: Implement WebSocket broadcast
  }

  /**
   * Broadcast when session ends
   */
  async broadcastSessionEnded(sessionId: string) {
    this.logger.debug(`Session ended: ${sessionId}`);
    // TODO: Implement WebSocket broadcast
  }

  /**
   * Get currently active sessions
   */
  async getActiveSessions(): Promise<LiveSession[]> {
    this.logger.debug('Getting active sessions');
    // TODO: Query from audit-service
    return [];
  }
}
