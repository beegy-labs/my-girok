/**
 * API Endpoints - Single Source of Truth
 *
 * Central registry for all API endpoint paths used in the application.
 * This file follows the SSOT (Single Source of Truth) principle to prevent
 * hardcoded endpoint strings scattered across the codebase.
 *
 * Benefits:
 * - Easy API version management (v1 -> v2 migration)
 * - Type-safe endpoint generation
 * - Centralized endpoint documentation
 * - Easier refactoring and maintenance
 */

export const API_ENDPOINTS = {
  /**
   * Authorization Service Endpoints
   */
  AUTHORIZATION: {
    /** Get current active authorization model */
    MODEL: '/authorization/model',
    /** Get all model versions */
    MODEL_VERSIONS: '/authorization/model/versions',
    /** Import a new model */
    MODEL_IMPORT: '/authorization/model/import',
    /** Export model (JSON with metadata) */
    MODEL_EXPORT: (id: string) => `/admin/authorization/model/${id}/export`,
    /** Export model (DSL only) */
    MODEL_EXPORT_DSL: (id: string) => `/admin/authorization/model/${id}/export-dsl`,
    /** Create a new model version */
    CREATE_MODEL: '/authorization/model',
    /** Validate model syntax */
    VALIDATE_MODEL: '/authorization/model/validate',
    /** Activate a specific model version */
    ACTIVATE_MODEL: (id: string) => `/authorization/model/${id}/activate`,
  },

  /**
   * Session Recordings Endpoints
   */
  RECORDINGS: {
    /** List all session recordings */
    LIST: '/recordings/sessions',
    /** Get session events by ID */
    EVENTS: (sessionId: string) => `/recordings/sessions/${sessionId}/events`,
    /** Get session metadata */
    METADATA: (sessionId: string) => `/recordings/sessions/${sessionId}/metadata`,
    /** Export session to JSON */
    EXPORT: (sessionId: string) => `/recordings/sessions/${sessionId}/export`,
    /** Generate share link */
    SHARE: (sessionId: string) => `/recordings/sessions/${sessionId}/share`,
    /** View shared session (public) */
    SHARED: (shareToken: string) => `/recordings/shared/${shareToken}`,
    /** Live sessions monitoring */
    LIVE: '/recordings/sessions/live',
    /**
     * Analytics Endpoints
     */
    ANALYTICS: {
      /** Get session statistics */
      STATS: '/recordings/analytics/stats',
      /** Get device breakdown */
      DEVICES: '/recordings/analytics/devices',
      /** Get top pages by visits */
      PAGES: '/recordings/analytics/pages',
    },
  },

  /**
   * Audit Service Endpoints
   */
  AUDIT: {
    /** List audit logs */
    LOGS: '/audit/logs',
    /** Get specific audit log */
    LOG: (id: string) => `/audit/logs/${id}`,
  },

  /**
   * Services Endpoints
   */
  SERVICES: {
    /** List all services */
    LIST: '/services',
    /** Get service by ID */
    DETAIL: (id: string) => `/services/${id}`,
    /** Update service */
    UPDATE: (id: string) => `/services/${id}`,
  },

  /**
   * Users Endpoints
   */
  USERS: {
    /** Get users overview */
    OVERVIEW: '/users',
    /** Get user activity */
    ACTIVITY: (userId: string) => `/users/${userId}/activity`,
  },

  /**
   * Tenants (Partners) Endpoints
   */
  TENANTS: {
    /** List all tenants */
    LIST: '/tenants',
    /** Get tenant by ID */
    DETAIL: (id: string) => `/tenants/${id}`,
    /** Create new tenant */
    CREATE: '/tenants',
    /** Update tenant */
    UPDATE: (id: string) => `/tenants/${id}`,
  },

  /**
   * Legal/Compliance Endpoints
   */
  LEGAL: {
    /** List legal documents */
    DOCUMENTS: '/legal/documents',
    /** Get document by ID */
    DOCUMENT: (id: string) => `/legal/documents/${id}`,
    /** Consents */
    CONSENTS: '/legal/consents',
    /** Consent statistics */
    CONSENT_STATS: '/legal/consent-stats',
  },
} as const;

/**
 * Helper type to extract endpoint paths
 */
export type ApiEndpoint = typeof API_ENDPOINTS;

/**
 * WebSocket Endpoint Namespaces
 */
export const WS_NAMESPACES = {
  /** Live session recordings */
  SESSIONS_LIVE: '/admin/sessions/live',
} as const;
