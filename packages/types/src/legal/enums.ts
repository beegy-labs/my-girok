/**
 * Legal document type enumeration
 * Types of legal documents that require user consent
 */
export enum LegalDocumentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  COOKIE_POLICY = 'COOKIE_POLICY',
  DATA_PROCESSING = 'DATA_PROCESSING',
}

/**
 * Consent type enumeration
 * GDPR/CCPA/PIPA/APPI 2025 compliant consent categories
 */
export enum ConsentType {
  /** Required: Agreement to Terms of Service */
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  /** Required: Agreement to Privacy Policy */
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  /** Optional: Marketing emails consent */
  MARKETING_EMAIL = 'MARKETING_EMAIL',
  /** Optional: Push notification marketing consent */
  MARKETING_PUSH = 'MARKETING_PUSH',
  /** Optional: Night-time push notification consent (21:00-08:00) */
  MARKETING_PUSH_NIGHT = 'MARKETING_PUSH_NIGHT',
  /** Optional: SMS marketing consent */
  MARKETING_SMS = 'MARKETING_SMS',
  /** Optional: Personalized advertising consent */
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
  /** Optional: Third-party data sharing consent */
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
}
