import { useEffect, useRef, useCallback } from 'react';
import { getTracker, type Tracker } from '@my-girok/tracking-sdk';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { getTrackingConfig, isRecordingEnabled } from '../lib/tracking';
import { logger } from '../utils/logger';

/**
 * Hook to manage session recording lifecycle
 * Starts recording when user is authenticated, stops on logout
 */
export function useSessionRecording() {
  const trackerRef = useRef<Tracker | null>(null);
  const initializedRef = useRef(false);
  const { isAuthenticated, admin } = useAdminAuthStore();

  // Initialize and start recording
  const startRecording = useCallback(async () => {
    if (!isRecordingEnabled()) {
      logger.debug('Session recording is disabled');
      return;
    }

    if (initializedRef.current) {
      return;
    }

    try {
      const tracker = getTracker();
      trackerRef.current = tracker;

      const config = getTrackingConfig();

      // Add actor info if authenticated
      if (admin) {
        config.actor = {
          id: admin.id,
          email: admin.email,
          type: 'ADMIN',
          role: admin.roleName,
          scope: admin.scope,
          permissions: admin.permissions,
        };
      }

      await tracker.init(config);
      tracker.startRecording();
      initializedRef.current = true;

      logger.info('Session recording started', { sessionId: tracker.getSessionId() });
    } catch (error) {
      logger.error('Failed to start session recording', error);
    }
  }, [admin]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (trackerRef.current && initializedRef.current) {
      try {
        await trackerRef.current.stopRecording();
        logger.info('Session recording stopped');
      } catch (error) {
        logger.error('Failed to stop session recording', error);
      } finally {
        initializedRef.current = false;
        trackerRef.current = null;
      }
    }
  }, []);

  // Track custom event
  const trackEvent = useCallback(
    (
      name: string,
      properties?: {
        category?: string;
        action?: string;
        label?: string;
        value?: number;
      },
    ) => {
      if (trackerRef.current) {
        trackerRef.current.trackEvent({
          name,
          ...properties,
        });
      }
    },
    [],
  );

  // Track page view
  const trackPageView = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.trackPageView();
    }
  }, []);

  // Start/stop recording based on auth state
  useEffect(() => {
    if (isAuthenticated && admin) {
      void startRecording();
    } else {
      void stopRecording();
    }

    return () => {
      void stopRecording();
    };
  }, [isAuthenticated, admin, startRecording, stopRecording]);

  // Update actor info when admin changes
  useEffect(() => {
    if (trackerRef.current && admin) {
      trackerRef.current.setActor({
        id: admin.id,
        email: admin.email,
        type: 'ADMIN',
        role: admin.roleName,
        scope: admin.scope,
        permissions: admin.permissions,
      });
    }
  }, [admin]);

  return {
    trackEvent,
    trackPageView,
    getSessionId: () => trackerRef.current?.getSessionId() || null,
    isRecording: () => trackerRef.current?.getState() === 'recording',
  };
}
