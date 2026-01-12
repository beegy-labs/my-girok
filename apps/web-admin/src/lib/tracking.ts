// TODO: Replace with @my-girok/tracking-sdk when available
interface TrackingConfig {
  endpoint: string;
  service: {
    slug: string;
    version: string;
  };
  privacy: {
    maskTextInput: boolean;
    maskInputSelectors: string[];
    blockSelectors: string[];
    ignoreSelectors: string[];
    anonymizeIp: boolean;
  };
  batching: {
    maxEvents: number;
    flushInterval: number;
    compress: boolean;
  };
  debug: boolean;
}

/**
 * Get tracking configuration based on environment
 */
export function getTrackingConfig(): TrackingConfig {
  const isDevelopment = import.meta.env.DEV;
  // Use auth-bff for session recording (gRPC backend via REST proxy)
  const authBffUrl = import.meta.env.VITE_AUTH_BFF_URL || 'http://localhost:4000';

  return {
    endpoint: authBffUrl,
    service: {
      slug: 'web-admin',
      version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    },
    privacy: {
      maskTextInput: true,
      maskInputSelectors: ['input[type="password"]', '.sensitive-data'],
      blockSelectors: ['.rr-block', '[data-rr-block]'],
      ignoreSelectors: ['.rr-ignore', '[data-rr-ignore]'],
      anonymizeIp: true,
    },
    batching: {
      maxEvents: 50,
      flushInterval: 10000, // 10 seconds
      compress: false,
    },
    debug: isDevelopment,
  };
}

/**
 * Check if session recording should be enabled
 * Can be controlled via environment variable or feature flag
 */
export function isRecordingEnabled(): boolean {
  // Disable in development unless explicitly enabled
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_ENABLE_SESSION_RECORDING === 'true';
  }

  // Enable in production by default
  return import.meta.env.VITE_ENABLE_SESSION_RECORDING !== 'false';
}
