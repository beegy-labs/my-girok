/**
 * Audit Event Hook
 * Phase 6.2 - Admin Audit System (#416)
 */
import { useCallback } from 'react';
import { trackUIEvent, trackClick, trackError, UIEventType, SpanAttributes } from '../lib/otel';

/**
 * Hook for tracking audit events
 */
export function useAuditEvent() {
  /**
   * Track a generic UI event
   */
  const trackEvent = useCallback(
    (eventType: UIEventType, attributes: Record<string, string | number | boolean> = {}) => {
      trackUIEvent(eventType, attributes);
    },
    [],
  );

  /**
   * Track a button click
   */
  const trackButtonClick = useCallback(
    (componentName: string, targetId?: string, targetText?: string) => {
      trackClick(componentName, targetId, targetText);
    },
    [],
  );

  /**
   * Track a form submission
   */
  const trackFormSubmit = useCallback(
    (formName: string, formAction: string, success: boolean = true) => {
      trackUIEvent(UIEventType.FORM_SUBMIT, {
        [SpanAttributes.COMPONENT_NAME]: formName,
        [SpanAttributes.ACTION_TYPE]: formAction,
        [SpanAttributes.ACTION_RESULT]: success ? 'success' : 'failure',
      });
    },
    [],
  );

  /**
   * Track a search action
   */
  const trackSearch = useCallback((searchTerm: string, resultCount?: number) => {
    trackUIEvent(UIEventType.SEARCH, {
      'search.term': searchTerm,
      ...(resultCount !== undefined && { 'search.result_count': resultCount }),
    });
  }, []);

  /**
   * Track a filter change
   */
  const trackFilterChange = useCallback(
    (filterName: string, filterValue: string | number | boolean) => {
      trackUIEvent(UIEventType.FILTER_CHANGE, {
        'filter.name': filterName,
        'filter.value': String(filterValue),
      });
    },
    [],
  );

  /**
   * Track a tab change
   */
  const trackTabChange = useCallback((tabName: string, fromTab?: string) => {
    trackUIEvent(UIEventType.TAB_CHANGE, {
      'tab.name': tabName,
      ...(fromTab && { 'tab.from': fromTab }),
    });
  }, []);

  /**
   * Track a modal open
   */
  const trackModalOpen = useCallback((modalName: string) => {
    trackUIEvent(UIEventType.MODAL_OPEN, {
      [SpanAttributes.COMPONENT_NAME]: modalName,
    });
  }, []);

  /**
   * Track a modal close
   */
  const trackModalClose = useCallback((modalName: string) => {
    trackUIEvent(UIEventType.MODAL_CLOSE, {
      [SpanAttributes.COMPONENT_NAME]: modalName,
    });
  }, []);

  /**
   * Track an export action
   */
  const trackExport = useCallback((exportType: string, recordCount?: number) => {
    trackUIEvent(UIEventType.EXPORT, {
      'export.type': exportType,
      ...(recordCount !== undefined && { 'export.record_count': recordCount }),
    });
  }, []);

  /**
   * Track an error
   */
  const trackComponentError = useCallback((error: Error, componentName?: string) => {
    trackError(error, componentName);
  }, []);

  return {
    trackEvent,
    trackButtonClick,
    trackFormSubmit,
    trackSearch,
    trackFilterChange,
    trackTabChange,
    trackModalOpen,
    trackModalClose,
    trackExport,
    trackComponentError,
    UIEventType,
  };
}
