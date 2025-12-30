// packages/types/src/admin/law.types.ts

import type { ConsentType } from '../legal/enums.js';

/**
 * Night time push notification restrictions
 */
export interface NightTimePush {
  start: number; // 0-23 hour
  end: number; // 0-23 hour
}

/**
 * Data retention requirements
 */
export interface DataRetention {
  maxDays: number;
}

/**
 * Parental consent requirements
 */
export interface ParentalConsent {
  ageThreshold: number; // 1-21
}

/**
 * Cross-border data transfer requirements
 */
export interface CrossBorderTransfer {
  requireExplicit: boolean;
}

/**
 * Special requirements for a law
 */
export interface SpecialRequirements {
  nightTimePush?: NightTimePush;
  dataRetention?: DataRetention;
  minAge?: number;
  parentalConsent?: ParentalConsent;
  crossBorderTransfer?: CrossBorderTransfer;
}

/**
 * Law requirements including consents and special rules
 */
export interface LawRequirements {
  requiredConsents: ConsentType[];
  optionalConsents: ConsentType[];
  specialRequirements?: SpecialRequirements;
}

/**
 * Law registry entry
 */
export interface Law {
  id: string;
  code: string; // e.g., PIPA, GDPR, CCPA
  countryCode: string; // ISO 3166-1 alpha-2
  name: string;
  requirements: LawRequirements;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Law DTO
 */
export interface CreateLawDto {
  code: string;
  countryCode: string;
  name: string;
  requirements: LawRequirements;
  isActive?: boolean;
}

/**
 * Update Law DTO
 */
export interface UpdateLawDto {
  name?: string;
  requirements?: LawRequirements;
  isActive?: boolean;
}

/**
 * Law Query parameters
 */
export interface LawQueryDto {
  countryCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Law List Response
 */
export interface LawListResponse {
  data: Law[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Consent requirement derived from a law
 * Different from legal/dto.ts ConsentRequirement
 */
export interface LawConsentRequirement {
  consentType: ConsentType;
  isRequired: boolean;
  source: 'LAW';
  lawCode: string;
}
