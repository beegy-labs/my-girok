import { useEffect, useRef, useState, useCallback } from 'react';
import type { eventWithTime } from 'rrweb';

export interface SessionPlayerProps {
  /** Session events to replay */
  events: eventWithTime[];
  /** Player width */
  width?: number;
  /** Player height */
  height?: number;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Playback speed (1 = normal, 2 = 2x, etc.) */
  speed?: number;
  /** Skip inactive periods (ms) */
  skipInactive?: boolean;
  /** Show controller bar */
  showController?: boolean;
  /** CSS class name */
  className?: string;
  /** Callback when playback ends */
  onEnd?: () => void;
  /** Callback for playback progress (0-1) */
  onProgress?: (progress: number) => void;
}

interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  totalTime: number;
  speed: number;
}

export function SessionPlayer({
  events,
  width = 1024,
  height = 576,
  autoPlay = false,
  speed = 1,
  skipInactive = true,
  showController = true,
  className = '',
  onEnd: _onEnd,
  onProgress,
}: SessionPlayerProps) {
  // onEnd is available for future use via _onEnd
  void _onEnd;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<unknown>(null);
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    totalTime: 0,
    speed,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Dynamically import rrweb-player to avoid SSR issues
  useEffect(() => {
    if (!containerRef.current || events.length === 0) return;

    let mounted = true;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    const initPlayer = async (): Promise<void> => {
      try {
        const { Replayer } = await import('rrweb');

        if (!mounted || !containerRef.current) return;

        // Clear previous player
        containerRef.current.innerHTML = '';

        const replayer = new Replayer(events, {
          root: containerRef.current,
          skipInactive,
          speed,
          showWarning: false,
          showDebug: false,
          blockClass: 'rr-block',
          insertStyleRules: [
            '.rr-block { background: #ccc !important; }',
            '.rr-mask { color: transparent !important; text-shadow: 0 0 5px rgba(0,0,0,0.5) !important; }',
          ],
        });

        playerRef.current = replayer;

        // Calculate total time
        const firstEvent = events[0];
        const lastEvent = events[events.length - 1];
        const totalTime = lastEvent.timestamp - firstEvent.timestamp;

        setState((prev) => ({ ...prev, totalTime }));
        setIsLoading(false);

        if (autoPlay) {
          replayer.play();
          setState((prev) => ({ ...prev, isPlaying: true }));
        }

        // Progress tracking
        progressInterval = setInterval(() => {
          if (!playerRef.current) return;
          const currentTime =
            (playerRef.current as { getCurrentTime: () => number }).getCurrentTime?.() || 0;
          setState((prev) => ({ ...prev, currentTime }));
          if (onProgress && totalTime > 0) {
            onProgress(currentTime / totalTime);
          }
        }, 100);
      } catch (error) {
        console.error('[SessionPlayer] Failed to initialize', error);
        setIsLoading(false);
      }
    };

    void initPlayer();

    return () => {
      mounted = false;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (playerRef.current) {
        (playerRef.current as { destroy?: () => void }).destroy?.();
        playerRef.current = null;
      }
    };
  }, [events, skipInactive, speed, autoPlay, onProgress]);

  const handlePlay = useCallback(() => {
    if (playerRef.current) {
      (playerRef.current as { play: () => void }).play();
      setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
    }
  }, []);

  const handlePause = useCallback(() => {
    if (playerRef.current) {
      (playerRef.current as { pause: () => void }).pause();
      setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (playerRef.current) {
      (playerRef.current as { play: (time: number) => void }).play(time);
      setState((prev) => ({ ...prev, currentTime: time, isPlaying: true }));
    }
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    if (playerRef.current) {
      (playerRef.current as { setConfig: (config: { speed: number }) => void }).setConfig({
        speed: newSpeed,
      });
      setState((prev) => ({ ...prev, speed: newSpeed }));
    }
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (events.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500">No events to replay</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 ${className}`} style={{ width }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      <div ref={containerRef} className="overflow-hidden" style={{ width, height }} />

      {showController && !isLoading && (
        <div className="flex items-center gap-2 p-2 bg-gray-800 text-white">
          {/* Play/Pause button */}
          <button
            onClick={state.isPlaying ? handlePause : handlePlay}
            className="p-1 hover:bg-gray-700 rounded"
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div className="flex-1 mx-2">
            <input
              type="range"
              min={0}
              max={state.totalTime}
              value={state.currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Time display */}
          <span className="text-xs font-mono">
            {formatTime(state.currentTime)} / {formatTime(state.totalTime)}
          </span>

          {/* Speed selector */}
          <select
            value={state.speed}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            className="bg-gray-700 text-xs rounded px-1 py-0.5"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      )}
    </div>
  );
}
