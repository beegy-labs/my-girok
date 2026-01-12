// Core exports
export { Tracker, getTracker, resetTracker } from './tracker.js';

// Types
export type {
  TrackingConfig,
  TrackingSDK,
  SessionMetadata,
  RecordingEventBatch,
  CustomEvent,
  PageViewEvent,
  RecordingState,
  ActorInfo,
  ServiceInfo,
  PrivacySettings,
  BatchingSettings,
} from './types.js';

// Utils
export {
  generateSessionId,
  getDeviceInfo,
  generateFingerprint,
  debounce,
  throttle,
  safeStringify,
  compressData,
} from './utils.js';
