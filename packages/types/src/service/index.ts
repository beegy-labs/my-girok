/**
 * Service-related types for Global Account System
 * Used by auth-service for service join, consent management
 */

/**
 * Service entity row type (from database query)
 */
export interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  requiredConsents?: unknown;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User-Service relationship row type
 */
export interface UserServiceRow {
  id?: string;
  userId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName?: string;
  countryCode: string;
  status: string;
  joinedAt: Date;
}

/**
 * Consent requirement configuration row type
 */
export interface ConsentRequirementRow {
  id: string;
  serviceId: string;
  consentType: string;
  countryCode: string;
  isRequired: boolean;
  documentType?: string;
  displayOrder: number;
  labelKey?: string;
  descriptionKey?: string;
}

/**
 * User consent record row type
 */
export interface UserConsentRow {
  id: string;
  userId: string;
  serviceId: string;
  consentType: string;
  countryCode: string;
  documentId: string | null;
  agreed: boolean;
  agreedAt: Date | null;
  withdrawnAt: Date | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service join response DTO
 */
export interface ServiceJoinPayload {
  userService: {
    id: string;
    serviceId: string;
    serviceSlug: string;
    countryCode: string;
    status: string;
    joinedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}
