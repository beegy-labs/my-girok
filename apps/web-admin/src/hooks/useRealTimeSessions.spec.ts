import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRealTimeSessions, useRealTimeSessionsWebSocket } from './useRealTimeSessions';

describe('useRealTimeSessions (Mock Implementation)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with empty sessions', () => {
    const { result } = renderHook(() => useRealTimeSessions());

    expect(result.current.sessions).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBeNull();
  });

  it('should connect and set isConnected to true', async () => {
    const { result } = renderHook(() => useRealTimeSessions());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should generate mock sessions periodically', async () => {
    const { result } = renderHook(() => useRealTimeSessions());

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Fast-forward time by 2 seconds (mock data generation interval)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.sessions.length).toBeGreaterThan(0);
    });
  });

  it('should update sessions with new data on each interval', async () => {
    const { result } = renderHook(() => useRealTimeSessions());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Get initial sessions
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.sessions.length).toBeGreaterThan(0);
    });

    const initialSessions = result.current.sessions;

    // Advance time and check for new sessions
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      // Session IDs should be different (new random sessions)
      expect(result.current.sessions[0].sessionId).not.toBe(initialSessions[0].sessionId);
    });
  });

  it('should provide reconnect function', () => {
    const { result } = renderHook(() => useRealTimeSessions());

    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should cleanup interval on unmount', () => {
    const { unmount } = renderHook(() => useRealTimeSessions());

    unmount();

    // After unmount, timer should be cleared
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useRealTimeSessionsWebSocket', () => {
  let mockWebSocket: any;
  const wsUrl = 'ws://localhost:3000/sessions';

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      close: vi.fn(),
      send: vi.fn(),
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should create WebSocket connection with correct URL', () => {
    renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    expect(global.WebSocket).toHaveBeenCalledWith(wsUrl);
  });

  it('should set isConnected to true when connection opens', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    expect(result.current.isConnected).toBe(false);

    // Simulate connection open
    act(() => {
      mockWebSocket.onopen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionError).toBeNull();
    });
  });

  it('should handle session_started message', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    const newSession = {
      sessionId: 'session-1',
      actorEmail: 'user@example.com',
      serviceSlug: 'web-app',
      startedAt: new Date().toISOString(),
      currentPage: '/dashboard',
      location: 'US',
      deviceType: 'desktop',
      browser: 'Chrome',
      eventCount: 0,
      lastEventAt: new Date().toISOString(),
    };

    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'session_started',
          session: newSession,
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0]).toEqual(newSession);
    });
  });

  it('should handle session_updated message', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    // Add initial session
    const initialSession = {
      sessionId: 'session-1',
      eventCount: 5,
      currentPage: '/dashboard',
    };

    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'session_started',
          session: initialSession,
        }),
      });
    });

    // Update the session
    const updatedSession = {
      ...initialSession,
      eventCount: 10,
      currentPage: '/profile',
    };

    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'session_updated',
          session: updatedSession,
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].eventCount).toBe(10);
      expect(result.current.sessions[0].currentPage).toBe('/profile');
    });
  });

  it('should handle session_ended message', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    // Add session
    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'session_started',
          session: { sessionId: 'session-1' },
        }),
      });
    });

    // End session
    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'session_ended',
          sessionId: 'session-1',
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(0);
    });
  });

  it('should handle sessions_snapshot message', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    const sessions = [
      { sessionId: 'session-1', actorEmail: 'user1@example.com' },
      { sessionId: 'session-2', actorEmail: 'user2@example.com' },
    ];

    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'sessions_snapshot',
          sessions,
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions).toEqual(sessions);
    });
  });

  it('should set error on WebSocket error', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onerror(new Error('Connection failed'));
    });

    await waitFor(() => {
      expect(result.current.connectionError).toBe('WebSocket error occurred');
    });
  });

  it('should set isConnected to false on close', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      mockWebSocket.onclose();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should attempt reconnection after close', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    act(() => {
      mockWebSocket.onclose();
    });

    // Fast-forward reconnection delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should attempt to create new WebSocket connection
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('should provide reconnect function that closes existing connection', () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    act(() => {
      mockWebSocket.onopen();
    });

    act(() => {
      result.current.reconnect();
    });

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should close WebSocket on unmount', () => {
    const { unmount } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should ignore malformed WebSocket messages', async () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      mockWebSocket.onopen();
    });

    // Send invalid JSON
    act(() => {
      mockWebSocket.onmessage({ data: 'invalid json' });
    });

    // Should not crash
    expect(result.current.sessions).toHaveLength(0);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
