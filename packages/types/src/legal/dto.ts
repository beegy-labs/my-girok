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
 * Legal document payload
 */
export interface LegalDocumentPayload {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary?: string;
  effectiveDate: Date;
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
 * Consent requirements response
 */
export interface ConsentRequirementsResponse {
  requirements: ConsentRequirement[];
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
