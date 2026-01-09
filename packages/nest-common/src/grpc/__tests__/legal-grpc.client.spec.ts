import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { LegalGrpcClient } from '../legal-grpc.client';
import { GRPC_SERVICES } from '../grpc.options';
import { ConsentType, ConsentStatus, DocumentType, DsrType, DsrStatus } from '../grpc.types';

describe('LegalGrpcClient', () => {
  let client: LegalGrpcClient;
  let mockLegalService: Record<string, Mock>;

  beforeEach(async () => {
    mockLegalService = {
      checkConsents: vi.fn(),
      getAccountConsents: vi.fn(),
      grantConsent: vi.fn(),
      revokeConsent: vi.fn(),
      getCurrentDocument: vi.fn(),
      getDocumentVersion: vi.fn(),
      listDocuments: vi.fn(),
      getLawRequirements: vi.fn(),
      getCountryCompliance: vi.fn(),
      createDsrRequest: vi.fn(),
      getDsrRequest: vi.fn(),
      getDsrDeadline: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LegalGrpcClient,
        {
          provide: GRPC_SERVICES.LEGAL,
          useValue: { getService: vi.fn().mockReturnValue(mockLegalService) },
        },
      ],
    }).compile();

    client = moduleRef.get<LegalGrpcClient>(LegalGrpcClient);
    client.onModuleInit();
  });

  describe('checkConsents', () => {
    it('should check if all required consents are granted', async () => {
      mockLegalService.checkConsents.mockReturnValue(
        of({
          all_required_granted: true,
          missing_consents: [],
          expired_consents: [],
          active_consents: [],
        }),
      );

      const result = await client.checkConsents({
        account_id: 'acc-123',
        country_code: 'US',
        required_types: [ConsentType.CONSENT_TYPE_TERMS_OF_SERVICE],
      });

      expect(result.all_required_granted).toBe(true);
    });
  });

  describe('grantConsent', () => {
    it('should grant consent successfully', async () => {
      mockLegalService.grantConsent.mockReturnValue(
        of({
          success: true,
          consent: { id: 'consent-1', status: ConsentStatus.CONSENT_STATUS_ACTIVE },
          message: 'Granted',
        }),
      );

      const result = await client.grantConsent({
        account_id: 'acc-123',
        consent_type: ConsentType.CONSENT_TYPE_TERMS_OF_SERVICE,
        document_id: 'doc-1',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getCurrentDocument', () => {
    it('should return current document', async () => {
      mockLegalService.getCurrentDocument.mockReturnValue(
        of({
          document: {
            id: 'doc-1',
            type: DocumentType.DOCUMENT_TYPE_TERMS_OF_SERVICE,
            title: 'Terms of Service',
            version: '1.0.0',
          },
        }),
      );

      const result = await client.getCurrentDocument({
        document_type: DocumentType.DOCUMENT_TYPE_TERMS_OF_SERVICE,
        language_code: 'en',
        country_code: 'US',
      });

      expect(result.document?.title).toBe('Terms of Service');
    });
  });

  describe('createDsrRequest', () => {
    it('should create DSR request', async () => {
      mockLegalService.createDsrRequest.mockReturnValue(
        of({
          dsr_request: {
            id: 'dsr-1',
            type: DsrType.DSR_TYPE_ERASURE,
            status: DsrStatus.DSR_STATUS_PENDING,
          },
        }),
      );

      const result = await client.createDsrRequest({
        account_id: 'acc-123',
        type: DsrType.DSR_TYPE_ERASURE,
        reason: 'User requested deletion',
      });

      expect(result.dsr_request?.id).toBe('dsr-1');
    });
  });

  describe('convenience methods', () => {
    it('hasAcceptedTerms should check terms consent', async () => {
      mockLegalService.checkConsents.mockReturnValue(of({ all_required_granted: true }));
      const result = await client.hasAcceptedTerms('acc-123', 'US');
      expect(result).toBe(true);
    });

    it('hasAcceptedPrivacyPolicy should check privacy consent', async () => {
      mockLegalService.checkConsents.mockReturnValue(of({ all_required_granted: false }));
      const result = await client.hasAcceptedPrivacyPolicy('acc-123', 'EU');
      expect(result).toBe(false);
    });

    it('getTermsOfService should get TOS document', async () => {
      mockLegalService.getCurrentDocument.mockReturnValue(of({ document: { id: 'tos-1' } }));
      const result = await client.getTermsOfService('en', 'US');
      expect(result.document?.id).toBe('tos-1');
    });

    it('submitErasureRequest should create erasure DSR', async () => {
      mockLegalService.createDsrRequest.mockReturnValue(of({ dsr_request: { id: 'dsr-1' } }));
      const result = await client.submitErasureRequest('acc-123', 'Delete my data');
      expect(result.dsr_request?.id).toBe('dsr-1');
    });

    it('submitAccessRequest should create access DSR', async () => {
      mockLegalService.createDsrRequest.mockReturnValue(of({ dsr_request: { id: 'dsr-2' } }));
      const result = await client.submitAccessRequest('acc-123', 'Need my data');
      expect(result.dsr_request?.id).toBe('dsr-2');
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      mockLegalService.checkConsents.mockReturnValue(throwError(() => new Error('Service error')));

      await expect(
        client.checkConsents({ account_id: 'acc-123', country_code: 'US', required_types: [] }),
      ).rejects.toMatchObject({ message: 'Service error' });
    });
  });
});
