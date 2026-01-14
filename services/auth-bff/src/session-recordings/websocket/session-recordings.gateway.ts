/**
 * Session Recordings WebSocket Gateway
 *
 * Real-time live sessions monitoring via WebSocket
 */

import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from 'ws';
import { SessionRecordingGrpcClient } from '../../grpc-clients/session-recording.client';

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

@WebSocketGateway({
  path: '/ws/sessions',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class SessionRecordingsGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(SessionRecordingsGateway.name);
  private activeClients = new Set<WebSocket>();
  private pollingInterval?: NodeJS.Timeout;
  private readonly POLL_INTERVAL_MS = 5000; // 5 seconds

  constructor(private readonly sessionRecordingClient: SessionRecordingGrpcClient) {}

  /**
   * Module initialization - start polling
   */
  async onModuleInit() {
    this.startPolling();
    this.logger.log('WebSocket Gateway initialized - polling every 5 seconds');
  }

  /**
   * Module cleanup - stop polling
   */
  async onModuleDestroy() {
    this.stopPolling();
    this.logger.log('WebSocket Gateway destroyed - polling stopped');
  }

  /**
   * Handle client connection
   */
  handleConnection(client: WebSocket) {
    this.activeClients.add(client);
    this.logger.debug(`Client connected. Total clients: ${this.activeClients.size}`);

    // Send immediate snapshot of active sessions
    this.sendActiveSessionsToClient(client);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: WebSocket) {
    this.activeClients.delete(client);
    this.logger.debug(`Client disconnected. Total clients: ${this.activeClients.size}`);
  }

  /**
   * Start polling for active sessions
   */
  private startPolling() {
    if (this.pollingInterval) {
      return; // Already polling
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const sessions = await this.getActiveSessions();
        this.broadcastToAll({
          type: 'sessions_update',
          data: sessions,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error(`Failed to poll active sessions: ${error}`);
      }
    }, this.POLL_INTERVAL_MS);

    this.logger.log(`Started polling active sessions every ${this.POLL_INTERVAL_MS}ms`);
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.logger.log('Stopped polling active sessions');
    }
  }

  /**
   * Send active sessions to a specific client
   */
  private async sendActiveSessionsToClient(client: WebSocket) {
    try {
      const sessions = await this.getActiveSessions();
      const message = JSON.stringify({
        type: 'sessions_snapshot',
        data: sessions,
        timestamp: new Date().toISOString(),
      });

      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    } catch (error) {
      this.logger.error(`Failed to send snapshot to client: ${error}`);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToAll(message: unknown) {
    const payload = JSON.stringify(message);
    let sentCount = 0;

    this.activeClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        sentCount++;
      }
    });

    this.logger.debug(`Broadcasted to ${sentCount}/${this.activeClients.size} clients`);
  }

  /**
   * Get currently active sessions from audit-service
   */
  async getActiveSessions(): Promise<LiveSession[]> {
    try {
      // Query sessions active in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = await this.sessionRecordingClient.listSessions({
        status: 1, // ACTIVE status
        startDate: {
          seconds: Math.floor(fiveMinutesAgo.getTime() / 1000),
          nanos: 0,
        },
        page: 1,
        limit: 100,
      });

      return result.sessions.map((s) => ({
        sessionId: s.sessionId,
        actorId: s.actorId,
        actorEmail: s.actorEmail,
        serviceSlug: s.serviceSlug,
        startedAt: new Date(s.startedAt.seconds * 1000).toISOString(),
        lastEventAt: s.endedAt
          ? new Date(s.endedAt.seconds * 1000).toISOString()
          : new Date(s.startedAt.seconds * 1000).toISOString(),
        totalEvents: s.totalEvents,
        browser: s.browser,
        deviceType: this.mapDeviceType(s.deviceType),
        countryCode: s.countryCode,
      }));
    } catch (error) {
      this.logger.error(`Failed to get active sessions: ${error}`);
      return [];
    }
  }

  /**
   * Map device type number to string
   */
  private mapDeviceType(deviceType: number): string {
    const map: Record<number, string> = {
      0: 'desktop',
      1: 'desktop',
      2: 'mobile',
      3: 'tablet',
    };
    return map[deviceType] ?? 'desktop';
  }

  /**
   * Broadcast when a new session starts
   */
  async broadcastSessionStarted(session: LiveSession) {
    this.logger.debug(`Broadcasting session started: ${session.sessionId}`);
    this.broadcastToAll({
      type: 'session_started',
      data: session,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast when session is updated
   */
  async broadcastSessionUpdated(session: LiveSession) {
    this.logger.debug(`Broadcasting session updated: ${session.sessionId}`);
    this.broadcastToAll({
      type: 'session_updated',
      data: session,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast when session ends
   */
  async broadcastSessionEnded(sessionId: string) {
    this.logger.debug(`Broadcasting session ended: ${sessionId}`);
    this.broadcastToAll({
      type: 'session_ended',
      data: { sessionId },
      timestamp: new Date().toISOString(),
    });
  }
}
