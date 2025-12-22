import { ConsentType, LegalDocumentType } from '.prisma/auth-client';

/**
 * Supported regions for consent policies
 * Based on major privacy law jurisdictions
 */
export type Region = 'KR' | 'JP' | 'EU' | 'US' | 'DEFAULT';

/**
 * Consent requirement configuration
 */
export interface ConsentRequirement {
  type: ConsentType;
  required: boolean;
  documentType: LegalDocumentType;
  labelKey: string;
  descriptionKey: string;
  /** Night-time restriction hours (if applicable) */
  nightTimeHours?: { start: number; end: number };
}

/**
 * Region-specific consent policy
 */
export interface RegionConsentPolicy {
  /** Region code */
  region: Region;
  /** Applicable privacy law */
  law: string;
  /** Consent requirements for this region */
  requirements: ConsentRequirement[];
  /** Night-time push restriction (21:00-08:00 by default) */
  nightTimePushRestriction?: { start: number; end: number };
}

/**
 * Base consent requirements (common across all regions)
 */
const BASE_REQUIRED_CONSENTS: ConsentRequirement[] = [
  {
    type: ConsentType.TERMS_OF_SERVICE,
    required: true,
    documentType: LegalDocumentType.TERMS_OF_SERVICE,
    labelKey: 'consent.termsOfService',
    descriptionKey: 'consent.termsOfServiceDesc',
  },
  {
    type: ConsentType.PRIVACY_POLICY,
    required: true,
    documentType: LegalDocumentType.PRIVACY_POLICY,
    labelKey: 'consent.privacyPolicy',
    descriptionKey: 'consent.privacyPolicyDesc',
  },
];

/**
 * Region-specific consent policies
 * Based on 2025 GDPR, CCPA, PIPA, APPI requirements
 */
export const REGION_CONSENT_POLICIES: Record<Region, RegionConsentPolicy> = {
  /**
   * Korea (PIPA - Personal Information Protection Act)
   * - Explicit consent required for marketing
   * - Night-time advertising restrictions (21:00-08:00)
   * - Separate consent required for each marketing channel
   */
  KR: {
    region: 'KR',
    law: 'PIPA (개인정보보호법)',
    nightTimePushRestriction: { start: 21, end: 8 },
    requirements: [
      ...BASE_REQUIRED_CONSENTS,
      {
        type: ConsentType.MARKETING_EMAIL,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingEmail',
        descriptionKey: 'consent.marketingEmailDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPush',
        descriptionKey: 'consent.marketingPushDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH_NIGHT,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPushNight',
        descriptionKey: 'consent.marketingPushNightDesc',
        nightTimeHours: { start: 21, end: 8 },
      },
      {
        type: ConsentType.PERSONALIZED_ADS,
        required: false,
        documentType: LegalDocumentType.PERSONALIZED_ADS,
        labelKey: 'consent.personalizedAds',
        descriptionKey: 'consent.personalizedAdsDesc',
      },
    ],
  },

  /**
   * Japan (APPI - Act on Protection of Personal Information)
   * - Similar to PIPA with explicit consent
   * - No specific night-time restrictions in law, but best practice
   */
  JP: {
    region: 'JP',
    law: 'APPI (個人情報保護法)',
    nightTimePushRestriction: { start: 21, end: 8 },
    requirements: [
      ...BASE_REQUIRED_CONSENTS,
      {
        type: ConsentType.MARKETING_EMAIL,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingEmail',
        descriptionKey: 'consent.marketingEmailDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPush',
        descriptionKey: 'consent.marketingPushDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH_NIGHT,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPushNight',
        descriptionKey: 'consent.marketingPushNightDesc',
        nightTimeHours: { start: 21, end: 8 },
      },
      {
        type: ConsentType.PERSONALIZED_ADS,
        required: false,
        documentType: LegalDocumentType.PERSONALIZED_ADS,
        labelKey: 'consent.personalizedAds',
        descriptionKey: 'consent.personalizedAdsDesc',
      },
      {
        type: ConsentType.THIRD_PARTY_SHARING,
        required: false,
        documentType: LegalDocumentType.PRIVACY_POLICY,
        labelKey: 'consent.thirdPartySharing',
        descriptionKey: 'consent.thirdPartySharingDesc',
      },
    ],
  },

  /**
   * European Union (GDPR - General Data Protection Regulation)
   * - Strictest consent requirements
   * - Explicit opt-in for all marketing
   * - Right to be forgotten
   * - Third-party sharing requires explicit consent
   */
  EU: {
    region: 'EU',
    law: 'GDPR',
    nightTimePushRestriction: { start: 22, end: 7 },
    requirements: [
      ...BASE_REQUIRED_CONSENTS,
      {
        type: ConsentType.MARKETING_EMAIL,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingEmail',
        descriptionKey: 'consent.marketingEmailDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPush',
        descriptionKey: 'consent.marketingPushDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH_NIGHT,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPushNight',
        descriptionKey: 'consent.marketingPushNightDesc',
        nightTimeHours: { start: 22, end: 7 },
      },
      {
        type: ConsentType.PERSONALIZED_ADS,
        required: false,
        documentType: LegalDocumentType.PERSONALIZED_ADS,
        labelKey: 'consent.personalizedAds',
        descriptionKey: 'consent.personalizedAdsDesc',
      },
      {
        type: ConsentType.THIRD_PARTY_SHARING,
        required: false,
        documentType: LegalDocumentType.PRIVACY_POLICY,
        labelKey: 'consent.thirdPartySharing',
        descriptionKey: 'consent.thirdPartySharingDesc',
      },
    ],
  },

  /**
   * United States (CCPA/CPRA - California Consumer Privacy Act)
   * - Opt-out model (less strict than GDPR)
   * - But we use opt-in for consistency and better UX
   */
  US: {
    region: 'US',
    law: 'CCPA/CPRA',
    nightTimePushRestriction: { start: 21, end: 8 },
    requirements: [
      ...BASE_REQUIRED_CONSENTS,
      {
        type: ConsentType.MARKETING_EMAIL,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingEmail',
        descriptionKey: 'consent.marketingEmailDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPush',
        descriptionKey: 'consent.marketingPushDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH_NIGHT,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPushNight',
        descriptionKey: 'consent.marketingPushNightDesc',
        nightTimeHours: { start: 21, end: 8 },
      },
      {
        type: ConsentType.PERSONALIZED_ADS,
        required: false,
        documentType: LegalDocumentType.PERSONALIZED_ADS,
        labelKey: 'consent.personalizedAds',
        descriptionKey: 'consent.personalizedAdsDesc',
      },
    ],
  },

  /**
   * Default policy (fallback for unrecognized regions)
   * Uses the most restrictive requirements (GDPR-like)
   */
  DEFAULT: {
    region: 'DEFAULT',
    law: 'Default (GDPR-aligned)',
    nightTimePushRestriction: { start: 21, end: 8 },
    requirements: [
      ...BASE_REQUIRED_CONSENTS,
      {
        type: ConsentType.MARKETING_EMAIL,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingEmail',
        descriptionKey: 'consent.marketingEmailDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPush',
        descriptionKey: 'consent.marketingPushDesc',
      },
      {
        type: ConsentType.MARKETING_PUSH_NIGHT,
        required: false,
        documentType: LegalDocumentType.MARKETING_POLICY,
        labelKey: 'consent.marketingPushNight',
        descriptionKey: 'consent.marketingPushNightDesc',
        nightTimeHours: { start: 21, end: 8 },
      },
      {
        type: ConsentType.PERSONALIZED_ADS,
        required: false,
        documentType: LegalDocumentType.PERSONALIZED_ADS,
        labelKey: 'consent.personalizedAds',
        descriptionKey: 'consent.personalizedAdsDesc',
      },
    ],
  },
};

/**
 * Get consent policy for a region
 */
export function getConsentPolicy(region?: string): RegionConsentPolicy {
  const normalizedRegion = region?.toUpperCase() as Region;
  return REGION_CONSENT_POLICIES[normalizedRegion] || REGION_CONSENT_POLICIES.DEFAULT;
}

/**
 * Map locale to region
 * Used when region is not explicitly provided
 */
export function localeToRegion(locale: string): Region {
  const localeMap: Record<string, Region> = {
    ko: 'KR',
    'ko-KR': 'KR',
    ja: 'JP',
    'ja-JP': 'JP',
    en: 'US',
    'en-US': 'US',
    'en-GB': 'EU',
    de: 'EU',
    'de-DE': 'EU',
    fr: 'EU',
    'fr-FR': 'EU',
    es: 'EU',
    'es-ES': 'EU',
    it: 'EU',
    'it-IT': 'EU',
  };

  return localeMap[locale] || 'DEFAULT';
}
