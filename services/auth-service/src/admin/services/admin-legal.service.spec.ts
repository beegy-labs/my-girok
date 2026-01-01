import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminLegalService } from './admin-legal.service';
import { PrismaService } from '../../database/prisma.service';
import { ID } from '@my-girok/nest-common';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  DocumentListQuery,
  ConsentListQuery,
  LegalDocumentType,
  ConsentType,
} from '../dto/admin-legal.dto';
import { AdminPayload } from '../types/admin.types';

// Mock ID.generate to return predictable UUIDs
jest.mock('@my-girok/nest-common', () => ({
  ID: {
    generate: jest.fn(),
  },
}));

describe('AdminLegalService', () => {
  let service: AdminLegalService;
  let mockPrismaService: {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
  };

  const mockAdmin: AdminPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@example.com',
    name: 'Super Admin',
    type: 'ADMIN_ACCESS',
    accountMode: 'SERVICE',
    scope: 'SYSTEM',
    tenantId: null,
    roleId: '550e8400-e29b-41d4-a716-446655440100',
    roleName: 'SUPER_ADMIN',
    level: 0,
    permissions: ['*'],
    services: {},
  };

  const mockDocumentRow = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'TERMS_OF_SERVICE',
    version: '1.0.0',
    locale: 'ko',
    title: 'Terms of Service',
    content: '# Terms of Service\n\nThis is the content...',
    summary: 'Our terms of service',
    effectiveDate: new Date('2024-01-01'),
    isActive: true,
    serviceId: null,
    countryCode: 'KR',
    createdBy: mockAdmin.sub,
    updatedBy: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockConsentRow = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    userId: '550e8400-e29b-41d4-a716-446655440020',
    consentType: 'TERMS_OF_SERVICE',
    documentId: mockDocumentRow.id,
    documentVersion: '1.0.0',
    agreed: true,
    agreedAt: new Date('2024-01-01'),
    withdrawnAt: null,
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01'),
    userEmail: 'user@example.com',
    userName: 'Test User',
    userRegion: 'KR',
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminLegalService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<AdminLegalService>(AdminLegalService);

    // Reset ID mock
    (ID.generate as jest.Mock).mockReturnValue('550e8400-e29b-41d4-a716-446655440099');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // LEGAL DOCUMENTS - listDocuments
  // ============================================================

  describe('listDocuments', () => {
    it('should return paginated list of documents with default pagination', async () => {
      // Arrange
      const query: DocumentListQuery = {};
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }]) // count query
        .mockResolvedValueOnce([mockDocumentRow]); // items query

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result).toEqual({
        items: [mockDocumentRow],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should apply custom pagination', async () => {
      // Arrange
      const query: DocumentListQuery = { page: 2, limit: 10 };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(25) }])
        .mockResolvedValueOnce([mockDocumentRow]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by document type', async () => {
      // Arrange
      const query: DocumentListQuery = { type: 'PRIVACY_POLICY' as LegalDocumentType };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(5) }])
        .mockResolvedValueOnce([{ ...mockDocumentRow, type: 'PRIVACY_POLICY' }]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items[0].type).toBe('PRIVACY_POLICY');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should filter by locale', async () => {
      // Arrange
      const query: DocumentListQuery = { locale: 'en' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(3) }])
        .mockResolvedValueOnce([{ ...mockDocumentRow, locale: 'en' }]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items[0].locale).toBe('en');
    });

    it('should filter by isActive status', async () => {
      // Arrange
      const query: DocumentListQuery = { isActive: false };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(2) }])
        .mockResolvedValueOnce([{ ...mockDocumentRow, isActive: false }]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items[0].isActive).toBe(false);
    });

    it('should filter by serviceId', async () => {
      // Arrange
      const serviceId = '550e8400-e29b-41d4-a716-446655440050';
      const query: DocumentListQuery = { serviceId };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([{ ...mockDocumentRow, serviceId }]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items[0].serviceId).toBe(serviceId);
    });

    it('should filter by countryCode', async () => {
      // Arrange
      const query: DocumentListQuery = { countryCode: 'US' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([{ ...mockDocumentRow, countryCode: 'US' }]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items[0].countryCode).toBe('US');
    });

    it('should apply multiple filters simultaneously', async () => {
      // Arrange
      const query: DocumentListQuery = {
        type: 'TERMS_OF_SERVICE' as LegalDocumentType,
        locale: 'ko',
        isActive: true,
        countryCode: 'KR',
        page: 1,
        limit: 10,
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockDocumentRow]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('TERMS_OF_SERVICE');
      expect(result.items[0].locale).toBe('ko');
      expect(result.items[0].isActive).toBe(true);
    });

    it('should return empty list when no documents match', async () => {
      // Arrange
      const query: DocumentListQuery = { type: 'MARKETING_POLICY' as LegalDocumentType };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly for partial pages', async () => {
      // Arrange
      const query: DocumentListQuery = { limit: 10 };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(15) }])
        .mockResolvedValueOnce([mockDocumentRow]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.totalPages).toBe(2); // 15 / 10 = 1.5 -> ceil -> 2
    });
  });

  // ============================================================
  // LEGAL DOCUMENTS - getDocumentById
  // ============================================================

  describe('getDocumentById', () => {
    it('should return document by id', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockDocumentRow]);

      // Act
      const result = await service.getDocumentById(mockDocumentRow.id);

      // Assert
      expect(result).toEqual(mockDocumentRow);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when document not found', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getDocumentById('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.getDocumentById('non-existent-id')).rejects.toThrow(
        'Document not found',
      );
    });
  });

  // ============================================================
  // LEGAL DOCUMENTS - createDocument
  // ============================================================

  describe('createDocument', () => {
    const createDto: CreateLegalDocumentDto = {
      type: 'TERMS_OF_SERVICE' as LegalDocumentType,
      locale: 'ko',
      version: '1.0.0',
      title: 'Terms of Service',
      content: '# Terms of Service\n\nThis is the content...',
      effectiveDate: '2024-01-01',
      countryCode: 'KR',
    };

    it('should create a new legal document', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([]) // Check for duplicates - none found
        .mockResolvedValueOnce([mockDocumentRow]); // Insert and return
      mockPrismaService.$executeRaw.mockResolvedValue(1); // Audit log

      // Act
      const result = await service.createDocument(createDto, mockAdmin);

      // Assert
      expect(result).toEqual(mockDocumentRow);
      expect(ID.generate).toHaveBeenCalledTimes(2); // For document ID and audit log ID
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1); // Audit log
    });

    it('should create document with optional summary', async () => {
      // Arrange
      const dtoWithSummary: CreateLegalDocumentDto = {
        ...createDto,
        summary: 'This is a summary of our terms',
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockDocumentRow, summary: dtoWithSummary.summary }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.createDocument(dtoWithSummary, mockAdmin);

      // Assert
      expect(result.summary).toBe('This is a summary of our terms');
    });

    it('should create document with serviceId', async () => {
      // Arrange
      const serviceId = '550e8400-e29b-41d4-a716-446655440050';
      const dtoWithService: CreateLegalDocumentDto = {
        ...createDto,
        serviceId,
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockDocumentRow, serviceId }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.createDocument(dtoWithService, mockAdmin);

      // Assert
      expect(result.serviceId).toBe(serviceId);
    });

    it('should throw ConflictException when document with same type+version+locale exists', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'existing-id' }]);

      // Act & Assert
      await expect(service.createDocument(createDto, mockAdmin)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with correct error message for existing document', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'existing-id' }]);

      // Act & Assert
      await expect(service.createDocument(createDto, mockAdmin)).rejects.toThrow(
        'TERMS_OF_SERVICE v1.0.0 (ko) country:KR already exists',
      );
    });

    it('should throw ConflictException with serviceId info when duplicate exists', async () => {
      // Arrange
      const dtoWithService: CreateLegalDocumentDto = {
        ...createDto,
        serviceId: '550e8400-e29b-41d4-a716-446655440050',
        countryCode: undefined,
      };
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'existing-id' }]);

      // Act & Assert
      await expect(service.createDocument(dtoWithService, mockAdmin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException message without service/country when none provided', async () => {
      // Arrange
      const dtoWithoutOptional: CreateLegalDocumentDto = {
        type: 'PRIVACY_POLICY' as LegalDocumentType,
        locale: 'en',
        version: '2.0.0',
        title: 'Privacy Policy',
        content: '# Privacy Policy',
        effectiveDate: '2024-06-01',
      };
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'existing-id' }]);

      // Act & Assert
      await expect(service.createDocument(dtoWithoutOptional, mockAdmin)).rejects.toThrow(
        'PRIVACY_POLICY v2.0.0 (en) already exists',
      );
    });

    it('should log audit entry after creating document', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockDocumentRow]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.createDocument(createDto, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
      expect(ID.generate).toHaveBeenCalledTimes(2); // Once for doc, once for audit
    });
  });

  // ============================================================
  // LEGAL DOCUMENTS - updateDocument
  // ============================================================

  describe('updateDocument', () => {
    const updateDto: UpdateLegalDocumentDto = {
      title: 'Updated Terms of Service',
      content: '# Updated Terms\n\nNew content here...',
    };

    it('should update document title and content', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockDocumentRow]) // getDocumentById
        .mockResolvedValueOnce([{ ...mockDocumentRow, ...updateDto }]); // update
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateDocument(mockDocumentRow.id, updateDto, mockAdmin);

      // Assert
      expect(result.title).toBe('Updated Terms of Service');
      expect(result.content).toBe('# Updated Terms\n\nNew content here...');
    });

    it('should update document summary', async () => {
      // Arrange
      const dto: UpdateLegalDocumentDto = { summary: 'New summary' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockDocumentRow])
        .mockResolvedValueOnce([{ ...mockDocumentRow, summary: 'New summary' }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateDocument(mockDocumentRow.id, dto, mockAdmin);

      // Assert
      expect(result.summary).toBe('New summary');
    });

    it('should update effective date', async () => {
      // Arrange
      const newDate = '2024-06-01';
      const dto: UpdateLegalDocumentDto = { effectiveDate: newDate };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockDocumentRow])
        .mockResolvedValueOnce([{ ...mockDocumentRow, effectiveDate: new Date(newDate) }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateDocument(mockDocumentRow.id, dto, mockAdmin);

      // Assert
      expect(result.effectiveDate).toEqual(new Date(newDate));
    });

    it('should deactivate document', async () => {
      // Arrange
      const dto: UpdateLegalDocumentDto = { isActive: false };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockDocumentRow])
        .mockResolvedValueOnce([{ ...mockDocumentRow, isActive: false }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateDocument(mockDocumentRow.id, dto, mockAdmin);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.updateDocument('non-existent-id', updateDto, mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log audit entry after updating document', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockDocumentRow])
        .mockResolvedValueOnce([{ ...mockDocumentRow, ...updateDto }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.updateDocument(mockDocumentRow.id, updateDto, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should use COALESCE pattern to preserve unchanged fields', async () => {
      // Arrange - only updating title, keeping other fields
      const dto: UpdateLegalDocumentDto = { title: 'New Title Only' };
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockDocumentRow]).mockResolvedValueOnce([
        {
          ...mockDocumentRow,
          title: 'New Title Only',
          content: mockDocumentRow.content, // unchanged
          summary: mockDocumentRow.summary, // unchanged
        },
      ]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updateDocument(mockDocumentRow.id, dto, mockAdmin);

      // Assert
      expect(result.title).toBe('New Title Only');
      expect(result.content).toBe(mockDocumentRow.content);
      expect(result.summary).toBe(mockDocumentRow.summary);
    });
  });

  // ============================================================
  // LEGAL DOCUMENTS - deleteDocument
  // ============================================================

  describe('deleteDocument', () => {
    it('should soft delete document by setting isActive to false', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockDocumentRow]);
      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(1) // soft delete
        .mockResolvedValueOnce(1); // audit log

      // Act
      await service.deleteDocument(mockDocumentRow.id, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.deleteDocument('non-existent-id', mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log audit entry after deleting document', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockDocumentRow]);
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      // Act
      await service.deleteDocument(mockDocumentRow.id, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
      expect(ID.generate).toHaveBeenCalledTimes(1); // For audit log ID
    });
  });

  // ============================================================
  // CONSENTS - listConsents
  // ============================================================

  describe('listConsents', () => {
    it('should return paginated list of consents with default pagination', async () => {
      // Arrange
      const query: ConsentListQuery = {};
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(mockConsentRow.id);
      expect(result.items[0].userId).toBe(mockConsentRow.userId);
      expect(result.items[0].user).toEqual({
        id: mockConsentRow.userId,
        email: mockConsentRow.userEmail,
        name: mockConsentRow.userName,
        region: mockConsentRow.userRegion,
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply custom pagination', async () => {
      // Arrange
      const query: ConsentListQuery = { page: 3, limit: 5 };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(50) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.page).toBe(3);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(10);
    });

    it('should filter by consent type', async () => {
      // Arrange
      const query: ConsentListQuery = { consentType: 'MARKETING_EMAIL' as ConsentType };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(10) }])
        .mockResolvedValueOnce([{ ...mockConsentRow, consentType: 'MARKETING_EMAIL' }]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.items[0].consentType).toBe('MARKETING_EMAIL');
    });

    it('should filter by userId', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440020';
      const query: ConsentListQuery = { userId };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(5) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.items[0].userId).toBe(userId);
    });

    it('should filter by agreed status', async () => {
      // Arrange
      const query: ConsentListQuery = { agreed: false };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(3) }])
        .mockResolvedValueOnce([{ ...mockConsentRow, agreed: false }]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.items[0].agreed).toBe(false);
    });

    it('should filter by date range with dateFrom', async () => {
      // Arrange
      const query: ConsentListQuery = { dateFrom: '2024-01-01' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(20) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      await service.listConsents(query);

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should filter by date range with dateTo', async () => {
      // Arrange
      const query: ConsentListQuery = { dateTo: '2024-12-31' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(15) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      await service.listConsents(query);

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should filter by full date range', async () => {
      // Arrange
      const query: ConsentListQuery = {
        dateFrom: '2024-01-01',
        dateTo: '2024-06-30',
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(25) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.total).toBe(25);
    });

    it('should apply multiple filters simultaneously', async () => {
      // Arrange
      const query: ConsentListQuery = {
        consentType: 'TERMS_OF_SERVICE' as ConsentType,
        agreed: true,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: 1,
        limit: 10,
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(8) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(8);
    });

    it('should return empty list when no consents match', async () => {
      // Arrange
      const query: ConsentListQuery = { consentType: 'THIRD_PARTY_SHARING' as ConsentType };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should map consent row to response with user object', async () => {
      // Arrange
      const query: ConsentListQuery = {};
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockConsentRow]);

      // Act
      const result = await service.listConsents(query);

      // Assert
      const consent = result.items[0];
      expect(consent.user).toEqual({
        id: mockConsentRow.userId,
        email: mockConsentRow.userEmail,
        name: mockConsentRow.userName,
        region: mockConsentRow.userRegion,
      });
      expect(consent.documentId).toBe(mockConsentRow.documentId);
      expect(consent.documentVersion).toBe(mockConsentRow.documentVersion);
      expect(consent.ipAddress).toBe(mockConsentRow.ipAddress);
    });

    it('should handle null user name and region', async () => {
      // Arrange
      const consentWithNulls = {
        ...mockConsentRow,
        userName: null,
        userRegion: null,
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([consentWithNulls]);

      // Act
      const result = await service.listConsents({});

      // Assert
      expect(result.items[0].user.name).toBeNull();
      expect(result.items[0].user.region).toBeNull();
    });
  });

  // ============================================================
  // CONSENTS - getConsentStats
  // ============================================================

  describe('getConsentStats', () => {
    it('should return consent statistics by type, region, and recent activity', async () => {
      // Arrange
      const mockByType = [
        {
          type: 'TERMS_OF_SERVICE',
          total: BigInt(1000),
          agreed: BigInt(950),
          withdrawn: BigInt(50),
        },
        {
          type: 'PRIVACY_POLICY',
          total: BigInt(1000),
          agreed: BigInt(900),
          withdrawn: BigInt(100),
        },
      ];
      const mockByRegion = [
        { region: 'KR', total: BigInt(800) },
        { region: 'US', total: BigInt(200) },
      ];
      const mockRecentActivity = [
        { date: new Date('2024-01-01'), agreed: BigInt(100), withdrawn: BigInt(5) },
        { date: new Date('2024-01-02'), agreed: BigInt(95), withdrawn: BigInt(3) },
      ];
      const mockSummary = [
        { totalConsents: BigInt(2000), totalUsers: BigInt(1000), agreedCount: BigInt(1850) },
      ];

      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockByType)
        .mockResolvedValueOnce(mockByRegion)
        .mockResolvedValueOnce(mockRecentActivity)
        .mockResolvedValueOnce(mockSummary);

      // Act
      const result = await service.getConsentStats();

      // Assert
      expect(result.byType).toHaveLength(2);
      expect(result.byType[0]).toEqual({
        type: 'TERMS_OF_SERVICE',
        total: 1000,
        agreed: 950,
        withdrawn: 50,
        rate: 0.95,
      });
      expect(result.byType[1]).toEqual({
        type: 'PRIVACY_POLICY',
        total: 1000,
        agreed: 900,
        withdrawn: 100,
        rate: 0.9,
      });

      expect(result.byRegion).toHaveLength(2);
      expect(result.byRegion[0]).toEqual({ region: 'KR', total: 800 });
      expect(result.byRegion[1]).toEqual({ region: 'US', total: 200 });

      expect(result.recentActivity).toHaveLength(2);
      expect(result.recentActivity[0]).toEqual({
        date: '2024-01-01',
        agreed: 100,
        withdrawn: 5,
      });

      expect(result.summary).toEqual({
        totalConsents: 2000,
        totalUsers: 1000,
        overallAgreementRate: 0.925,
      });
    });

    it('should calculate rate as 0 when total is 0', async () => {
      // Arrange
      const mockByType = [
        { type: 'MARKETING_EMAIL', total: BigInt(0), agreed: BigInt(0), withdrawn: BigInt(0) },
      ];
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockByType)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { totalConsents: BigInt(0), totalUsers: BigInt(0), agreedCount: BigInt(0) },
        ]);

      // Act
      const result = await service.getConsentStats();

      // Assert
      expect(result.byType[0].rate).toBe(0);
      expect(result.summary.overallAgreementRate).toBe(0);
    });

    it('should handle empty stats gracefully', async () => {
      // Arrange
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { totalConsents: BigInt(0), totalUsers: BigInt(0), agreedCount: BigInt(0) },
        ]);

      // Act
      const result = await service.getConsentStats();

      // Assert
      expect(result.byType).toEqual([]);
      expect(result.byRegion).toEqual([]);
      expect(result.recentActivity).toEqual([]);
      expect(result.summary.totalConsents).toBe(0);
      expect(result.summary.totalUsers).toBe(0);
      expect(result.summary.overallAgreementRate).toBe(0);
    });

    it('should format date correctly in recentActivity', async () => {
      // Arrange
      const mockRecentActivity = [
        { date: new Date('2024-06-15T10:30:00Z'), agreed: BigInt(50), withdrawn: BigInt(2) },
      ];
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockRecentActivity)
        .mockResolvedValueOnce([
          { totalConsents: BigInt(50), totalUsers: BigInt(50), agreedCount: BigInt(48) },
        ]);

      // Act
      const result = await service.getConsentStats();

      // Assert
      expect(result.recentActivity[0].date).toBe('2024-06-15');
    });

    it('should convert BigInt values to numbers', async () => {
      // Arrange
      const mockByType = [
        {
          type: 'TERMS_OF_SERVICE',
          total: BigInt(9999999),
          agreed: BigInt(9000000),
          withdrawn: BigInt(999999),
        },
      ];
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockByType)
        .mockResolvedValueOnce([{ region: 'KR', total: BigInt(9999999) }])
        .mockResolvedValueOnce([
          { date: new Date('2024-01-01'), agreed: BigInt(1000), withdrawn: BigInt(100) },
        ])
        .mockResolvedValueOnce([
          {
            totalConsents: BigInt(9999999),
            totalUsers: BigInt(100000),
            agreedCount: BigInt(9000000),
          },
        ]);

      // Act
      const result = await service.getConsentStats();

      // Assert
      expect(typeof result.byType[0].total).toBe('number');
      expect(typeof result.byType[0].agreed).toBe('number');
      expect(typeof result.byType[0].withdrawn).toBe('number');
      expect(typeof result.byType[0].rate).toBe('number');
      expect(typeof result.byRegion[0].total).toBe('number');
      expect(typeof result.recentActivity[0].agreed).toBe('number');
      expect(typeof result.summary.totalConsents).toBe('number');
      expect(typeof result.summary.totalUsers).toBe('number');
      expect(typeof result.summary.overallAgreementRate).toBe('number');
    });
  });

  // ============================================================
  // AUDIT LOGGING (Private method tested indirectly)
  // ============================================================

  describe('audit logging (indirect tests)', () => {
    it('should log create audit with before=null and after=dto', async () => {
      // Arrange
      const createDto: CreateLegalDocumentDto = {
        type: 'TERMS_OF_SERVICE' as LegalDocumentType,
        locale: 'ko',
        version: '1.0.0',
        title: 'Terms',
        content: 'Content',
        effectiveDate: '2024-01-01',
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockDocumentRow]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.createDocument(createDto, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should log update audit with before=existing and after=dto', async () => {
      // Arrange
      const updateDto: UpdateLegalDocumentDto = { title: 'Updated' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockDocumentRow])
        .mockResolvedValueOnce([{ ...mockDocumentRow, title: 'Updated' }]);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Act
      await service.updateDocument(mockDocumentRow.id, updateDto, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should log delete audit with before=existing and after=null', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockDocumentRow]);
      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(1) // soft delete
        .mockResolvedValueOnce(1); // audit log

      // Act
      await service.deleteDocument(mockDocumentRow.id, mockAdmin);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle consent with withdrawn status', async () => {
      // Arrange
      const withdrawnConsent = {
        ...mockConsentRow,
        withdrawnAt: new Date('2024-06-01'),
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([withdrawnConsent]);

      // Act
      const result = await service.listConsents({});

      // Assert
      expect(result.items[0].withdrawnAt).toEqual(new Date('2024-06-01'));
    });

    it('should handle consent without document reference', async () => {
      // Arrange
      const consentWithoutDoc = {
        ...mockConsentRow,
        documentId: null,
        documentVersion: null,
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([consentWithoutDoc]);

      // Act
      const result = await service.listConsents({});

      // Assert
      expect(result.items[0].documentId).toBeNull();
      expect(result.items[0].documentVersion).toBeNull();
    });

    it('should handle consent without IP address', async () => {
      // Arrange
      const consentWithoutIp = {
        ...mockConsentRow,
        ipAddress: null,
      };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([consentWithoutIp]);

      // Act
      const result = await service.listConsents({});

      // Assert
      expect(result.items[0].ipAddress).toBeNull();
    });

    it('should handle document without createdBy and updatedBy', async () => {
      // Arrange
      const docWithoutAuditFields = {
        ...mockDocumentRow,
        createdBy: null,
        updatedBy: null,
      };
      mockPrismaService.$queryRaw.mockResolvedValue([docWithoutAuditFields]);

      // Act
      const result = await service.getDocumentById(mockDocumentRow.id);

      // Assert
      expect(result.createdBy).toBeNull();
      expect(result.updatedBy).toBeNull();
    });

    it('should handle very large page numbers', async () => {
      // Arrange
      const query: DocumentListQuery = { page: 1000, limit: 10 };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(100) }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.listDocuments(query);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.page).toBe(1000);
      expect(result.totalPages).toBe(10);
    });
  });
});
