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
 * WebSocket-based real-time session monitoring hook
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
