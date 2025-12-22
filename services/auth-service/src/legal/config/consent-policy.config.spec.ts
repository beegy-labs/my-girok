import { ConsentType, LegalDocumentType } from '.prisma/auth-client';
import {
  getConsentPolicy,
  localeToRegion,
  REGION_CONSENT_POLICIES,
  type Region,
  type RegionConsentPolicy,
} from './consent-policy.config';

describe('consent-policy.config', () => {
  describe('localeToRegion', () => {
    it('should map Korean locales to KR', () => {
      expect(localeToRegion('ko')).toBe('KR');
      expect(localeToRegion('ko-KR')).toBe('KR');
    });

    it('should map Japanese locales to JP', () => {
      expect(localeToRegion('ja')).toBe('JP');
      expect(localeToRegion('ja-JP')).toBe('JP');
    });

    it('should map English US locales to US', () => {
      expect(localeToRegion('en')).toBe('US');
      expect(localeToRegion('en-US')).toBe('US');
    });

    it('should map European locales to EU', () => {
      expect(localeToRegion('en-GB')).toBe('EU');
      expect(localeToRegion('de')).toBe('EU');
      expect(localeToRegion('de-DE')).toBe('EU');
      expect(localeToRegion('fr')).toBe('EU');
      expect(localeToRegion('fr-FR')).toBe('EU');
      expect(localeToRegion('es')).toBe('EU');
      expect(localeToRegion('es-ES')).toBe('EU');
      expect(localeToRegion('it')).toBe('EU');
      expect(localeToRegion('it-IT')).toBe('EU');
    });

    it('should return DEFAULT for unknown locales', () => {
      expect(localeToRegion('unknown')).toBe('DEFAULT');
      expect(localeToRegion('zh')).toBe('DEFAULT');
      expect(localeToRegion('ru')).toBe('DEFAULT');
      expect(localeToRegion('')).toBe('DEFAULT');
    });
  });

  describe('getConsentPolicy', () => {
    it('should return KR policy for KR region', () => {
      const policy = getConsentPolicy('KR');

      expect(policy.region).toBe('KR');
      expect(policy.law).toBe('PIPA (개인정보보호법)');
      expect(policy.nightTimePushRestriction).toEqual({ start: 21, end: 8 });
    });

    it('should return JP policy for JP region', () => {
      const policy = getConsentPolicy('JP');

      expect(policy.region).toBe('JP');
      expect(policy.law).toBe('APPI (個人情報保護法)');
    });

    it('should return EU policy for EU region', () => {
      const policy = getConsentPolicy('EU');

      expect(policy.region).toBe('EU');
      expect(policy.law).toBe('GDPR');
      expect(policy.nightTimePushRestriction).toEqual({ start: 22, end: 7 });
    });

    it('should return US policy for US region', () => {
      const policy = getConsentPolicy('US');

      expect(policy.region).toBe('US');
      expect(policy.law).toBe('CCPA/CPRA');
    });

    it('should return DEFAULT policy for DEFAULT region', () => {
      const policy = getConsentPolicy('DEFAULT');

      expect(policy.region).toBe('DEFAULT');
      expect(policy.law).toBe('Default (GDPR-aligned)');
    });

    it('should return DEFAULT policy for unknown region', () => {
      const policy = getConsentPolicy('UNKNOWN' as Region);

      expect(policy.region).toBe('DEFAULT');
    });

    it('should handle lowercase region', () => {
      const policy = getConsentPolicy('kr');

      expect(policy.region).toBe('KR');
    });

    it('should return DEFAULT when region is undefined', () => {
      const policy = getConsentPolicy(undefined);

      expect(policy.region).toBe('DEFAULT');
    });
  });

  describe('REGION_CONSENT_POLICIES', () => {
    const regions: Region[] = ['KR', 'JP', 'EU', 'US', 'DEFAULT'];

    regions.forEach((region) => {
      describe(`${region} policy`, () => {
        let policy: RegionConsentPolicy;

        beforeAll(() => {
          policy = REGION_CONSENT_POLICIES[region];
        });

        it('should have required base consents', () => {
          const types = policy.requirements.map((r) => r.type);

          expect(types).toContain(ConsentType.TERMS_OF_SERVICE);
          expect(types).toContain(ConsentType.PRIVACY_POLICY);
        });

        it('should mark base consents as required', () => {
          const tosRequirement = policy.requirements.find(
            (r) => r.type === ConsentType.TERMS_OF_SERVICE,
          );
          const privacyRequirement = policy.requirements.find(
            (r) => r.type === ConsentType.PRIVACY_POLICY,
          );

          expect(tosRequirement?.required).toBe(true);
          expect(privacyRequirement?.required).toBe(true);
        });

        it('should have correct document types for base consents', () => {
          const tosRequirement = policy.requirements.find(
            (r) => r.type === ConsentType.TERMS_OF_SERVICE,
          );
          const privacyRequirement = policy.requirements.find(
            (r) => r.type === ConsentType.PRIVACY_POLICY,
          );

          expect(tosRequirement?.documentType).toBe(LegalDocumentType.TERMS_OF_SERVICE);
          expect(privacyRequirement?.documentType).toBe(LegalDocumentType.PRIVACY_POLICY);
        });

        it('should have i18n keys for all requirements', () => {
          policy.requirements.forEach((req) => {
            expect(req.labelKey).toBeDefined();
            expect(req.labelKey.startsWith('consent.')).toBe(true);
            expect(req.descriptionKey).toBeDefined();
            expect(req.descriptionKey.startsWith('consent.')).toBe(true);
          });
        });

        it('should have optional marketing consents', () => {
          const marketingRequirements = policy.requirements.filter((r) =>
            r.type.startsWith('MARKETING'),
          );

          marketingRequirements.forEach((req) => {
            expect(req.required).toBe(false);
          });
        });

        it('should have nightTimePushRestriction defined', () => {
          expect(policy.nightTimePushRestriction).toBeDefined();
          expect(policy.nightTimePushRestriction?.start).toBeGreaterThanOrEqual(20);
          expect(policy.nightTimePushRestriction?.end).toBeLessThanOrEqual(9);
        });
      });
    });

    describe('KR specific', () => {
      it('should have MARKETING_PUSH_NIGHT consent with night time hours', () => {
        const policy = REGION_CONSENT_POLICIES.KR;
        const nightPushRequirement = policy.requirements.find(
          (r) => r.type === ConsentType.MARKETING_PUSH_NIGHT,
        );

        expect(nightPushRequirement).toBeDefined();
        expect(nightPushRequirement?.nightTimeHours).toEqual({ start: 21, end: 8 });
      });
    });

    describe('JP specific', () => {
      it('should have THIRD_PARTY_SHARING consent', () => {
        const policy = REGION_CONSENT_POLICIES.JP;
        const thirdPartyRequirement = policy.requirements.find(
          (r) => r.type === ConsentType.THIRD_PARTY_SHARING,
        );

        expect(thirdPartyRequirement).toBeDefined();
        expect(thirdPartyRequirement?.required).toBe(false);
      });
    });

    describe('EU specific', () => {
      it('should have strictest night time restriction', () => {
        const policy = REGION_CONSENT_POLICIES.EU;

        expect(policy.nightTimePushRestriction).toEqual({ start: 22, end: 7 });
      });

      it('should have THIRD_PARTY_SHARING consent for GDPR compliance', () => {
        const policy = REGION_CONSENT_POLICIES.EU;
        const thirdPartyRequirement = policy.requirements.find(
          (r) => r.type === ConsentType.THIRD_PARTY_SHARING,
        );

        expect(thirdPartyRequirement).toBeDefined();
      });
    });
  });

  describe('Integration: localeToRegion -> getConsentPolicy', () => {
    it('should get correct policy from locale chain', () => {
      const testCases = [
        { locale: 'ko', expectedRegion: 'KR', expectedLaw: 'PIPA (개인정보보호법)' },
        { locale: 'ja', expectedRegion: 'JP', expectedLaw: 'APPI (個人情報保護法)' },
        { locale: 'de-DE', expectedRegion: 'EU', expectedLaw: 'GDPR' },
        { locale: 'en-US', expectedRegion: 'US', expectedLaw: 'CCPA/CPRA' },
        { locale: 'unknown', expectedRegion: 'DEFAULT', expectedLaw: 'Default (GDPR-aligned)' },
      ];

      testCases.forEach(({ locale, expectedRegion, expectedLaw }) => {
        const region = localeToRegion(locale);
        const policy = getConsentPolicy(region);

        expect(region).toBe(expectedRegion);
        expect(policy.law).toBe(expectedLaw);
      });
    });
  });
});
