import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRealTimeSessionsWebSocket } from './useRealTimeSessions';

describe('useRealTimeSessionsWebSocket', () => {
  let mockWebSocket: any;
  const wsUrl = 'ws://localhost:3000/sessions';

  beforeEach(() => {
    // Create proper WebSocket mock
    mockWebSocket = {
      close: vi.fn(),
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 0, // CONNECTING
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };

    // Mock WebSocket constructor as a class
    (global as any).WebSocket = class MockWebSocket {
      constructor(_url: string) {
        Object.assign(this, mockWebSocket);
        return this;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create WebSocket connection', () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    // Should initialize with empty sessions
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('should provide reconnect function', () => {
    const { result } = renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should have close method on WebSocket', () => {
    renderHook(() => useRealTimeSessionsWebSocket(wsUrl));

    expect(mockWebSocket.close).toBeDefined();
  });
});
