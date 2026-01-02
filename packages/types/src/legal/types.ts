/**
 * Identity Platform - Legal Types
 * Consent, Law, DSRRequest types for legal compliance
 */

import type { ConsentType, LegalDocumentType } from './enums.js';
import {
  ConsentStatus,
  ConsentSource,
  DSRRequestType,
  DSRRequestStatus,
  LegalDocumentStatus,
} from './enums.js';

// Re-export enums for convenience
export { ConsentStatus, ConsentSource, DSRRequestType, DSRRequestStatus, LegalDocumentStatus };

// ============================================================================
// Consent Types
// ============================================================================

/**
 * Consent entity
 * Represents a user's consent record
 */
export interface Consent {
  id: string;
  accountId: string;
  consentType: ConsentType;
  documentId: string | null;
  documentVersion: string | null;
  status: ConsentStatus;
  source: ConsentSource;
  ipAddress: string | null;
  userAgent: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
  withdrawnAt: Date | null;
  withdrawnReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Consent summary for listing
 */
export interface ConsentSummary {
  id: string;
  consentType: ConsentType;
  status: ConsentStatus;
  documentVersion: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
}

/**
 * Record consent DTO
 */
export interface RecordConsentDto {
  accountId: string;
  consentType: ConsentType;
  documentId?: string;
  source?: ConsentSource;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Withdraw consent DTO
 */
export interface WithdrawConsentDto {
  reason?: string;
}

/**
 * Consent check result
 */
export interface ConsentCheckResult {
  hasConsent: boolean;
  consentType: ConsentType;
  grantedAt: Date | null;
  documentVersion: string | null;
  isExpired: boolean;
}

/**
 * Bulk consent check result
 */
export interface BulkConsentCheckResult {
  accountId: string;
  results: ConsentCheckResult[];
  missingRequired: ConsentType[];
}

// ============================================================================
// DSR (Data Subject Request) Types
// ============================================================================

/**
 * DSR request entity
 * GDPR/CCPA Data Subject Request
 */
export interface DSRRequest {
  id: string;
  accountId: string;
  requestType: DSRRequestType;
  status: DSRRequestStatus;
  description: string | null;
  requestedData: string[];
  responseData: Record<string, unknown> | null;
  downloadUrl: string | null;
  downloadExpiresAt: Date | null;
  processedBy: string | null;
  processedAt: Date | null;
  rejectionReason: string | null;
  submittedAt: Date;
  dueAt: Date;
  completedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DSR request summary for listing
 */
export interface DSRRequestSummary {
  id: string;
  accountId: string;
  requestType: DSRRequestType;
  status: DSRRequestStatus;
  submittedAt: Date;
  dueAt: Date;
  completedAt: Date | null;
}

/**
 * Create DSR request DTO
 */
export interface CreateDSRRequestDto {
  accountId: string;
  requestType: DSRRequestType;
  description?: string;
  requestedData?: string[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Process DSR request DTO
 */
export interface ProcessDSRRequestDto {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  responseData?: Record<string, unknown>;
  downloadUrl?: string;
  rejectionReason?: string;
}

// ============================================================================
// Legal Document Types (Extended)
// ============================================================================

/**
 * Legal document entity (extended)
 */
export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  status: LegalDocumentStatus;
  effectiveDate: Date;
  expiresAt: Date | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  serviceId: string | null;
  countryCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Legal document summary for listing
 */
export interface LegalDocumentSummary {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  status: LegalDocumentStatus;
  effectiveDate: Date;
}

/**
 * Create legal document DTO
 */
export interface CreateLegalDocumentDto {
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary?: string;
  effectiveDate: Date;
  expiresAt?: Date;
  serviceId?: string;
  countryCode?: string;
}

/**
 * Update legal document DTO
 */
export interface UpdateLegalDocumentDto {
  title?: string;
  content?: string;
  summary?: string;
  effectiveDate?: Date;
  expiresAt?: Date;
}

/**
 * Publish legal document DTO
 */
export interface PublishLegalDocumentDto {
  effectiveDate?: Date;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Consent query parameters
 */
export interface ConsentQueryDto {
  accountId?: string;
  consentType?: ConsentType;
  status?: ConsentStatus;
  page?: number;
  limit?: number;
}

/**
 * DSR request query parameters
 */
export interface DSRRequestQueryDto {
  accountId?: string;
  requestType?: DSRRequestType;
  status?: DSRRequestStatus;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Legal document query parameters
 */
export interface LegalDocumentQueryDto {
  type?: LegalDocumentType;
  locale?: string;
  status?: LegalDocumentStatus;
  countryCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Consent list response
 */
export interface ConsentListResponse {
  data: ConsentSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * DSR request list response
 */
export interface DSRRequestListResponse {
  data: DSRRequestSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Legal document list response
 */
export interface LegalDocumentListResponse {
  data: LegalDocumentSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Account consent status response
 */
export interface AccountConsentStatusResponse {
  accountId: string;
  consents: ConsentSummary[];
  missingRequired: ConsentType[];
  hasAllRequired: boolean;
}
