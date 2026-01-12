/**
 * useRealTimeSessions Hook
 *
 * WebSocket-based real-time session monitoring with exponential backoff reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Reconnection configuration
 */
const RECONNECT_CONFIG = {
  BASE_DELAY: parseInt(import.meta.env.VITE_WS_RECONNECT_BASE_DELAY || '1000', 10), // 1 second
  MAX_DELAY: parseInt(import.meta.env.VITE_WS_RECONNECT_MAX_DELAY || '30000', 10), // 30 seconds
  MAX_ATTEMPTS: parseInt(import.meta.env.VITE_WS_RECONNECT_MAX_ATTEMPTS || '10', 10),
};

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
 * Calculate exponential backoff delay with jitter
 * @param attempt - The current reconnection attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const { BASE_DELAY, MAX_DELAY } = RECONNECT_CONFIG;

  // Exponential backoff: delay = BASE_DELAY * 2^attempt
  const exponentialDelay = BASE_DELAY * Math.pow(2, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, MAX_DELAY);

  // Add jitter (randomize ±25% to prevent thundering herd)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

  return Math.floor(cappedDelay + jitter);
}

/**
 * WebSocket-based real-time session monitoring hook
 * Implements exponential backoff with jitter for reconnection
 */
export function useRealTimeSessionsWebSocket(wsUrl: string): UseRealTimeSessionsResult {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        // Reset reconnection attempts on successful connection
        reconnectAttempts.current = 0;
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

        // Check if we should attempt reconnection
        if (reconnectAttempts.current < RECONNECT_CONFIG.MAX_ATTEMPTS) {
          const delay = calculateBackoffDelay(reconnectAttempts.current);
          reconnectAttempts.current++;

          console.log(
            `WebSocket disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${RECONNECT_CONFIG.MAX_ATTEMPTS})`,
          );

          // Clear any existing reconnection timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // Schedule reconnection with exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        } else {
          setConnectionError(
            `Failed to reconnect after ${RECONNECT_CONFIG.MAX_ATTEMPTS} attempts. Please refresh the page.`,
          );
          console.error('Max reconnection attempts reached');
        }
      };

      setWs(socket);

      return () => socket.close();
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [wsUrl]);

  const reconnect = useCallback(() => {
    // Reset reconnection attempts for manual reconnect
    reconnectAttempts.current = 0;

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (ws) {
      ws.close();
    }

    // Reconnect immediately
    connect();
  }, [ws, connect]);

  useEffect(() => {
    const cleanup = connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      cleanup?.();
    };
  }, [connect]);

  return {
    sessions,
    isConnected,
    connectionError,
    reconnect,
  };
}
