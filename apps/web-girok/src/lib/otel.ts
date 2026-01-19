import { initializeOtelWebSDK } from '@my-girok/otel-web-sdk';
import { useAuthStore } from '../stores/authStore';

/**
 * Initialize OpenTelemetry for web-girok application
 *
 * This should be called after user authentication.
 * Uses session cookies for authentication (no JWT token needed).
 */
export function initializeObservability(): void {
  const { user, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated || !user) {
    console.warn('[OTEL] Cannot initialize: User not authenticated');
    return;
  }

  const auditServiceUrl = import.meta.env.VITE_AUDIT_SERVICE_URL;
  if (!auditServiceUrl) {
    console.warn('[OTEL] VITE_AUDIT_SERVICE_URL not configured');
    return;
  }

  try {
    initializeOtelWebSDK({
      serviceName: 'web-girok',
      serviceVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment:
        (import.meta.env.MODE as 'development' | 'staging' | 'production') || 'development',
      collectorUrl: `${auditServiceUrl}/v1/telemetry`,
      // Session-based auth: Use empty token since cookies are sent automatically
      authToken: '',
      tenantId: user.tenantId || 'default',
      userId: user.id,
      debug: import.meta.env.DEV,
    });

    console.log('[OTEL] Observability initialized for web-girok');
  } catch (error) {
    console.error('[OTEL] Failed to initialize:', error);
  }
}

/**
 * Re-export audit logging utilities for convenience
 */
export { createAuditLog, trackEvent, withSpan } from '@my-girok/otel-web-sdk';
