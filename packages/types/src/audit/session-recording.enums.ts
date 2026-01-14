/**
 * Session Recording WebSocket Events
 *
 * Defines all WebSocket event names for real-time session monitoring.
 */
export const SessionWSEvents = {
  /** Emitted when a new session starts */
  SESSION_STARTED: 'session_started',
  /** Emitted when a session is updated (new events) */
  SESSION_UPDATED: 'session_updated',
  /** Emitted when a session ends */
  SESSION_ENDED: 'session_ended',
  /** Initial snapshot of all active sessions */
  SESSIONS_SNAPSHOT: 'sessions_snapshot',
  /** Error occurred during session monitoring */
  SESSION_ERROR: 'session_error',
} as const;

/**
 * Type for Session WebSocket Events
 */
export type SessionWSEvent = (typeof SessionWSEvents)[keyof typeof SessionWSEvents];

/**
 * Session Recording Status
 */
export enum SessionStatus {
  /** Session is currently recording */
  RECORDING = 'recording',
  /** Session has ended */
  ENDED = 'ended',
  /** Session was aborted/cancelled */
  ABORTED = 'aborted',
}

/**
 * Device Types for Session Recordings
 */
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

/**
 * Device Type Labels for UI display
 */
export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  [DeviceType.MOBILE]: 'Mobile',
  [DeviceType.TABLET]: 'Tablet',
  [DeviceType.DESKTOP]: 'Desktop',
};

/**
 * Session Export Formats
 */
export enum SessionExportFormat {
  /** JSON format with full session data and events */
  JSON = 'json',
}

/**
 * Share Link Expiry Options
 */
export const ShareLinkExpiry = {
  /** 1 hour */
  ONE_HOUR: '1h',
  /** 24 hours */
  ONE_DAY: '24h',
  /** 7 days */
  ONE_WEEK: '7d',
  /** 30 days */
  ONE_MONTH: '30d',
  /** Never expires */
  NEVER: 'never',
} as const;

/**
 * Type for Share Link Expiry
 */
export type ShareLinkExpiryType = (typeof ShareLinkExpiry)[keyof typeof ShareLinkExpiry];

/**
 * Share Link Expiry Labels for UI display
 */
export const SHARE_LINK_EXPIRY_LABELS: Record<ShareLinkExpiryType, string> = {
  [ShareLinkExpiry.ONE_HOUR]: '1 hour',
  [ShareLinkExpiry.ONE_DAY]: '24 hours',
  [ShareLinkExpiry.ONE_WEEK]: '7 days',
  [ShareLinkExpiry.ONE_MONTH]: '30 days',
  [ShareLinkExpiry.NEVER]: 'Never expires',
};
