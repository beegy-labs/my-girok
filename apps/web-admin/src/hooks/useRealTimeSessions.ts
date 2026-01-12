/**
 * useRealTimeSessions Hook
 *
 * WebSocket-based real-time session monitoring
 */

import { useState, useEffect, useCallback } from 'react';

export interface LiveSession {
  sessionId: string;
  actorId?: string;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: string;
  currentPage: string;
  location: string;
  deviceType: string;
  browser: string;
  eventCount: number;
  lastEventAt: string;
}

interface UseRealTimeSessionsResult {
  sessions: LiveSession[];
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

/**
 * Hook for real-time session monitoring via WebSocket
 */
export function useRealTimeSessions(): UseRealTimeSessionsResult {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      // In production, this would connect to WebSocket server
      // For now, simulate connection with polling
      setIsConnected(true);
      setConnectionError(null);

      // Simulate real-time updates with mock data
      const interval = setInterval(() => {
        // Mock session data
        const mockSessions: LiveSession[] = [
          {
            sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
            actorId: 'user-123',
            actorEmail: 'user@example.com',
            serviceSlug: 'web-app',
            startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            currentPage: '/dashboard',
            location: 'US',
            deviceType: 'desktop',
            browser: 'Chrome',
            eventCount: Math.floor(Math.random() * 100),
            lastEventAt: new Date().toISOString(),
          },
          {
            sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
            actorEmail: 'admin@example.com',
            serviceSlug: 'web-admin',
            startedAt: new Date(Date.now() - Math.random() * 1800000).toISOString(),
            currentPage: '/settings',
            location: 'KR',
            deviceType: 'mobile',
            browser: 'Safari',
            eventCount: Math.floor(Math.random() * 50),
            lastEventAt: new Date().toISOString(),
          },
        ];

        setSessions(mockSessions);
      }, 2000);

      return () => clearInterval(interval);
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, []);

  const reconnect = useCallback(() => {
    if (ws) {
      ws.close();
    }
    connect();
  }, [ws, connect]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return {
    sessions,
    isConnected,
    connectionError,
    reconnect,
  };
}

/**
 * WebSocket implementation for production use
 */
export function useRealTimeSessionsWebSocket(wsUrl: string): UseRealTimeSessionsResult {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'session_started':
              setSessions((prev) => [...prev, data.session]);
              break;
            case 'session_updated':
              setSessions((prev) =>
                prev.map((s) => (s.sessionId === data.session.sessionId ? data.session : s)),
              );
              break;
            case 'session_ended':
              setSessions((prev) => prev.filter((s) => s.sessionId !== data.sessionId));
              break;
            case 'sessions_snapshot':
              setSessions(data.sessions);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        setConnectionError('WebSocket error occurred');
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Attempt reconnection after delay
        setTimeout(() => connect(), 5000);
      };

      setWs(socket);

      return () => socket.close();
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [wsUrl]);

  const reconnect = useCallback(() => {
    if (ws) {
      ws.close();
    }
    connect();
  }, [ws, connect]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return {
    sessions,
    isConnected,
    connectionError,
    reconnect,
  };
}
