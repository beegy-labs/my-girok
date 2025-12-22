import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { ConsentType, LegalDocumentType } from '.prisma/auth-client';
import { Request } from 'express';

describe('LegalController', () => {
  let controller: LegalController;

  const mockLegalService = {
    getConsentRequirements: jest.fn(),
    getDocument: jest.fn(),
    getDocumentById: jest.fn(),
    getUserConsents: jest.fn(),
    createConsents: jest.fn(),
    updateConsent: jest.fn(),
    hasRequiredConsents: jest.fn(),
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

  const mockRequest = {
    ip: '192.168.1.1',
    socket: { remoteAddress: '192.168.1.1' },
    headers: { 'user-agent': 'Mozilla/5.0' },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [{ provide: LegalService, useValue: mockLegalService }],
    }).compile();

    controller = module.get<LegalController>(LegalController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConsentRequirements', () => {
    it('should return consent requirements for specified locale', async () => {
      // Arrange
      const mockRequirements = {
        region: 'KR',
        law: 'PIPA (개인정보보호법)',
        nightTimePushRestriction: { start: 21, end: 8 },
        requirements: [
          { type: ConsentType.TERMS_OF_SERVICE, required: true },
          { type: ConsentType.PRIVACY_POLICY, required: true },
        ],
      };
      mockLegalService.getConsentRequirements.mockResolvedValue(mockRequirements);

      // Act
      const result = await controller.getConsentRequirements('ko');

      // Assert
      expect(result).toEqual(mockRequirements);
      expect(mockLegalService.getConsentRequirements).toHaveBeenCalledWith('ko');
    });

    it('should default to ko locale when not provided', async () => {
      // Arrange
      mockLegalService.getConsentRequirements.mockResolvedValue({});

      // Act
      await controller.getConsentRequirements(undefined);

      // Assert
      expect(mockLegalService.getConsentRequirements).toHaveBeenCalledWith('ko');
    });

    it('should return EU policy for de-DE locale', async () => {
      // Arrange
      const mockEURequirements = {
        region: 'EU',
        law: 'GDPR',
        nightTimePushRestriction: { start: 22, end: 7 },
        requirements: [],
      };
      mockLegalService.getConsentRequirements.mockResolvedValue(mockEURequirements);

      // Act
      const result = await controller.getConsentRequirements('de-DE');

      // Assert
      expect(result.region).toBe('EU');
      expect(mockLegalService.getConsentRequirements).toHaveBeenCalledWith('de-DE');
    });
  });

  describe('getDocument', () => {
    it('should return document for valid type and locale', async () => {
      // Arrange
      mockLegalService.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await controller.getDocument(LegalDocumentType.TERMS_OF_SERVICE, {
        locale: 'ko',
      });

      // Assert
      expect(result).toEqual(mockDocument);
      expect(mockLegalService.getDocument).toHaveBeenCalledWith(
        LegalDocumentType.TERMS_OF_SERVICE,
        'ko',
      );
    });

    it('should use default locale from DTO when not specified', async () => {
      // Arrange
      mockLegalService.getDocument.mockResolvedValue(mockDocument);

      // Act
      await controller.getDocument(LegalDocumentType.PRIVACY_POLICY, {});

      // Assert
      expect(mockLegalService.getDocument).toHaveBeenCalledWith(
        LegalDocumentType.PRIVACY_POLICY,
        undefined,
      );
    });
  });

  describe('getDocumentById', () => {
    it('should return document for valid UUID', async () => {
      // Arrange
      mockLegalService.getDocumentById.mockResolvedValue(mockDocument);

      // Act
      const result = await controller.getDocumentById('550e8400-e29b-41d4-a716-446655440000');

      // Assert
      expect(result).toEqual(mockDocument);
      expect(mockLegalService.getDocumentById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });

    it('should throw NotFoundException for non-existent document', async () => {
      // Arrange
      mockLegalService.getDocumentById.mockRejectedValue(
        new NotFoundException('Document not found'),
      );

      // Act & Assert
      await expect(
        controller.getDocumentById('550e8400-e29b-41d4-a716-446655440000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserConsents', () => {
    it('should return user consents for authenticated user', async () => {
      // Arrange
      const mockConsents = [mockConsent];
      mockLegalService.getUserConsents.mockResolvedValue(mockConsents);

      // Act
      const result = await controller.getUserConsents({ id: 'user-123' });

      // Assert
      expect(result).toEqual(mockConsents);
      expect(mockLegalService.getUserConsents).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no consents', async () => {
      // Arrange
      mockLegalService.getUserConsents.mockResolvedValue([]);

      // Act
      const result = await controller.getUserConsents({ id: 'user-456' });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('createConsents', () => {
    it('should create consents with audit trail', async () => {
      // Arrange
      const dto = {
        consents: [
          { type: ConsentType.TERMS_OF_SERVICE, agreed: true, documentId: 'doc-123' },
          { type: ConsentType.PRIVACY_POLICY, agreed: true, documentId: 'doc-456' },
        ],
      };
      const createdConsents = [
        { ...mockConsent, consentType: ConsentType.TERMS_OF_SERVICE },
        { ...mockConsent, id: 'consent-456', consentType: ConsentType.PRIVACY_POLICY },
      ];
      mockLegalService.createConsents.mockResolvedValue(createdConsents);

      // Act
      const result = await controller.createConsents({ id: 'user-123' }, dto, mockRequest);

      // Assert
      expect(result).toEqual(createdConsents);
      expect(mockLegalService.createConsents).toHaveBeenCalledWith(
        'user-123',
        dto.consents,
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });

    it('should extract IP from socket when req.ip is undefined', async () => {
      // Arrange
      const requestWithoutIp = {
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' },
        headers: { 'user-agent': 'Test Agent' },
      } as unknown as Request;
      const dto = { consents: [] };
      mockLegalService.createConsents.mockResolvedValue([]);

      // Act
      await controller.createConsents({ id: 'user-123' }, dto, requestWithoutIp);

      // Assert
      expect(mockLegalService.createConsents).toHaveBeenCalledWith(
        'user-123',
        [],
        '10.0.0.1',
        'Test Agent',
      );
    });
  });

  describe('updateConsent', () => {
    it('should update optional consent to withdraw', async () => {
      // Arrange
      const updatedConsent = {
        ...mockConsent,
        consentType: ConsentType.MARKETING_EMAIL,
        withdrawnAt: new Date(),
      };
      mockLegalService.updateConsent.mockResolvedValue(updatedConsent);

      // Act
      const result = await controller.updateConsent(
        { id: 'user-123' },
        ConsentType.MARKETING_EMAIL,
        'ko',
        { type: ConsentType.MARKETING_EMAIL, agreed: false },
        mockRequest,
      );

      // Assert
      expect(result?.withdrawnAt).toBeDefined();
      expect(mockLegalService.updateConsent).toHaveBeenCalledWith(
        'user-123',
        ConsentType.MARKETING_EMAIL,
        false,
        'ko',
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });

    it('should throw BadRequestException when withdrawing required consent', async () => {
      // Arrange
      mockLegalService.updateConsent.mockRejectedValue(
        new BadRequestException('Cannot withdraw required consent'),
      );

      // Act & Assert
      await expect(
        controller.updateConsent(
          { id: 'user-123' },
          ConsentType.TERMS_OF_SERVICE,
          'ko',
          { type: ConsentType.TERMS_OF_SERVICE, agreed: false },
          mockRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default to ko locale when not provided', async () => {
      // Arrange
      mockLegalService.updateConsent.mockResolvedValue(mockConsent);

      // Act
      await controller.updateConsent(
        { id: 'user-123' },
        ConsentType.MARKETING_EMAIL,
        undefined,
        { type: ConsentType.MARKETING_EMAIL, agreed: true },
        mockRequest,
      );

      // Assert
      expect(mockLegalService.updateConsent).toHaveBeenCalledWith(
        'user-123',
        ConsentType.MARKETING_EMAIL,
        true,
        'ko',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('checkRequiredConsents', () => {
    it('should return hasAllRequired: true when user has all required consents', async () => {
      // Arrange
      mockLegalService.hasRequiredConsents.mockResolvedValue(true);

      // Act
      const result = await controller.checkRequiredConsents({ id: 'user-123' }, 'ko');

      // Assert
      expect(result).toEqual({ hasAllRequired: true });
      expect(mockLegalService.hasRequiredConsents).toHaveBeenCalledWith('user-123', 'ko');
    });

    it('should return hasAllRequired: false when user is missing consents', async () => {
      // Arrange
      mockLegalService.hasRequiredConsents.mockResolvedValue(false);

      // Act
      const result = await controller.checkRequiredConsents({ id: 'user-123' }, 'ko');

      // Assert
      expect(result).toEqual({ hasAllRequired: false });
    });

    it('should default to ko locale when not provided', async () => {
      // Arrange
      mockLegalService.hasRequiredConsents.mockResolvedValue(true);

      // Act
      await controller.checkRequiredConsents({ id: 'user-123' }, undefined);

      // Assert
      expect(mockLegalService.hasRequiredConsents).toHaveBeenCalledWith('user-123', 'ko');
    });

    it('should check EU region requirements for de-DE locale', async () => {
      // Arrange
      mockLegalService.hasRequiredConsents.mockResolvedValue(true);

      // Act
      await controller.checkRequiredConsents({ id: 'user-123' }, 'de-DE');

      // Assert
      expect(mockLegalService.hasRequiredConsents).toHaveBeenCalledWith('user-123', 'de-DE');
    });
  });
});
