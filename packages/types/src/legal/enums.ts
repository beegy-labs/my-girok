/**
 * Legal document type enumeration
 * SSOT: Aligned with packages/proto/legal/v1/legal.proto
 *
 * @remarks
 * Must be synchronized with Prisma schema: services/auth-service/prisma/schema.prisma
 */
export enum LegalDocumentType {
  /** Terms of Service document */
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  /** Privacy Policy document */
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  /** Cookie Policy document */
  COOKIE_POLICY = 'COOKIE_POLICY',
  /** Data Processing Agreement */
  DATA_PROCESSING_AGREEMENT = 'DATA_PROCESSING_AGREEMENT',
  /** Acceptable Use Policy */
  ACCEPTABLE_USE_POLICY = 'ACCEPTABLE_USE_POLICY',
  /** Marketing information consent policy */
  MARKETING_POLICY = 'MARKETING_POLICY',
  /** Personalized advertising consent policy */
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
  /** Consent form document */
  CONSENT_FORM = 'CONSENT_FORM',
}

/** Proto enum numeric values for DocumentType */
export const DocumentTypeProto = {
  UNSPECIFIED: 0,
  TERMS_OF_SERVICE: 1,
  PRIVACY_POLICY: 2,
  COOKIE_POLICY: 3,
  DATA_PROCESSING_AGREEMENT: 4,
  ACCEPTABLE_USE_POLICY: 5,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToDocumentType: Record<number, LegalDocumentType> = {
  0: LegalDocumentType.TERMS_OF_SERVICE,
  1: LegalDocumentType.TERMS_OF_SERVICE,
  2: LegalDocumentType.PRIVACY_POLICY,
  3: LegalDocumentType.COOKIE_POLICY,
  4: LegalDocumentType.DATA_PROCESSING_AGREEMENT,
  5: LegalDocumentType.ACCEPTABLE_USE_POLICY,
};

/** Map TypeScript enum to Proto numeric */
export const documentTypeToProto: Record<LegalDocumentType, number> = {
  [LegalDocumentType.TERMS_OF_SERVICE]: DocumentTypeProto.TERMS_OF_SERVICE,
  [LegalDocumentType.PRIVACY_POLICY]: DocumentTypeProto.PRIVACY_POLICY,
  [LegalDocumentType.COOKIE_POLICY]: DocumentTypeProto.COOKIE_POLICY,
  [LegalDocumentType.DATA_PROCESSING_AGREEMENT]: DocumentTypeProto.DATA_PROCESSING_AGREEMENT,
  [LegalDocumentType.ACCEPTABLE_USE_POLICY]: DocumentTypeProto.ACCEPTABLE_USE_POLICY,
  [LegalDocumentType.MARKETING_POLICY]: DocumentTypeProto.TERMS_OF_SERVICE, // Fallback
  [LegalDocumentType.PERSONALIZED_ADS]: DocumentTypeProto.TERMS_OF_SERVICE, // Fallback
  [LegalDocumentType.CONSENT_FORM]: DocumentTypeProto.TERMS_OF_SERVICE, // Fallback
};

/**
 * Consent type enumeration
 * SSOT: Aligned with packages/proto/legal/v1/legal.proto
 * GDPR/CCPA/PIPA/APPI 2026 compliant consent categories
 */
export enum ConsentType {
  /** Required: Agreement to Terms of Service */
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  /** Required: Agreement to Privacy Policy */
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  /** Optional: General marketing consent (Proto: MARKETING) */
  MARKETING = 'MARKETING',
  /** Optional: Marketing emails consent (granular) */
  MARKETING_EMAIL = 'MARKETING_EMAIL',
  /** Optional: Push notification marketing consent (granular) */
  MARKETING_PUSH = 'MARKETING_PUSH',
  /** Optional: Night-time push notification consent (21:00-08:00, Korean law) */
  MARKETING_PUSH_NIGHT = 'MARKETING_PUSH_NIGHT',
  /** Optional: SMS marketing consent (granular) */
  MARKETING_SMS = 'MARKETING_SMS',
  /** Optional: Analytics data collection consent */
  ANALYTICS = 'ANALYTICS',
  /** Optional: Personalized advertising consent */
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
  /** Optional: Third-party data sharing consent */
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
  /** Optional: Age verification consent */
  AGE_VERIFICATION = 'AGE_VERIFICATION',
  /** Optional: Parental consent for minors */
  PARENTAL_CONSENT = 'PARENTAL_CONSENT',
  /** Optional: Cross-border data transfer consent (GDPR) */
  CROSS_BORDER_TRANSFER = 'CROSS_BORDER_TRANSFER',
  /** Optional: Cross-service data sharing consent */
  CROSS_SERVICE_SHARING = 'CROSS_SERVICE_SHARING',
}

/** Proto enum numeric values for ConsentType */
export const ConsentTypeProto = {
  UNSPECIFIED: 0,
  TERMS_OF_SERVICE: 1,
  PRIVACY_POLICY: 2,
  MARKETING: 3,
  ANALYTICS: 4,
  THIRD_PARTY_SHARING: 5,
  AGE_VERIFICATION: 6,
  PARENTAL_CONSENT: 7,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToConsentType: Record<number, ConsentType> = {
  0: ConsentType.TERMS_OF_SERVICE,
  1: ConsentType.TERMS_OF_SERVICE,
  2: ConsentType.PRIVACY_POLICY,
  3: ConsentType.MARKETING,
  4: ConsentType.ANALYTICS,
  5: ConsentType.THIRD_PARTY_SHARING,
  6: ConsentType.AGE_VERIFICATION,
  7: ConsentType.PARENTAL_CONSENT,
};

/** Map TypeScript enum to Proto numeric */
export const consentTypeToProto: Record<ConsentType, number> = {
  [ConsentType.TERMS_OF_SERVICE]: ConsentTypeProto.TERMS_OF_SERVICE,
  [ConsentType.PRIVACY_POLICY]: ConsentTypeProto.PRIVACY_POLICY,
  [ConsentType.MARKETING]: ConsentTypeProto.MARKETING,
  [ConsentType.MARKETING_EMAIL]: ConsentTypeProto.MARKETING,
  [ConsentType.MARKETING_PUSH]: ConsentTypeProto.MARKETING,
  [ConsentType.MARKETING_PUSH_NIGHT]: ConsentTypeProto.MARKETING,
  [ConsentType.MARKETING_SMS]: ConsentTypeProto.MARKETING,
  [ConsentType.ANALYTICS]: ConsentTypeProto.ANALYTICS,
  [ConsentType.PERSONALIZED_ADS]: ConsentTypeProto.ANALYTICS,
  [ConsentType.THIRD_PARTY_SHARING]: ConsentTypeProto.THIRD_PARTY_SHARING,
  [ConsentType.AGE_VERIFICATION]: ConsentTypeProto.AGE_VERIFICATION,
  [ConsentType.PARENTAL_CONSENT]: ConsentTypeProto.PARENTAL_CONSENT,
  [ConsentType.CROSS_BORDER_TRANSFER]: ConsentTypeProto.THIRD_PARTY_SHARING,
  [ConsentType.CROSS_SERVICE_SHARING]: ConsentTypeProto.THIRD_PARTY_SHARING,
};

/**
 * Consent status enumeration
 * SSOT: Aligned with packages/proto/legal/v1/legal.proto
 * Tracks the current state of a user's consent
 */
export enum ConsentStatus {
  /** Consent is currently active (Proto: ACTIVE) */
  GRANTED = 'GRANTED',
  /** Consent has been withdrawn by user (Proto: REVOKED) */
  WITHDRAWN = 'WITHDRAWN',
  /** Consent has expired */
  EXPIRED = 'EXPIRED',
  /** Consent was superseded by a newer version */
  SUPERSEDED = 'SUPERSEDED',
}

/** Proto enum numeric values for ConsentStatus */
export const ConsentStatusProto = {
  UNSPECIFIED: 0,
  ACTIVE: 1,
  EXPIRED: 2,
  REVOKED: 3,
  SUPERSEDED: 4,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToConsentStatus: Record<number, ConsentStatus> = {
  0: ConsentStatus.GRANTED,
  1: ConsentStatus.GRANTED, // ACTIVE -> GRANTED
  2: ConsentStatus.EXPIRED,
  3: ConsentStatus.WITHDRAWN, // REVOKED -> WITHDRAWN
  4: ConsentStatus.SUPERSEDED,
};

/** Map TypeScript enum to Proto numeric */
export const consentStatusToProto: Record<ConsentStatus, number> = {
  [ConsentStatus.GRANTED]: ConsentStatusProto.ACTIVE,
  [ConsentStatus.WITHDRAWN]: ConsentStatusProto.REVOKED,
  [ConsentStatus.EXPIRED]: ConsentStatusProto.EXPIRED,
  [ConsentStatus.SUPERSEDED]: ConsentStatusProto.SUPERSEDED,
};

/**
 * Consent source enumeration
 * Identifies where the consent was collected from
 */
export enum ConsentSource {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  API = 'API',
  ADMIN = 'ADMIN',
}

/**
 * DSR (Data Subject Request) type enumeration
 * SSOT: Aligned with packages/proto/legal/v1/legal.proto
 * GDPR/CCPA compliant request types
 */
export enum DSRRequestType {
  ACCESS = 'ACCESS',
  RECTIFICATION = 'RECTIFICATION',
  ERASURE = 'ERASURE',
  PORTABILITY = 'PORTABILITY',
  RESTRICTION = 'RESTRICTION',
  OBJECTION = 'OBJECTION',
}

/** Proto enum numeric values for DsrType */
export const DsrTypeProto = {
  UNSPECIFIED: 0,
  ACCESS: 1,
  RECTIFICATION: 2,
  ERASURE: 3,
  PORTABILITY: 4,
  RESTRICTION: 5,
  OBJECTION: 6,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToDsrType: Record<number, DSRRequestType> = {
  0: DSRRequestType.ACCESS,
  1: DSRRequestType.ACCESS,
  2: DSRRequestType.RECTIFICATION,
  3: DSRRequestType.ERASURE,
  4: DSRRequestType.PORTABILITY,
  5: DSRRequestType.RESTRICTION,
  6: DSRRequestType.OBJECTION,
};

/** Map TypeScript enum to Proto numeric */
export const dsrTypeToProto: Record<DSRRequestType, number> = {
  [DSRRequestType.ACCESS]: DsrTypeProto.ACCESS,
  [DSRRequestType.RECTIFICATION]: DsrTypeProto.RECTIFICATION,
  [DSRRequestType.ERASURE]: DsrTypeProto.ERASURE,
  [DSRRequestType.PORTABILITY]: DsrTypeProto.PORTABILITY,
  [DSRRequestType.RESTRICTION]: DsrTypeProto.RESTRICTION,
  [DSRRequestType.OBJECTION]: DsrTypeProto.OBJECTION,
};

/**
 * DSR request status enumeration
 * SSOT: Aligned with packages/proto/legal/v1/legal.proto
 * Tracks the lifecycle of a data subject request
 */
export enum DSRRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  /** Request expired due to timeout (Proto: EXPIRED) */
  EXPIRED = 'EXPIRED',
}

/** Proto enum numeric values for DsrStatus */
export const DsrStatusProto = {
  UNSPECIFIED: 0,
  PENDING: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  REJECTED: 4,
  EXPIRED: 5,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToDsrStatus: Record<number, DSRRequestStatus> = {
  0: DSRRequestStatus.PENDING,
  1: DSRRequestStatus.PENDING,
  2: DSRRequestStatus.IN_PROGRESS,
  3: DSRRequestStatus.COMPLETED,
  4: DSRRequestStatus.REJECTED,
  5: DSRRequestStatus.EXPIRED,
};

/** Map TypeScript enum to Proto numeric */
export const dsrStatusToProto: Record<DSRRequestStatus, number> = {
  [DSRRequestStatus.PENDING]: DsrStatusProto.PENDING,
  [DSRRequestStatus.IN_PROGRESS]: DsrStatusProto.IN_PROGRESS,
  [DSRRequestStatus.COMPLETED]: DsrStatusProto.COMPLETED,
  [DSRRequestStatus.REJECTED]: DsrStatusProto.REJECTED,
  [DSRRequestStatus.CANCELLED]: DsrStatusProto.REJECTED, // No CANCELLED in Proto, map to REJECTED
  [DSRRequestStatus.EXPIRED]: DsrStatusProto.EXPIRED,
};

/**
 * Legal document status enumeration
 * Tracks the publication status of legal documents
 */
export enum LegalDocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
