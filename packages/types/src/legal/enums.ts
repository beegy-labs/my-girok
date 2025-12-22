/**
 * Legal document type enumeration
 * Types of legal documents that require user consent
 *
 * @remarks
 * Must be synchronized with Prisma schema: services/auth-service/prisma/schema.prisma
 */
export enum LegalDocumentType {
  /** Terms of Service document */
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  /** Privacy Policy document */
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  /** Marketing information consent policy */
  MARKETING_POLICY = 'MARKETING_POLICY',
  /** Personalized advertising consent policy */
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
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
