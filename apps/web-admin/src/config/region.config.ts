// apps/web-admin/src/config/region.config.ts

export type SupportedRegion = 'KR' | 'JP' | 'US' | 'GB' | 'IN' | 'EU';

export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING_EMAIL'
  | 'MARKETING_PUSH'
  | 'MARKETING_PUSH_NIGHT'
  | 'PERSONALIZED_ADS'
  | 'THIRD_PARTY_SHARING';

interface RegionConfig {
  code: SupportedRegion;
  nameKey: string;
  lawKey: string;
  flag: string;
  nightRestriction: { start: string; end: string } | null;
  requiredConsents: ConsentType[];
  optionalConsents: ConsentType[];
}

export const REGIONS: RegionConfig[] = [
  {
    code: 'KR',
    nameKey: 'regions.KR',
    lawKey: 'laws.PIPA',
    flag: '🇰🇷',
    nightRestriction: { start: '21:00', end: '08:00' },
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    optionalConsents: [
      'MARKETING_EMAIL',
      'MARKETING_PUSH',
      'MARKETING_PUSH_NIGHT',
      'THIRD_PARTY_SHARING',
    ],
  },
  {
    code: 'JP',
    nameKey: 'regions.JP',
    lawKey: 'laws.APPI',
    flag: '🇯🇵',
    nightRestriction: { start: '21:00', end: '08:00' },
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH', 'PERSONALIZED_ADS'],
  },
  {
    code: 'EU',
    nameKey: 'regions.EU',
    lawKey: 'laws.GDPR',
    flag: '🇪🇺',
    nightRestriction: { start: '22:00', end: '07:00' },
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    optionalConsents: [
      'MARKETING_EMAIL',
      'MARKETING_PUSH',
      'PERSONALIZED_ADS',
      'THIRD_PARTY_SHARING',
    ],
  },
  {
    code: 'US',
    nameKey: 'regions.US',
    lawKey: 'laws.CCPA',
    flag: '🇺🇸',
    nightRestriction: { start: '21:00', end: '08:00' },
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH', 'PERSONALIZED_ADS'],
  },
  {
    code: 'IN',
    nameKey: 'regions.IN',
    lawKey: 'laws.DPDP',
    flag: '🇮🇳',
    nightRestriction: null,
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH'],
  },
  {
    code: 'GB',
    nameKey: 'regions.GB',
    lawKey: 'laws.UKGDPR',
    flag: '🇬🇧',
    nightRestriction: { start: '21:00', end: '08:00' },
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    optionalConsents: [
      'MARKETING_EMAIL',
      'MARKETING_PUSH',
      'PERSONALIZED_ADS',
      'THIRD_PARTY_SHARING',
    ],
  },
];

export function getRegionConfig(code: SupportedRegion): RegionConfig | undefined {
  return REGIONS.find((r) => r.code === code);
}

export function getRegionOptions(t: (key: string) => string) {
  return REGIONS.map((r) => ({
    value: r.code,
    label: `${r.flag} ${t(r.nameKey)}`,
  }));
}

export const CONSENT_TYPE_LABELS: Record<string, string> = {
  TERMS_OF_SERVICE: 'consent.typeTerms',
  PRIVACY_POLICY: 'consent.typePrivacy',
  MARKETING_EMAIL: 'consent.typeMarketingEmail',
  MARKETING_PUSH: 'consent.typeMarketingPush',
  MARKETING_PUSH_NIGHT: 'consent.typeMarketingNight',
  PERSONALIZED_ADS: 'consent.typePersonalizedAds',
  THIRD_PARTY_SHARING: 'consent.typeThirdParty',
};
