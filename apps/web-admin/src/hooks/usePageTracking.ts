/**
 * Page Tracking Hook
 * Phase 6.2 - Admin Audit System (#416)
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { trackPageView } from '../lib/otel';

/**
 * Hook for automatic page view tracking
 * Tracks page views when the route changes
 */
export function usePageTracking() {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Only track if path changed (avoid double tracking on initial render)
    if (prevPathRef.current !== location.pathname) {
      trackPageView(location.pathname);
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);
}
