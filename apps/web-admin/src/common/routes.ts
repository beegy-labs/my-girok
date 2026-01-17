/**
 * Centralized route definitions for web-admin
 * Single source of truth for all application routes
 */

export const ROUTES = {
  // Dashboard
  DASHBOARD: '/',

  // Compliance
  COMPLIANCE: {
    DOCUMENTS: '/compliance/documents',
    DOCUMENTS_NEW: '/compliance/documents/new',
    DOCUMENTS_EDIT: (id: string) => `/compliance/documents/${id}`,
    CONSENTS: '/compliance/consents',
    ANALYTICS: '/compliance/analytics',
    REGIONS: '/compliance/regions',
  },

  // Organization
  ORGANIZATION: {
    PARTNERS: '/organization/partners',
    PARTNERS_NEW: '/organization/partners/new',
    PARTNERS_EDIT: (id: string) => `/organization/partners/${id}`,
  },

  // System
  SYSTEM: {
    COUNTRIES: '/system/countries',
    LOCALES: '/system/locales',
    OAUTH: '/system/oauth',
    AUDIT_LOGS: '/system/audit-logs',
    LOGIN_HISTORY: '/system/login-history',
    SESSION_RECORDINGS: '/system/session-recordings',
    SESSION_RECORDINGS_ANALYTICS: '/system/session-recordings/analytics',
    SESSION_RECORDINGS_DETAIL: (id: string) => `/system/session-recordings/${id}`,
    SETTINGS: '/system/settings',
  },

  // Users
  USERS: {
    OVERVIEW: '/users',
    DETAIL: (id: string) => `/users/${id}`,
  },

  // Authorization
  AUTHORIZATION: '/authorization',

  // Services
  SERVICES: {
    LIST: '/services',
    DETAIL: (id: string) => `/services/${id}`,
    CONSENTS: (id: string) => `/services/${id}/consents`,
  },

  // Auth
  AUTH: {
    LOGIN: '/login',
    MFA: '/login/mfa',
  },

  // Shared
  SHARED: {
    SESSION: (shareToken: string) => `/shared/${shareToken}`,
  },
} as const;

/**
 * Route path patterns for react-router configuration
 * Use these in router.tsx for route definitions
 */
export const ROUTE_PATTERNS = {
  DOCUMENTS_EDIT: '/compliance/documents/:id',
  PARTNERS_EDIT: '/organization/partners/:id',
  SESSION_RECORDINGS_DETAIL: '/system/session-recordings/:sessionId',
  USERS_DETAIL: '/users/:userId',
  SERVICES_DETAIL: '/services/:serviceId',
  SERVICES_CONSENTS: '/services/:serviceId/consents',
  SHARED_SESSION: '/shared/:shareToken',
} as const;
