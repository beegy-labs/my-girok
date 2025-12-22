import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LegalService } from './legal.service';
import { PrismaService } from '../database/prisma.service';
import { ConsentType, LegalDocumentType } from '.prisma/auth-client';

describe('LegalService', () => {
  let service: LegalService;

  const mockPrismaService = {
    legalDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userConsent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDocument = {
    id: 'doc-123',
    type: LegalDocumentType.TERMS_OF_SERVICE,
    version: '1.0.0',
    locale: 'ko',
    title: 'Terms of Service',
    content: 'Full content here...',
    summary: 'Summary text',
    effectiveDate: new Date('2025-01-01'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConsent = {
    id: 'consent-123',
    userId: 'user-123',
    consentType: ConsentType.TERMS_OF_SERVICE,
    documentId: 'doc-123',
    documentVersion: '1.0.0',
    agreed: true,
    agreedAt: new Date(),
    withdrawnAt: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegalService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<LegalService>(LegalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConsentRequirements', () => {
    it('should return KR policy for ko locale', async () => {
      // Arrange
      mockPrismaService.legalDocument.findMany.mockResolvedValue([
        { ...mockDocument, type: LegalDocumentType.TERMS_OF_SERVICE },
        { ...mockDocument, id: 'doc-456', type: LegalDocumentType.PRIVACY_POLICY },
      ]);

      // Act
      const result = await service.getConsentRequirements('ko');

      // Assert
      expect(result.region).toBe('KR');
      expect(result.law).toBe('PIPA (개인정보보호법)');
      expect(result.nightTimePushRestriction).toEqual({ start: 21, end: 8 });
      expect(result.requirements.length).toBeGreaterThan(0);
      expect(mockPrismaService.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locale: 'ko', isActive: true }),
        }),
      );
    });

    it('should return EU policy for de-DE locale', async () => {
      // Arrange
      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getConsentRequirements('de-DE');

      // Assert
      expect(result.region).toBe('EU');
      expect(result.law).toBe('GDPR');
      expect(result.nightTimePushRestriction).toEqual({ start: 22, end: 7 });
    });

    it('should return JP policy for ja locale', async () => {
      // Arrange
      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getConsentRequirements('ja');

      // Assert
      expect(result.region).toBe('JP');
      expect(result.law).toBe('APPI (個人情報保護法)');
    });

    it('should return US policy for en locale', async () => {
      // Arrange
      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getConsentRequirements('en');

      // Assert
      expect(result.region).toBe('US');
      expect(result.law).toBe('CCPA/CPRA');
    });

    it('should return DEFAULT policy for unknown locale', async () => {
      // Arrange
      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getConsentRequirements('unknown');

      // Assert
      expect(result.region).toBe('DEFAULT');
      expect(result.law).toBe('Default (GDPR-aligned)');
    });

    it('should attach documents to requirements using Map lookup', async () => {
      // Arrange
      const tosDoc = { ...mockDocument, id: 'tos-123', type: LegalDocumentType.TERMS_OF_SERVICE };
      const privacyDoc = {
        ...mockDocument,
        id: 'privacy-123',
        type: LegalDocumentType.PRIVACY_POLICY,
      };
      mockPrismaService.legalDocument.findMany.mockResolvedValue([tosDoc, privacyDoc]);

      // Act
      const result = await service.getConsentRequirements('ko');

      // Assert
      const tosRequirement = result.requirements.find(
        (r) => r.type === ConsentType.TERMS_OF_SERVICE,
      );
      const privacyRequirement = result.requirements.find(
        (r) => r.type === ConsentType.PRIVACY_POLICY,
      );

      expect(tosRequirement?.document?.id).toBe('tos-123');
      expect(privacyRequirement?.document?.id).toBe('privacy-123');
    });

    it('should return null document when not found', async () => {
      // Arrange
      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getConsentRequirements('ko');

      // Assert
      const tosRequirement = result.requirements.find(
        (r) => r.type === ConsentType.TERMS_OF_SERVICE,
      );
      expect(tosRequirement?.document).toBeNull();
    });
  });

  describe('getDocument', () => {
    it('should return document for valid type and locale', async () => {
      // Arrange
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(mockDocument);

      // Act
      const result = await service.getDocument(LegalDocumentType.TERMS_OF_SERVICE, 'ko');

      // Assert
      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.legalDocument.findFirst).toHaveBeenCalledWith({
        where: { type: LegalDocumentType.TERMS_OF_SERVICE, locale: 'ko', isActive: true },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should fallback to Korean when locale not found', async () => {
      // Arrange
      mockPrismaService.legalDocument.findFirst
        .mockResolvedValueOnce(null) // First call for 'en'
        .mockResolvedValueOnce(mockDocument); // Second call for 'ko'

      // Act
      const result = await service.getDocument(LegalDocumentType.TERMS_OF_SERVICE, 'en');

      // Assert
      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.legalDocument.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when document not found even in Korean', async () => {
      // Arrange
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getDocument(LegalDocumentType.TERMS_OF_SERVICE, 'ko')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDocumentById', () => {
    it('should return document for valid UUID', async () => {
      // Arrange
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(mockDocument);

      // Act
      const result = await service.getDocumentById('doc-123');

      // Assert
      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.legalDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
    });

    it('should throw NotFoundException for non-existent document', async () => {
      // Arrange
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getDocumentById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createConsents', () => {
    it('should create consents with transaction', async () => {
      // Arrange
      const consents = [
        { type: ConsentType.TERMS_OF_SERVICE, agreed: true, documentId: 'doc-123' },
        { type: ConsentType.PRIVACY_POLICY, agreed: true, documentId: 'doc-456' },
      ];

      mockPrismaService.legalDocument.findMany.mockResolvedValue([
        { id: 'doc-123', version: '1.0.0' },
        { id: 'doc-456', version: '2.0.0' },
      ]);

      const createdConsents = consents.map((c, i) => ({
        ...mockConsent,
        id: `consent-${i}`,
        consentType: c.type,
        documentId: c.documentId,
      }));

      mockPrismaService.$transaction.mockResolvedValue(createdConsents);

      // Act
      const result = await service.createConsents(
        'user-123',
        consents,
        '192.168.1.1',
        'Mozilla/5.0',
      );

      // Assert
      expect(result).toEqual(createdConsents);
      expect(mockPrismaService.legalDocument.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['doc-123', 'doc-456'] } },
        select: { id: true, version: true },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle consents without documentId', async () => {
      // Arrange
      const consents = [{ type: ConsentType.MARKETING_EMAIL, agreed: false }];

      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockResolvedValue([
        { ...mockConsent, consentType: ConsentType.MARKETING_EMAIL, documentId: null },
      ]);

      // Act
      const result = await service.createConsents('user-123', consents);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.legalDocument.findMany).not.toHaveBeenCalled(); // No documentIds to fetch
    });
  });

  describe('getUserConsents', () => {
    it('should return active consents for user', async () => {
      // Arrange
      const mockConsents = [
        { ...mockConsent, document: mockDocument },
        {
          ...mockConsent,
          id: 'consent-456',
          consentType: ConsentType.MARKETING_EMAIL,
          document: null,
        },
      ];
      mockPrismaService.userConsent.findMany.mockResolvedValue(mockConsents);

      // Act
      const result = await service.getUserConsents('user-123');

      // Assert
      expect(result).toEqual(mockConsents);
      expect(mockPrismaService.userConsent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', withdrawnAt: null },
        include: expect.any(Object),
        orderBy: { agreedAt: 'desc' },
      });
    });
  });

  describe('updateConsent', () => {
    it('should throw BadRequestException when withdrawing required consent', async () => {
      // Act & Assert
      await expect(
        service.updateConsent('user-123', ConsentType.TERMS_OF_SERVICE, false, 'ko'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should withdraw optional consent', async () => {
      // Arrange
      const existingConsent = { ...mockConsent, consentType: ConsentType.MARKETING_EMAIL };
      mockPrismaService.userConsent.findFirst.mockResolvedValue(existingConsent);
      mockPrismaService.userConsent.update.mockResolvedValue({
        ...existingConsent,
        withdrawnAt: new Date(),
      });

      // Act
      const result = await service.updateConsent(
        'user-123',
        ConsentType.MARKETING_EMAIL,
        false,
        'ko',
      );

      // Assert
      expect(result?.withdrawnAt).toBeDefined();
      expect(mockPrismaService.userConsent.update).toHaveBeenCalledWith({
        where: { id: existingConsent.id },
        data: { withdrawnAt: expect.any(Date) },
      });
    });

    it('should create new consent when not exists', async () => {
      // Arrange
      mockPrismaService.userConsent.findFirst.mockResolvedValue(null);
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(mockDocument);
      mockPrismaService.userConsent.create.mockResolvedValue({
        ...mockConsent,
        consentType: ConsentType.MARKETING_EMAIL,
      });

      // Act
      const result = await service.updateConsent(
        'user-123',
        ConsentType.MARKETING_EMAIL,
        true,
        'ko',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      // Assert
      expect(result?.agreed).toBe(true);
      expect(mockPrismaService.userConsent.create).toHaveBeenCalled();
    });

    it('should return existing consent when already agreed', async () => {
      // Arrange
      const existingConsent = { ...mockConsent, consentType: ConsentType.MARKETING_EMAIL };
      mockPrismaService.userConsent.findFirst.mockResolvedValue(existingConsent);

      // Act
      const result = await service.updateConsent(
        'user-123',
        ConsentType.MARKETING_EMAIL,
        true,
        'ko',
      );

      // Assert
      expect(result).toEqual(existingConsent);
      expect(mockPrismaService.userConsent.update).not.toHaveBeenCalled();
      expect(mockPrismaService.userConsent.create).not.toHaveBeenCalled();
    });
  });

  describe('hasRequiredConsents', () => {
    it('should return true when user has all required consents', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([
        { ...mockConsent, consentType: ConsentType.TERMS_OF_SERVICE },
        { ...mockConsent, consentType: ConsentType.PRIVACY_POLICY },
      ]);

      // Act
      const result = await service.hasRequiredConsents('user-123', 'ko');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user is missing required consents', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([
        { ...mockConsent, consentType: ConsentType.TERMS_OF_SERVICE },
        // Missing PRIVACY_POLICY
      ]);

      // Act
      const result = await service.hasRequiredConsents('user-123', 'ko');

      // Assert
      expect(result).toBe(false);
    });

    it('should check region-specific required consents', async () => {
      // Arrange
      mockPrismaService.userConsent.findMany.mockResolvedValue([]);

      // Act
      await service.hasRequiredConsents('user-123', 'de-DE'); // EU region

      // Assert
      expect(mockPrismaService.userConsent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          consentType: { in: [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY] },
          agreed: true,
          withdrawnAt: null,
        },
      });
    });
  });
});
