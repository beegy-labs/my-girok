/**
 * OpenTelemetry Browser SDK - Public API
 * Phase 6.1 - Admin Audit System (#415)
 */

// Re-export configuration
export { otelConfig, UIEventType, SpanAttributes } from './config';

// Re-export session management
export { getSessionId, refreshSession, clearSession, getSessionMetadata } from './session';

// Re-export tracer functions
export {
  initOtel,
  shutdownOtel,
  getTracer,
  isOtelInitialized,
  setUserContext,
  clearUserContext,
  trackUIEvent,
  trackPageView,
  trackClick,
  trackError,
  withSpan,
} from './tracer';
