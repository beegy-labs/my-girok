import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { LegalGrpcController } from './legal.grpc.controller';
import { ConsentsService } from '../consents/consents.service';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import { LawRegistryService } from '../law-registry/law-registry.service';
import { DsrRequestsService } from '../dsr-requests/dsr-requests.service';

describe('LegalGrpcController', () => {
  let controller: LegalGrpcController;
  let mockConsentsService: {
    getConsentsForAccount: Mock;
    grantConsent: Mock;
    withdrawConsent: Mock;
  };
  let mockLegalDocumentsService: {
    getActiveDocuments: Mock;
    findOneWithContent: Mock;
    findAll: Mock;
  };
  let mockLawRegistryService: {
    findAll: Mock;
    findOne: Mock;
  };
  let mockDsrRequestsService: {
    create: Mock;
    findOne: Mock;
  };

  const mockConsent = {
    id: 'consent-123',
    accountId: 'account-456',
    documentId: 'doc-789',
    status: 'GRANTED',
    consentedAt: new Date('2024-01-01'),
    withdrawnAt: null,
  };

  const mockDocument = {
    id: 'doc-123',
    type: 'TERMS_OF_SERVICE',
    version: '1.0.0',
    title: 'Terms of Service',
    content: 'Terms content...',
    contentHash: 'hash123',
    locale: 'en',
    countryCode: 'US',
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: null,
    createdAt: new Date('2024-01-01'),
    status: 'ACTIVE',
  };

  const mockLaw = {
    id: 'law-123',
    code: 'GDPR',
    name: 'General Data Protection Regulation',
    countryCode: 'DE',
    isActive: true,
    effectiveFrom: new Date('2018-05-25'),
    createdAt: new Date('2018-05-25'),
  };

  const mockDsrRequest = {
    id: 'dsr-123',
    accountId: 'account-456',
    requestType: 'ACCESS',
    status: 'PENDING',
    description: 'Data access request',
    requestedAt: new Date('2024-01-01'),
    dueDate: new Date('2024-01-31'),
    completedAt: null,
    assignedTo: null,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockConsentsService = {
      getConsentsForAccount: vi.fn(),
      grantConsent: vi.fn(),
      withdrawConsent: vi.fn(),
    };

    mockLegalDocumentsService = {
      getActiveDocuments: vi.fn(),
      findOneWithContent: vi.fn(),
      findAll: vi.fn(),
    };

    mockLawRegistryService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
    };

    mockDsrRequestsService = {
      create: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalGrpcController],
      providers: [
        { provide: ConsentsService, useValue: mockConsentsService },
        { provide: LegalDocumentsService, useValue: mockLegalDocumentsService },
        { provide: LawRegistryService, useValue: mockLawRegistryService },
        { provide: DsrRequestsService, useValue: mockDsrRequestsService },
      ],
    }).compile();

    controller = module.get<LegalGrpcController>(LegalGrpcController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Consent Operations', () => {
    describe('checkConsents', () => {
      it('should return all_required_granted true when all consents are active', async () => {
        mockConsentsService.getConsentsForAccount.mockResolvedValue([mockConsent]);
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.checkConsents({
          account_id: 'account-456',
          country_code: 'DE',
          required_types: [],
        });

        expect(result.all_required_granted).toBe(true);
        expect(result.active_consents).toHaveLength(1);
        expect(mockConsentsService.getConsentsForAccount).toHaveBeenCalledWith('account-456');
      });

      it('should identify missing consents when required types not granted', async () => {
        mockConsentsService.getConsentsForAccount.mockResolvedValue([]);
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.checkConsents({
          account_id: 'account-456',
          country_code: 'DE',
          required_types: [1, 2], // TERMS_OF_SERVICE, PRIVACY_POLICY
        });

        expect(result.active_consents).toHaveLength(0);
      });

      it('should handle errors with RpcException', async () => {
        mockConsentsService.getConsentsForAccount.mockRejectedValue(new Error('Database error'));

        await expect(
          controller.checkConsents({
            account_id: 'account-456',
            country_code: 'DE',
            required_types: [],
          }),
        ).rejects.toThrow(RpcException);
      });
    });

    describe('getAccountConsents', () => {
      it('should return all consents for account', async () => {
        mockConsentsService.getConsentsForAccount.mockResolvedValue([mockConsent]);

        const result = await controller.getAccountConsents({
          account_id: 'account-456',
          include_revoked: true,
          include_expired: true,
        });

        expect(result.consents).toHaveLength(1);
        expect(result.total_count).toBe(1);
      });

      it('should filter out revoked consents when include_revoked is false', async () => {
        const revokedConsent = { ...mockConsent, status: 'WITHDRAWN' };
        mockConsentsService.getConsentsForAccount.mockResolvedValue([mockConsent, revokedConsent]);

        const result = await controller.getAccountConsents({
          account_id: 'account-456',
          include_revoked: false,
          include_expired: true,
        });

        expect(result.consents).toHaveLength(1);
        expect(result.total_count).toBe(1);
      });

      it('should filter out expired consents when include_expired is false', async () => {
        const expiredConsent = { ...mockConsent, status: 'EXPIRED' };
        mockConsentsService.getConsentsForAccount.mockResolvedValue([expiredConsent]);

        const result = await controller.getAccountConsents({
          account_id: 'account-456',
          include_revoked: true,
          include_expired: false,
        });

        expect(result.consents).toHaveLength(0);
      });
    });

    describe('grantConsent', () => {
      it('should grant consent successfully', async () => {
        mockConsentsService.grantConsent.mockResolvedValue(mockConsent);

        const result = await controller.grantConsent({
          account_id: 'account-456',
          consent_type: 1,
          document_id: 'doc-789',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0',
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe('Consent granted successfully');
        expect(result.consent).toBeDefined();
      });

      it('should return failure when consent grant fails', async () => {
        mockConsentsService.grantConsent.mockRejectedValue(new Error('Consent already exists'));

        const result = await controller.grantConsent({
          account_id: 'account-456',
          consent_type: 1,
          document_id: 'doc-789',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0',
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('Consent already exists');
      });
    });

    describe('revokeConsent', () => {
      it('should revoke consent successfully', async () => {
        mockConsentsService.withdrawConsent.mockResolvedValue(undefined);

        const result = await controller.revokeConsent({
          account_id: 'account-456',
          consent_id: 'consent-123',
          reason: 'User request',
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe('Consent revoked successfully');
      });

      it('should return failure when consent not found', async () => {
        mockConsentsService.withdrawConsent.mockRejectedValue(
          new NotFoundException('Consent not found'),
        );

        const result = await controller.revokeConsent({
          account_id: 'account-456',
          consent_id: 'invalid-id',
          reason: 'User request',
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('Consent not found');
      });
    });
  });

  describe('Document Operations', () => {
    describe('getCurrentDocument', () => {
      it('should return current document for type and locale', async () => {
        mockLegalDocumentsService.getActiveDocuments.mockResolvedValue([mockDocument]);
        mockLegalDocumentsService.findOneWithContent.mockResolvedValue(mockDocument);

        const result = await controller.getCurrentDocument({
          document_type: 1, // TERMS_OF_SERVICE
          language_code: 'en',
          country_code: 'US',
        });

        expect(result.document).toBeDefined();
        expect(result.document?.type).toBe(1);
      });

      it('should return undefined when document not found', async () => {
        mockLegalDocumentsService.getActiveDocuments.mockResolvedValue([]);

        const result = await controller.getCurrentDocument({
          document_type: 1,
          language_code: 'en',
          country_code: 'US',
        });

        expect(result.document).toBeUndefined();
      });

      it('should handle NotFoundException gracefully', async () => {
        mockLegalDocumentsService.getActiveDocuments.mockRejectedValue(
          new NotFoundException('Document not found'),
        );

        const result = await controller.getCurrentDocument({
          document_type: 1,
          language_code: 'en',
          country_code: 'US',
        });

        expect(result.document).toBeUndefined();
      });
    });

    describe('getDocumentVersion', () => {
      it('should return document with matching version', async () => {
        mockLegalDocumentsService.findOneWithContent.mockResolvedValue(mockDocument);

        const result = await controller.getDocumentVersion({
          document_id: 'doc-123',
          version: '1.0.0',
        });

        expect(result.document).toBeDefined();
      });

      it('should return undefined when version does not match', async () => {
        mockLegalDocumentsService.findOneWithContent.mockResolvedValue(mockDocument);

        const result = await controller.getDocumentVersion({
          document_id: 'doc-123',
          version: '2.0.0',
        });

        expect(result.document).toBeUndefined();
      });
    });

    describe('listDocuments', () => {
      it('should return paginated documents', async () => {
        mockLegalDocumentsService.findAll.mockResolvedValue([mockDocument, mockDocument]);

        const result = await controller.listDocuments({
          type: 1,
          language_code: 'en',
          include_expired: false,
          page_size: 10,
          page_token: '',
        });

        expect(result.documents).toHaveLength(2);
        expect(result.total_count).toBe(2);
      });

      it('should handle pagination with page_token', async () => {
        const docs = Array(25).fill(mockDocument);
        mockLegalDocumentsService.findAll.mockResolvedValue(docs);

        const result = await controller.listDocuments({
          type: 0,
          language_code: '',
          include_expired: true,
          page_size: 10,
          page_token: '10',
        });

        expect(result.documents).toHaveLength(10);
        expect(result.next_page_token).toBe('20');
      });
    });
  });

  describe('Law Registry Operations', () => {
    describe('getLawRequirements', () => {
      it('should return law requirements for country', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.getLawRequirements({
          country_code: 'DE',
        });

        expect(result.requirements).toBeDefined();
        expect(result.requirements?.law_code).toBe('GDPR');
        expect(result.requirements?.country_code).toBe('DE');
      });

      it('should return undefined when no laws found', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([]);

        const result = await controller.getLawRequirements({
          country_code: 'XX',
        });

        expect(result.requirements).toBeUndefined();
      });

      it('should return default requirements for GDPR', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.getLawRequirements({
          country_code: 'DE',
        });

        expect(result.requirements?.minimum_age).toBe(16);
        expect(result.requirements?.dsr_deadline_days).toBe(30);
        expect(result.requirements?.requires_explicit_consent).toBe(true);
      });
    });

    describe('getCountryCompliance', () => {
      it('should return compliance info with applicable laws', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.getCountryCompliance({
          country_code: 'DE',
        });

        expect(result.compliance).toBeDefined();
        expect(result.compliance?.applicable_laws).toContain('GDPR');
        expect(result.compliance?.gdpr_applicable).toBe(true);
      });

      it('should return default compliance for unknown country', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([]);

        const result = await controller.getCountryCompliance({
          country_code: 'XX',
        });

        expect(result.compliance?.applicable_laws).toHaveLength(0);
        expect(result.compliance?.gdpr_applicable).toBe(false);
      });

      it('should detect GDPR applicability for EU countries', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([]);

        const result = await controller.getCountryCompliance({
          country_code: 'FR',
        });

        expect(result.compliance?.gdpr_applicable).toBe(true);
      });

      it('should detect CCPA applicability for US', async () => {
        mockLawRegistryService.findAll.mockResolvedValue([]);

        const result = await controller.getCountryCompliance({
          country_code: 'US',
        });

        expect(result.compliance?.ccpa_applicable).toBe(true);
      });

      it('should identify strictest law among multiple laws', async () => {
        const ccpaLaw = { ...mockLaw, code: 'CCPA', countryCode: 'US' };
        mockLawRegistryService.findAll.mockResolvedValue([ccpaLaw, mockLaw]);

        const result = await controller.getCountryCompliance({
          country_code: 'US',
        });

        // GDPR should be strictest
        expect(result.compliance?.strictest_requirements?.law_code).toBe('GDPR');
      });
    });
  });

  describe('DSR Operations', () => {
    describe('createDsrRequest', () => {
      it('should create DSR request successfully', async () => {
        mockDsrRequestsService.create.mockResolvedValue(mockDsrRequest);

        const result = await controller.createDsrRequest({
          account_id: 'account-456',
          type: 1, // ACCESS
          reason: 'Data access request',
        });

        expect(result.dsr_request).toBeDefined();
        expect(result.dsr_request?.account_id).toBe('account-456');
        expect(result.dsr_request?.type).toBe(1);
      });

      it('should map DSR type correctly', async () => {
        mockDsrRequestsService.create.mockResolvedValue({
          ...mockDsrRequest,
          requestType: 'ERASURE',
        });

        const result = await controller.createDsrRequest({
          account_id: 'account-456',
          type: 3, // ERASURE
          reason: 'Delete my data',
        });

        expect(result.dsr_request?.type).toBe(3);
      });
    });

    describe('getDsrRequest', () => {
      it('should return DSR request when found', async () => {
        mockDsrRequestsService.findOne.mockResolvedValue(mockDsrRequest);

        const result = await controller.getDsrRequest({
          id: 'dsr-123',
        });

        expect(result.dsr_request).toBeDefined();
        expect(result.dsr_request?.id).toBe('dsr-123');
      });

      it('should return undefined when DSR not found', async () => {
        mockDsrRequestsService.findOne.mockRejectedValue(new NotFoundException('DSR not found'));

        const result = await controller.getDsrRequest({
          id: 'invalid-id',
        });

        expect(result.dsr_request).toBeUndefined();
      });
    });

    describe('getDsrDeadline', () => {
      it('should calculate deadline based on law requirements', async () => {
        mockDsrRequestsService.findOne.mockResolvedValue(mockDsrRequest);
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.getDsrDeadline({
          dsr_id: 'dsr-123',
          country_code: 'DE',
        });

        expect(result.deadline).toBeDefined();
        expect(result.deadline?.days_remaining).toBeGreaterThanOrEqual(0);
      });

      it('should return undefined when DSR not found', async () => {
        mockDsrRequestsService.findOne.mockRejectedValue(new NotFoundException('DSR not found'));

        const result = await controller.getDsrDeadline({
          dsr_id: 'invalid-id',
          country_code: 'DE',
        });

        expect(result.deadline).toBeUndefined();
      });

      it('should detect overdue DSR requests', async () => {
        const oldDsr = {
          ...mockDsrRequest,
          requestedAt: new Date('2020-01-01'),
          createdAt: new Date('2020-01-01'),
        };
        mockDsrRequestsService.findOne.mockResolvedValue(oldDsr);
        mockLawRegistryService.findAll.mockResolvedValue([mockLaw]);

        const result = await controller.getDsrDeadline({
          dsr_id: 'dsr-123',
          country_code: 'DE',
        });

        expect(result.deadline?.is_overdue).toBe(true);
      });

      it('should use default deadline when no laws found', async () => {
        mockDsrRequestsService.findOne.mockResolvedValue(mockDsrRequest);
        mockLawRegistryService.findAll.mockResolvedValue([]);

        const result = await controller.getDsrDeadline({
          dsr_id: 'dsr-123',
          country_code: 'XX',
        });

        // Default is 30 days (GDPR standard)
        expect(result.deadline).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap unknown errors in RpcException with INTERNAL code', async () => {
      mockConsentsService.getConsentsForAccount.mockRejectedValue(new Error('Unknown error'));

      await expect(
        controller.checkConsents({
          account_id: 'account-456',
          country_code: 'DE',
          required_types: [],
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should wrap NotFoundException in RpcException with NOT_FOUND code', async () => {
      mockLegalDocumentsService.findAll.mockRejectedValue(new NotFoundException('Not found'));

      await expect(
        controller.listDocuments({
          type: 1,
          language_code: 'en',
          include_expired: false,
          page_size: 10,
          page_token: '',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should pass through existing RpcException', async () => {
      const rpcError = new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Access denied',
      });
      mockConsentsService.getConsentsForAccount.mockRejectedValue(rpcError);

      await expect(
        controller.checkConsents({
          account_id: 'account-456',
          country_code: 'DE',
          required_types: [],
        }),
      ).rejects.toThrow(rpcError);
    });
  });

  describe('Law Requirement Defaults', () => {
    it('should return correct defaults for CCPA', async () => {
      const ccpaLaw = { ...mockLaw, code: 'CCPA', countryCode: 'US' };
      mockLawRegistryService.findAll.mockResolvedValue([ccpaLaw]);

      const result = await controller.getLawRequirements({
        country_code: 'US',
      });

      expect(result.requirements?.dsr_deadline_days).toBe(45);
      expect(result.requirements?.allows_soft_opt_out).toBe(true);
    });

    it('should return correct defaults for PIPA (Korea)', async () => {
      const pipaLaw = { ...mockLaw, code: 'PIPA', countryCode: 'KR' };
      mockLawRegistryService.findAll.mockResolvedValue([pipaLaw]);

      const result = await controller.getLawRequirements({
        country_code: 'KR',
      });

      expect(result.requirements?.minimum_age).toBe(14);
      expect(result.requirements?.parental_consent_age).toBe(14);
    });
  });

  describe('Proto Timestamp Conversion', () => {
    it('should convert Date to proto timestamp correctly', async () => {
      mockConsentsService.getConsentsForAccount.mockResolvedValue([mockConsent]);
      mockLawRegistryService.findAll.mockResolvedValue([]);

      const result = await controller.checkConsents({
        account_id: 'account-456',
        country_code: 'XX',
        required_types: [],
      });

      const consent = result.active_consents[0];
      expect(consent.agreed_at).toBeDefined();
      expect(consent.agreed_at?.seconds).toBeGreaterThan(0);
    });
  });
});
