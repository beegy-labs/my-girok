import { useCallback } from 'react';

/**
 * Hook to manage session recording lifecycle
 * Starts recording when user is authenticated, stops on logout
 *
 * TODO: Implement with @my-girok/tracking-sdk when available
 */
export function useSessionRecording() {
  // Stub implementation until tracking-sdk is available
  const trackEvent = useCallback((name: string, properties?: Record<string, any>) => {
    console.log('[Stub] Track event:', name, properties);
  }, []);

  const trackPageView = useCallback(() => {
    console.log('[Stub] Track page view');
  }, []);

  return {
    trackEvent,
    trackPageView,
    getSessionId: () => null,
    isRecording: () => false,
  };
}
