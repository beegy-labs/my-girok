import { ConsentType, LegalDocumentType } from './enums.js';

/**
 * Consent requirement item
 * Defines whether a consent type is required or optional
 */
export interface ConsentRequirement {
  type: ConsentType;
  required: boolean;
  labelKey: string;
  descriptionKey: string;
}

/**
 * Consent submission item
 * Single consent entry for registration
 */
export interface ConsentSubmission {
  type: ConsentType;
  agreed: boolean;
}

/**
 * Legal document payload (public response)
 */
export interface LegalDocumentPayload {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  effectiveDate: Date;
}

/**
 * Legal document with full metadata (internal use)
 * Includes isActive, createdAt, updatedAt for admin/service operations
 * Compatible with Prisma LegalDocument model
 */
export interface LegalDocumentFull extends LegalDocumentPayload {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document summary for consent requirement
 */
export interface ConsentDocumentSummary {
  id: string;
  version: string;
  title: string;
  summary: string | null;
}

/**
 * Consent requirement with document reference
 * Extended consent requirement including associated document type
 */
export interface ConsentRequirementWithDocument extends ConsentRequirement {
  documentType: LegalDocumentType;
  /** Night-time restriction hours (if applicable) */
  nightTimeHours?: { start: number; end: number };
  /** Associated legal document (if exists) */
  document: ConsentDocumentSummary | null;
}

/**
 * User consent record
 */
export interface UserConsentPayload {
  id: string;
  userId: string;
  consentType: ConsentType;
  documentId?: string;
  documentVersion?: string;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt?: Date;
}

/**
 * Create consent request DTO
 */
export interface CreateConsentDto {
  consentType: ConsentType;
  documentId?: string;
  agreed: boolean;
}

/**
 * Update consent request DTO
 */
export interface UpdateConsentDto {
  agreed: boolean;
}

/**
 * Consent requirements response (basic)
 */
export interface ConsentRequirementsResponse {
  requirements: ConsentRequirement[];
}

/**
 * Consent requirements response with region info
 * Returned by GET /v1/legal/consent-requirements
 *
 * @example
 * ```typescript
 * const response: ConsentRequirementsWithRegionResponse = {
 *   region: 'KR',
 *   law: 'PIPA (개인정보보호법)',
 *   nightTimePushRestriction: { start: 21, end: 8 },
 *   requirements: [...]
 * };
 * ```
 */
export interface ConsentRequirementsWithRegionResponse {
  /** Region code (KR, JP, EU, US, DEFAULT) */
  region: string;
  /** Applicable law name */
  law: string;
  /** Night-time push notification restriction */
  nightTimePushRestriction?: { start: number; end: number };
  /** List of consent requirements with documents */
  requirements: ConsentRequirementWithDocument[];
}

/**
 * Register with consents DTO
 * Extended registration with consent submissions
 */
export interface RegisterWithConsentsDto {
  email: string;
  username: string;
  password: string;
  name: string;
  consents: ConsentSubmission[];
  /** User's preferred language (ko, en, ja, hi) - for UI language */
  language?: string;
  /** User's country (KR, JP, US, GB, IN) - for legal/regulatory context */
  country?: string;
  /** User's timezone (Asia/Seoul, Europe/London, etc.) */
  timezone?: string;
  /**
   * @deprecated Use `country` instead. Kept for backwards compatibility.
   * Registration region (KR, JP, US, etc.) - for consent policy
   */
  region?: string;
  /**
   * @deprecated Use `language` instead. Kept for backwards compatibility.
   * User's preferred locale (ko, en, ja, etc.)
   */
  locale?: string;
}
