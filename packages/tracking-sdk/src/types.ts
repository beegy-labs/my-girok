import type { eventWithTime } from 'rrweb';

/**
 * Session recording configuration
 */
export interface TrackingConfig {
  /** API endpoint for sending events */
  endpoint: string;
  /** Session ID (auto-generated if not provided) */
  sessionId?: string;
  /** Actor/User information */
  actor?: ActorInfo;
  /** Service context */
  service?: ServiceInfo;
  /** Privacy settings */
  privacy?: PrivacySettings;
  /** Batching settings */
  batching?: BatchingSettings;
  /** Enable console logging */
  debug?: boolean;
}

export interface ActorInfo {
  id: string;
  email?: string;
  type: 'USER' | 'OPERATOR' | 'ADMIN';
  role?: string;
  scope?: 'SYSTEM' | 'TENANT';
  permissions?: string[];
}

export interface ServiceInfo {
  id?: string;
  slug: string;
  version?: string;
}

export interface PrivacySettings {
  /** Mask all text input values */
  maskTextInput?: boolean;
  /** Mask specific input selectors */
  maskInputSelectors?: string[];
  /** Block specific elements from recording */
  blockSelectors?: string[];
  /** Ignore specific elements */
  ignoreSelectors?: string[];
  /** Anonymize IP address (server-side) */
  anonymizeIp?: boolean;
}

export interface BatchingSettings {
  /** Maximum events per batch */
  maxEvents?: number;
  /** Maximum time between flushes (ms) */
  flushInterval?: number;
  /** Compress events before sending */
  compress?: boolean;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  sessionId: string;
  startedAt: string;
  actorId?: string;
  actorType?: string;
  actorEmail?: string;
  serviceSlug?: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
  deviceFingerprint?: string;
}

/**
 * Recording event batch
 */
export interface RecordingEventBatch {
  sessionId: string;
  sequenceStart: number;
  sequenceEnd: number;
  events: eventWithTime[];
  metadata?: Partial<SessionMetadata>;
  timestamp: string;
}

/**
 * Custom event for tracking user actions
 */
export interface CustomEvent {
  name: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
}

/**
 * Page view event
 */
export interface PageViewEvent {
  path: string;
  title: string;
  referrer?: string;
  timestamp: string;
}

/**
 * Session recording state
 */
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * Tracking SDK public interface
 */
export interface TrackingSDK {
  /** Initialize the SDK */
  init(config: TrackingConfig): Promise<void>;
  /** Start recording session */
  startRecording(): void;
  /** Pause recording */
  pauseRecording(): void;
  /** Resume recording */
  resumeRecording(): void;
  /** Stop recording and flush remaining events */
  stopRecording(): Promise<void>;
  /** Track custom event */
  trackEvent(event: CustomEvent): void;
  /** Track page view */
  trackPageView(event?: Partial<PageViewEvent>): void;
  /** Set actor information */
  setActor(actor: ActorInfo): void;
  /** Get current session ID */
  getSessionId(): string | null;
  /** Get recording state */
  getState(): RecordingState;
  /** Flush pending events */
  flush(): Promise<void>;
  /** Destroy SDK instance */
  destroy(): void;
}
