import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Tracker, getTracker } from '../tracker.js';
import type { TrackingConfig, ActorInfo, CustomEvent } from '../types.js';

interface TrackingContextValue {
  tracker: Tracker;
  isRecording: boolean;
  sessionId: string | null;
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  trackEvent: (event: CustomEvent) => void;
  trackPageView: () => void;
  setActor: (actor: ActorInfo) => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export interface TrackingProviderProps {
  children: ReactNode;
  config: TrackingConfig;
  /** Auto-start recording on mount */
  autoStart?: boolean;
  /** Auto-stop recording on unmount */
  autoStop?: boolean;
  /** Track page views on route change */
  trackRouteChanges?: boolean;
}

export function TrackingProvider({
  children,
  config,
  autoStart = true,
  autoStop = true,
  trackRouteChanges = true,
}: TrackingProviderProps) {
  const trackerRef = useRef<Tracker | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const tracker = getTracker();
    trackerRef.current = tracker;

    void tracker.init(config).then(() => {
      if (autoStart) {
        tracker.startRecording();
      }
    });

    return () => {
      if (autoStop && trackerRef.current) {
        void trackerRef.current.stopRecording();
      }
    };
  }, [config, autoStart, autoStop]);

  // Track route changes
  useEffect(() => {
    if (!trackRouteChanges) return;

    const handlePopState = () => {
      trackerRef.current?.trackPageView();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [trackRouteChanges]);

  const value: TrackingContextValue = {
    tracker: trackerRef.current || getTracker(),
    isRecording: trackerRef.current?.getState() === 'recording',
    sessionId: trackerRef.current?.getSessionId() || null,
    startRecording: () => trackerRef.current?.startRecording(),
    stopRecording: () => trackerRef.current?.stopRecording() || Promise.resolve(),
    pauseRecording: () => trackerRef.current?.pauseRecording(),
    resumeRecording: () => trackerRef.current?.resumeRecording(),
    trackEvent: (event) => trackerRef.current?.trackEvent(event),
    trackPageView: () => trackerRef.current?.trackPageView(),
    setActor: (actor) => trackerRef.current?.setActor(actor),
  };

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking(): TrackingContextValue {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}

export function useTrackEvent() {
  const { trackEvent } = useTracking();
  return trackEvent;
}

export function useTrackPageView() {
  const { trackPageView } = useTracking();
  return trackPageView;
}

export function useSessionId() {
  const { sessionId } = useTracking();
  return sessionId;
}
