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

  /**
   * Employee/Admin Management Endpoints (HR)
   */
  EMPLOYEES: {
    /** Get my profile */
    MY_PROFILE: '/admin/profile/me',
    /** List/Search employees */
    LIST: '/admin/enterprise/list',
    /** Get employee detail */
    DETAIL: (id: string) => `/admin/profile/${id}`,
    /** Update employee profile */
    UPDATE: (id: string) => `/admin/profile/${id}`,
    /** Update SCIM Core */
    UPDATE_SCIM: (id: string) => `/admin/profile/${id}/scim`,
    /** Update Employee Info */
    UPDATE_EMPLOYEE: (id: string) => `/admin/profile/${id}/employee`,
    /** Update Job & Organization */
    UPDATE_JOB: (id: string) => `/admin/profile/${id}/job`,
    /** Update Contact Info */
    UPDATE_CONTACT: (id: string) => `/admin/profile/${id}/contact`,
  },

  /**
   * Attendance Management Endpoints
   */
  ATTENDANCE: {
    /** Clock in */
    CLOCK_IN: '/attendance/clock-in',
    /** Clock out */
    CLOCK_OUT: '/attendance/clock-out',
    /** Get my attendance records */
    MY_RECORDS: '/attendance/me',
    /** Get my attendance statistics */
    MY_STATS: '/attendance/me/stats',
    /** List all attendance records */
    LIST: '/attendance',
    /** Get attendance by date */
    BY_DATE: (date: string) => `/attendance/date/${date}`,
    /** Get admin attendance statistics */
    ADMIN_STATS: (adminId: string) => `/attendance/admin/${adminId}/stats`,
    /** Approve overtime */
    APPROVE_OVERTIME: (id: string) => `/attendance/${id}/approve-overtime`,
  },

  /**
   * Work Schedule Endpoints
   */
  WORK_SCHEDULES: {
    /** Create work schedule */
    CREATE: '/work-schedules',
    /** Get my work schedules */
    MY_SCHEDULES: '/work-schedules/me',
    /** Get my active work schedule */
    MY_ACTIVE: '/work-schedules/me/active',
    /** Get admin work schedules */
    ADMIN_SCHEDULES: (adminId: string) => `/work-schedules/admin/${adminId}`,
    /** Get work schedule by ID */
    DETAIL: (id: string) => `/work-schedules/${id}`,
    /** Update work schedule */
    UPDATE: (id: string) => `/work-schedules/${id}`,
    /** Delete work schedule */
    DELETE: (id: string) => `/work-schedules/${id}`,
  },

  /**
   * Leave Management Endpoints
   */
  LEAVE: {
    /** Create leave request */
    CREATE: '/leaves',
    /** Submit leave request */
    SUBMIT: (id: string) => `/leaves/${id}/submit`,
    /** Approve/reject leave request */
    APPROVE: (id: string) => `/leaves/${id}/approve`,
    /** Cancel leave request */
    CANCEL: (id: string) => `/leaves/${id}/cancel`,
    /** Get my leave requests */
    MY_REQUESTS: '/leaves/me',
    /** Get pending approvals */
    PENDING_APPROVALS: '/leaves/pending-approvals',
    /** Get leave request by ID */
    DETAIL: (id: string) => `/leaves/${id}`,
    /** List all leave requests */
    LIST: '/leaves',
  },

  /**
   * Leave Balance Endpoints
   */
  LEAVE_BALANCE: {
    /** Create leave balance */
    CREATE: '/leave-balances',
    /** Get my current balance */
    MY_BALANCE: '/leave-balances/me',
    /** Get my balance for year */
    MY_BALANCE_YEAR: (year: number) => `/leave-balances/me/${year}`,
    /** Get admin balance */
    ADMIN_BALANCE: (adminId: string, year: number) => `/leave-balances/${adminId}/${year}`,
    /** Adjust leave balance */
    ADJUST: (adminId: string, year: number) => `/leave-balances/${adminId}/${year}/adjust`,
    /** Recalculate balance */
    RECALCULATE: (adminId: string, year: number) =>
      `/leave-balances/${adminId}/${year}/recalculate`,
    /** Initialize balance for new year */
    INITIALIZE: (adminId: string, year: number) => `/leave-balances/${adminId}/${year}/initialize`,
  },

  /**
   * Delegation Management Endpoints
   */
  DELEGATIONS: {
    /** Create delegation */
    CREATE: '/delegations',
    /** List delegations */
    LIST: '/delegations',
    /** Get delegations I delegated */
    MY_DELEGATED: '/delegations/me/delegated',
    /** Get delegations I received */
    MY_RECEIVED: '/delegations/me/received',
    /** Get delegation by ID */
    DETAIL: (id: string) => `/delegations/${id}`,
    /** Update delegation */
    UPDATE: (id: string) => `/delegations/${id}`,
    /** Approve/reject delegation */
    APPROVE: (id: string) => `/delegations/${id}/approve`,
    /** Revoke delegation */
    REVOKE: (id: string) => `/delegations/${id}/revoke`,
    /** Delete delegation */
    DELETE: (id: string) => `/delegations/${id}`,
    /** Get delegation logs */
    LOGS: (id: string) => `/delegations/${id}/logs`,
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
