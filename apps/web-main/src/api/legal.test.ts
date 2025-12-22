import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsentType, LegalDocumentType } from '@my-girok/types';
import {
  getConsentRequirements,
  getLegalDocument,
  getLegalDocumentById,
  getUserConsents,
  createConsents,
  updateConsent,
  checkRequiredConsents,
} from './legal';
import { publicApi, authApi } from './auth';

// Mock the auth module
vi.mock('./auth', () => ({
  publicApi: {
    get: vi.fn(),
  },
  authApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Legal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getConsentRequirements', () => {
    const mockResponse = {
      data: {
        region: 'KR',
        law: 'PIPA (개인정보보호법)',
        nightTimePushRestriction: { start: 21, end: 8 },
        requirements: [
          {
            type: ConsentType.TERMS_OF_SERVICE,
            required: true,
            labelKey: 'consent.termsOfService',
            descriptionKey: 'consent.termsOfServiceDesc',
            documentType: LegalDocumentType.TERMS_OF_SERVICE,
            document: { id: '1', version: '1.0', title: 'Terms', summary: null },
          },
        ],
      },
    };

    it('should fetch consent requirements with default locale', async () => {
      vi.mocked(publicApi.get).mockResolvedValue(mockResponse);

      const result = await getConsentRequirements();

      expect(publicApi.get).toHaveBeenCalledWith('/v1/legal/consent-requirements', {
        params: { locale: 'ko' },
      });
      expect(result.region).toBe('KR');
      expect(result.law).toBe('PIPA (개인정보보호법)');
      expect(result.requirements).toHaveLength(1);
    });

    it('should fetch consent requirements with specified locale', async () => {
      const jpResponse = {
        data: {
          region: 'JP',
          law: 'APPI (個人情報保護法)',
          requirements: [],
        },
      };
      vi.mocked(publicApi.get).mockResolvedValue(jpResponse);

      const result = await getConsentRequirements('ja');

      expect(publicApi.get).toHaveBeenCalledWith('/v1/legal/consent-requirements', {
        params: { locale: 'ja' },
      });
      expect(result.region).toBe('JP');
    });

    it('should handle EU locale', async () => {
      const euResponse = {
        data: {
          region: 'EU',
          law: 'GDPR',
          requirements: [
            {
              type: ConsentType.THIRD_PARTY_SHARING,
              required: true,
              labelKey: 'consent.thirdPartySharing',
              descriptionKey: 'consent.thirdPartySharingDesc',
              documentType: LegalDocumentType.PRIVACY_POLICY,
              document: null,
            },
          ],
        },
      };
      vi.mocked(publicApi.get).mockResolvedValue(euResponse);

      const result = await getConsentRequirements('de');

      expect(result.region).toBe('EU');
      expect(result.requirements[0].type).toBe(ConsentType.THIRD_PARTY_SHARING);
    });
  });

  describe('getLegalDocument', () => {
    const mockDocument = {
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: LegalDocumentType.TERMS_OF_SERVICE,
        version: '2.0',
        locale: 'ko',
        title: '이용약관',
        content: '<html>...</html>',
        summary: '서비스 이용에 관한 약관',
        effectiveDate: new Date('2025-01-01'),
      },
    };

    it('should fetch legal document by type with default locale', async () => {
      vi.mocked(publicApi.get).mockResolvedValue(mockDocument);

      const result = await getLegalDocument(LegalDocumentType.TERMS_OF_SERVICE);

      expect(publicApi.get).toHaveBeenCalledWith('/v1/legal/documents/TERMS_OF_SERVICE', {
        params: { locale: 'ko' },
      });
      expect(result.title).toBe('이용약관');
      expect(result.version).toBe('2.0');
    });

    it('should fetch legal document with specified locale', async () => {
      const enDocument = {
        data: {
          ...mockDocument.data,
          locale: 'en',
          title: 'Terms of Service',
        },
      };
      vi.mocked(publicApi.get).mockResolvedValue(enDocument);

      const result = await getLegalDocument(LegalDocumentType.TERMS_OF_SERVICE, 'en');

      expect(publicApi.get).toHaveBeenCalledWith('/v1/legal/documents/TERMS_OF_SERVICE', {
        params: { locale: 'en' },
      });
      expect(result.title).toBe('Terms of Service');
    });

    it('should fetch privacy policy document', async () => {
      const privacyDoc = {
        data: {
          id: '123',
          type: LegalDocumentType.PRIVACY_POLICY,
          version: '1.5',
          locale: 'ko',
          title: '개인정보처리방침',
          content: '<html>...</html>',
          summary: null,
          effectiveDate: new Date('2025-01-01'),
        },
      };
      vi.mocked(publicApi.get).mockResolvedValue(privacyDoc);

      const result = await getLegalDocument(LegalDocumentType.PRIVACY_POLICY);

      expect(result.type).toBe(LegalDocumentType.PRIVACY_POLICY);
    });
  });

  describe('getLegalDocumentById', () => {
    it('should fetch legal document by UUID', async () => {
      const mockDocument = {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: LegalDocumentType.PRIVACY_POLICY,
          version: '2.0',
          locale: 'ko',
          title: '개인정보처리방침',
          content: '<html>...</html>',
          summary: null,
          effectiveDate: new Date('2025-01-01'),
        },
      };
      vi.mocked(publicApi.get).mockResolvedValue(mockDocument);

      const result = await getLegalDocumentById('550e8400-e29b-41d4-a716-446655440000');

      expect(publicApi.get).toHaveBeenCalledWith(
        '/v1/legal/documents/by-id/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('getUserConsents', () => {
    it('should fetch user consents', async () => {
      const mockConsents = {
        data: [
          {
            id: '1',
            userId: 'user-123',
            consentType: ConsentType.TERMS_OF_SERVICE,
            agreed: true,
            agreedAt: new Date('2025-01-01'),
          },
          {
            id: '2',
            userId: 'user-123',
            consentType: ConsentType.PRIVACY_POLICY,
            agreed: true,
            agreedAt: new Date('2025-01-01'),
          },
          {
            id: '3',
            userId: 'user-123',
            consentType: ConsentType.MARKETING_EMAIL,
            agreed: false,
            agreedAt: new Date('2025-01-01'),
            withdrawnAt: new Date('2025-01-15'),
          },
        ],
      };
      vi.mocked(authApi.get).mockResolvedValue(mockConsents);

      const result = await getUserConsents();

      expect(authApi.get).toHaveBeenCalledWith('/v1/legal/consents');
      expect(result).toHaveLength(3);
      expect(result[0].consentType).toBe(ConsentType.TERMS_OF_SERVICE);
      expect(result[2].withdrawnAt).toBeDefined();
    });
  });

  describe('createConsents', () => {
    it('should create multiple consents', async () => {
      const consentsToCreate = [
        { consentType: ConsentType.TERMS_OF_SERVICE, agreed: true },
        { consentType: ConsentType.PRIVACY_POLICY, agreed: true },
        { consentType: ConsentType.MARKETING_EMAIL, agreed: false },
      ];
      const mockCreated = {
        data: consentsToCreate.map((c, i) => ({
          id: `${i + 1}`,
          userId: 'user-123',
          ...c,
          agreedAt: new Date(),
        })),
      };
      vi.mocked(authApi.post).mockResolvedValue(mockCreated);

      const result = await createConsents(consentsToCreate);

      expect(authApi.post).toHaveBeenCalledWith('/v1/legal/consents', {
        consents: consentsToCreate,
      });
      expect(result).toHaveLength(3);
    });

    it('should create consent with document reference', async () => {
      const consentsToCreate = [
        {
          consentType: ConsentType.TERMS_OF_SERVICE,
          agreed: true,
          documentId: 'doc-123',
        },
      ];
      const mockCreated = {
        data: [
          {
            id: '1',
            userId: 'user-123',
            consentType: ConsentType.TERMS_OF_SERVICE,
            documentId: 'doc-123',
            documentVersion: '2.0',
            agreed: true,
            agreedAt: new Date(),
          },
        ],
      };
      vi.mocked(authApi.post).mockResolvedValue(mockCreated);

      const result = await createConsents(consentsToCreate);

      expect(result[0].documentVersion).toBe('2.0');
    });
  });

  describe('updateConsent', () => {
    it('should update consent to agree', async () => {
      const mockUpdated = {
        data: {
          id: '1',
          userId: 'user-123',
          consentType: ConsentType.MARKETING_EMAIL,
          agreed: true,
          agreedAt: new Date(),
        },
      };
      vi.mocked(authApi.put).mockResolvedValue(mockUpdated);

      const result = await updateConsent(ConsentType.MARKETING_EMAIL, true);

      expect(authApi.put).toHaveBeenCalledWith(
        '/v1/legal/consents/MARKETING_EMAIL',
        { agreed: true },
        { params: { locale: 'ko' } },
      );
      expect(result.agreed).toBe(true);
    });

    it('should update consent to withdraw', async () => {
      const mockUpdated = {
        data: {
          id: '1',
          userId: 'user-123',
          consentType: ConsentType.MARKETING_EMAIL,
          agreed: false,
          agreedAt: new Date('2025-01-01'),
          withdrawnAt: new Date('2025-01-15'),
        },
      };
      vi.mocked(authApi.put).mockResolvedValue(mockUpdated);

      const result = await updateConsent(ConsentType.MARKETING_EMAIL, false, 'ko');

      expect(result.agreed).toBe(false);
      expect(result.withdrawnAt).toBeDefined();
    });

    it('should use specified locale for region policy', async () => {
      const mockUpdated = {
        data: {
          id: '1',
          userId: 'user-123',
          consentType: ConsentType.THIRD_PARTY_SHARING,
          agreed: true,
          agreedAt: new Date(),
        },
      };
      vi.mocked(authApi.put).mockResolvedValue(mockUpdated);

      await updateConsent(ConsentType.THIRD_PARTY_SHARING, true, 'de');

      expect(authApi.put).toHaveBeenCalledWith(
        '/v1/legal/consents/THIRD_PARTY_SHARING',
        { agreed: true },
        { params: { locale: 'de' } },
      );
    });
  });

  describe('checkRequiredConsents', () => {
    it('should return true when all required consents are given', async () => {
      const mockCheck = {
        data: { hasAllRequired: true },
      };
      vi.mocked(authApi.get).mockResolvedValue(mockCheck);

      const result = await checkRequiredConsents();

      expect(authApi.get).toHaveBeenCalledWith('/v1/legal/consents/check', {
        params: { locale: 'ko' },
      });
      expect(result.hasAllRequired).toBe(true);
    });

    it('should return false when required consents are missing', async () => {
      const mockCheck = {
        data: { hasAllRequired: false },
      };
      vi.mocked(authApi.get).mockResolvedValue(mockCheck);

      const result = await checkRequiredConsents('en');

      expect(authApi.get).toHaveBeenCalledWith('/v1/legal/consents/check', {
        params: { locale: 'en' },
      });
      expect(result.hasAllRequired).toBe(false);
    });

    it('should check with EU locale for GDPR requirements', async () => {
      const mockCheck = {
        data: { hasAllRequired: false },
      };
      vi.mocked(authApi.get).mockResolvedValue(mockCheck);

      await checkRequiredConsents('de');

      expect(authApi.get).toHaveBeenCalledWith('/v1/legal/consents/check', {
        params: { locale: 'de' },
      });
    });
  });
});
