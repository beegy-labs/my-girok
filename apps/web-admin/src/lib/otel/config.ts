/**
 * OpenTelemetry Browser SDK Configuration
 * Phase 6.1 - Admin Audit System (#415)
 */

// Environment configuration
const ENV = import.meta.env.VITE_ENV || 'development';
const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT || 'https://otel-collector.girok.dev';
const SERVICE_NAME = 'web-admin';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * OTEL Resource attributes
 */
export const resourceAttributes = {
  'service.name': SERVICE_NAME,
  'service.version': SERVICE_VERSION,
  'deployment.environment': ENV,
};

/**
 * OTEL Configuration
 */
export const otelConfig = {
  serviceName: SERVICE_NAME,
  serviceVersion: SERVICE_VERSION,
  environment: ENV,
  endpoint: OTEL_ENDPOINT,
  // Batch span processor configuration
  batchConfig: {
    maxQueueSize: 100,
    maxExportBatchSize: 10,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  },
  // Sampling rate (1.0 = 100%)
  samplingRate: ENV === 'production' ? 0.1 : 1.0,
};

/**
 * UI Event Types for tracking
 */
export enum UIEventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  FORM_SUBMIT = 'form_submit',
  ERROR = 'error',
  SEARCH = 'search',
  FILTER_CHANGE = 'filter_change',
  TAB_CHANGE = 'tab_change',
  MODAL_OPEN = 'modal_open',
  MODAL_CLOSE = 'modal_close',
  EXPORT = 'export',
}

/**
 * Attribute keys for span attributes
 */
export const SpanAttributes = {
  // User context
  USER_ID: 'user.id',
  USER_EMAIL: 'user.email',
  USER_ROLE: 'user.role',
  SESSION_ID: 'session.id',

  // UI Event context
  EVENT_TYPE: 'ui.event_type',
  EVENT_CATEGORY: 'ui.event_category',
  PAGE_PATH: 'ui.page_path',
  PAGE_TITLE: 'ui.page_title',
  COMPONENT_NAME: 'ui.component_name',
  TARGET_ID: 'ui.target_id',
  TARGET_TEXT: 'ui.target_text',

  // Action context
  ACTION_TYPE: 'action.type',
  ACTION_TARGET: 'action.target',
  ACTION_RESULT: 'action.result',

  // Error context
  ERROR_TYPE: 'error.type',
  ERROR_MESSAGE: 'error.message',
  ERROR_STACK: 'error.stack',
};
