import { publicApi, authApi } from './auth';
import type {
  ConsentType,
  LegalDocumentType,
  ConsentRequirementWithDocument,
  ConsentRequirementsWithRegionResponse,
  LegalDocumentPayload,
  UserConsentPayload,
  CreateConsentDto,
} from '@my-girok/types';

/**
 * API Endpoints for Legal module
 * SSOT with auth-service LegalController routes
 *
 * @example
 * ```typescript
 * // Usage in API functions
 * await publicApi.get(LEGAL_ENDPOINTS.CONSENT_REQUIREMENTS, { params: { locale } });
 * await authApi.get(`${LEGAL_ENDPOINTS.CONSENTS}/${type}`);
 * ```
 */
const LEGAL_ENDPOINTS = {
  /** GET - Public consent requirements with documents */
  CONSENT_REQUIREMENTS: '/v1/legal/consent-requirements',
  /** GET - Legal documents by type */
  DOCUMENTS: '/v1/legal/documents',
  /** GET - Legal document by UUID */
  DOCUMENTS_BY_ID: '/v1/legal/documents/by-id',
  /** GET/POST/PUT - User consent management */
  CONSENTS: '/v1/legal/consents',
  /** GET - Check required consents */
  CONSENTS_CHECK: '/v1/legal/consents/check',
} as const;

// Re-export types for convenience
export type { ConsentRequirementWithDocument, ConsentRequirementsWithRegionResponse };

/**
 * Get consent requirements for registration
 * Public endpoint - no authentication required
 *
 * @param locale - User's locale (ko, en, ja, etc.)
 * @returns Region-specific consent requirements with documents
 *
 * @example
 * ```typescript
 * const requirements = await getConsentRequirements('ko');
 * console.log(requirements.region); // 'KR'
 * console.log(requirements.law); // 'PIPA (개인정보보호법)'
 * console.log(requirements.requirements); // ConsentRequirementWithDocument[]
 * ```
 */
export const getConsentRequirements = async (
  locale: string = 'ko',
): Promise<ConsentRequirementsWithRegionResponse> => {
  const response = await publicApi.get(LEGAL_ENDPOINTS.CONSENT_REQUIREMENTS, {
    params: { locale },
  });
  return response.data;
};

/**
 * Get legal document by type
 * Public endpoint - no authentication required
 *
 * @param type - Legal document type (TERMS_OF_SERVICE, PRIVACY_POLICY, etc.)
 * @param locale - Document locale
 * @returns Legal document with content
 *
 * @example
 * ```typescript
 * const doc = await getLegalDocument(LegalDocumentType.TERMS_OF_SERVICE, 'en');
 * console.log(doc.title); // 'Terms of Service'
 * console.log(doc.content); // '<html>...</html>'
 * ```
 */
export const getLegalDocument = async (
  type: LegalDocumentType,
  locale: string = 'ko',
): Promise<LegalDocumentPayload> => {
  const response = await publicApi.get(`${LEGAL_ENDPOINTS.DOCUMENTS}/${type}`, {
    params: { locale },
  });
  return response.data;
};

/**
 * Get legal document by ID
 * Public endpoint - no authentication required
 *
 * @param id - Document UUID
 * @returns Legal document with content
 *
 * @example
 * ```typescript
 * const doc = await getLegalDocumentById('550e8400-e29b-41d4-a716-446655440000');
 * console.log(doc.title); // 'Privacy Policy v2.0'
 * console.log(doc.version); // '2.0'
 * ```
 */
export const getLegalDocumentById = async (id: string): Promise<LegalDocumentPayload> => {
  const response = await publicApi.get(`${LEGAL_ENDPOINTS.DOCUMENTS_BY_ID}/${id}`);
  return response.data;
};

/**
 * Get current user's consents
 * Requires authentication
 *
 * @returns Array of user's active consents
 *
 * @example
 * ```typescript
 * const consents = await getUserConsents();
 * const termsConsent = consents.find(c => c.consentType === ConsentType.TERMS_OF_SERVICE);
 * console.log(termsConsent?.agreed); // true
 * console.log(termsConsent?.agreedAt); // Date
 * ```
 */
export const getUserConsents = async (): Promise<UserConsentPayload[]> => {
  const response = await authApi.get(LEGAL_ENDPOINTS.CONSENTS);
  return response.data;
};

/**
 * Create user consents
 * Requires authentication
 *
 * @param consents - Array of consent decisions
 * @returns Created consent records
 *
 * @example
 * ```typescript
 * const created = await createConsents([
 *   { consentType: ConsentType.TERMS_OF_SERVICE, agreed: true },
 *   { consentType: ConsentType.PRIVACY_POLICY, agreed: true },
 *   { consentType: ConsentType.MARKETING_EMAIL, agreed: false },
 * ]);
 * console.log(created.length); // 3
 * ```
 */
export const createConsents = async (
  consents: CreateConsentDto[],
): Promise<UserConsentPayload[]> => {
  const response = await authApi.post(LEGAL_ENDPOINTS.CONSENTS, { consents });
  return response.data;
};

/**
 * Update a specific consent (agree or withdraw)
 * Requires authentication
 *
 * @param type - Consent type to update
 * @param agreed - New consent status
 * @param locale - User's locale for region policy
 * @returns Updated consent record
 *
 * @example
 * ```typescript
 * // Withdraw marketing consent
 * const updated = await updateConsent(ConsentType.MARKETING_EMAIL, false, 'ko');
 * console.log(updated.agreed); // false
 * console.log(updated.withdrawnAt); // Date
 * ```
 */
export const updateConsent = async (
  type: ConsentType,
  agreed: boolean,
  locale: string = 'ko',
): Promise<UserConsentPayload> => {
  const response = await authApi.put(
    `${LEGAL_ENDPOINTS.CONSENTS}/${type}`,
    { agreed },
    { params: { locale } },
  );
  return response.data;
};

/**
 * Check if user has all required consents
 * Requires authentication
 *
 * @param locale - User's locale for region policy
 * @returns Object with hasAllRequired boolean
 *
 * @example
 * ```typescript
 * const check = await checkRequiredConsents('ko');
 * if (!check.hasAllRequired) {
 *   // Redirect to consent page
 *   navigate('/consent');
 * }
 * ```
 */
export const checkRequiredConsents = async (
  locale: string = 'ko',
): Promise<{ hasAllRequired: boolean }> => {
  const response = await authApi.get(LEGAL_ENDPOINTS.CONSENTS_CHECK, {
    params: { locale },
  });
  return response.data;
};
