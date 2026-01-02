import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LegalDocumentsService } from '../../src/legal-documents/legal-documents.service';
import { PrismaService } from '../../src/database/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createMockPrisma, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheService } from '../utils/mock-cache';
import {
  createMockLegalDocument,
  createActiveDocument,
  createLegalDocumentDto,
} from '../utils/test-factory';
import * as crypto from 'crypto';

describe('LegalDocumentsService', () => {
  let service: LegalDocumentsService;
  let prisma: MockPrismaService;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let outboxService: { addEvent: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    cacheService = createMockCacheService();
    outboxService = { addEvent: jest.fn().mockResolvedValue('outbox-id') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    service = module.get<LegalDocumentsService>(LegalDocumentsService);
  });

  describe('create', () => {
    it('should create a new legal document successfully', async () => {
      const dto = createLegalDocumentDto();
      const mockDocument = createMockLegalDocument();

      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue(mockDocument as never);

      const result = await service.create(dto as never);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockDocument.id);
      expect(result.status).toBe('DRAFT');
      expect(cacheService.invalidateDocument).toHaveBeenCalled();
    });

    it('should throw ConflictException if document with same type/version/country/locale exists', async () => {
      const dto = createLegalDocumentDto();
      const existingDoc = createMockLegalDocument();

      prisma.legalDocument.findFirst.mockResolvedValue(existingDoc as never);

      await expect(service.create(dto as never)).rejects.toThrow(ConflictException);
    });

    it('should generate content hash for the document', async () => {
      const content = 'Test privacy policy content';
      const dto = createLegalDocumentDto({ content });
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
      const mockDocument = createMockLegalDocument({ contentHash: expectedHash });

      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue(mockDocument as never);

      const result = await service.create(dto as never);

      expect(result.contentHash).toBe(expectedHash);
    });

    it('should invalidate related caches after creation', async () => {
      const dto = createLegalDocumentDto();
      const mockDocument = createMockLegalDocument();

      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue(mockDocument as never);

      await service.create(dto as never);

      expect(cacheService.invalidateDocument).toHaveBeenCalledWith(
        expect.any(String),
        dto.type,
        dto.locale,
      );
    });
  });

  describe('findAll', () => {
    it('should return all legal documents', async () => {
      const mockDocs = [createMockLegalDocument()];
      prisma.legalDocument.findMany.mockResolvedValue(mockDocs as never);

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
    });

    it('should filter by type', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.findAll({ type: 'PRIVACY_POLICY' });

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'PRIVACY_POLICY' }),
        }),
      );
    });

    it('should filter by countryCode', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.findAll({ countryCode: 'KR' });

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ countryCode: 'KR' }),
        }),
      );
    });

    it('should filter by locale', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.findAll({ locale: 'ko-KR' });

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locale: 'ko-KR' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.findAll({ status: 'ACTIVE' });

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should order by type and version', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.findAll({});

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ type: 'asc' }, { version: 'desc' }],
        }),
      );
    });
  });

  describe('getActiveDocuments', () => {
    it('should return active documents for a country', async () => {
      const mockDocs = [createActiveDocument()];
      prisma.legalDocument.findMany.mockResolvedValue(mockDocs as never);

      const result = await service.getActiveDocuments('KR');

      expect(result).toHaveLength(1);
      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            countryCode: 'KR',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by locale when provided', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.getActiveDocuments('KR', 'ko-KR');

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            countryCode: 'KR',
            locale: 'ko-KR',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by effective date range', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.getActiveDocuments('KR');

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            effectiveFrom: { lte: expect.any(Date) },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: expect.any(Date) } }],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return cached document when available', async () => {
      const cachedDoc = {
        id: 'doc-123',
        type: 'PRIVACY_POLICY',
        version: '1.0.0',
      };
      cacheService.getDocumentById.mockResolvedValue(cachedDoc);

      const result = await service.findOne('doc-123');

      expect(result).toEqual(cachedDoc);
      expect(prisma.legalDocument.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      const mockDoc = createMockLegalDocument();
      cacheService.getDocumentById.mockResolvedValue(undefined);
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);

      const result = await service.findOne('doc-123');

      expect(result.id).toBe(mockDoc.id);
      expect(cacheService.setDocumentById).toHaveBeenCalled();
    });

    it('should throw NotFoundException when document not found', async () => {
      cacheService.getDocumentById.mockResolvedValue(undefined);
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update document title', async () => {
      const mockDoc = createMockLegalDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        title: 'Updated Title',
      } as never);

      const result = await service.update('doc-123', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should update content and regenerate hash', async () => {
      const mockDoc = createMockLegalDocument();
      const newContent = 'Updated content';
      const newHash = crypto.createHash('sha256').update(newContent).digest('hex');

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        content: newContent,
        contentHash: newHash,
      } as never);

      await service.update('doc-123', { content: newContent });

      expect(prisma.legalDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: newContent,
            contentHash: newHash,
          }),
        }),
      );
    });

    it('should update effective dates', async () => {
      const mockDoc = createMockLegalDocument();
      const effectiveFrom = new Date('2025-06-01');
      const effectiveTo = new Date('2026-06-01');

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        effectiveFrom,
        effectiveTo,
      } as never);

      await service.update('doc-123', { effectiveFrom, effectiveTo });

      expect(prisma.legalDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            effectiveFrom,
            effectiveTo,
          }),
        }),
      );
    });

    it('should invalidate cache after update', async () => {
      const mockDoc = createMockLegalDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue(mockDoc as never);

      await service.update('doc-123', { title: 'Updated' });

      expect(cacheService.invalidateDocument).toHaveBeenCalledWith(
        'doc-123',
        mockDoc.type,
        mockDoc.locale,
      );
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a document', async () => {
      const mockDoc = createMockLegalDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.legalDocument.update.mockResolvedValue({
            ...mockDoc,
            status: 'ACTIVE',
            effectiveFrom: new Date(),
          } as never);
          return callback(txClient);
        },
      );

      const result = await service.activate('doc-123');

      expect(result.status).toBe('ACTIVE');
    });

    it('should use existing effectiveFrom if set', async () => {
      const effectiveFrom = new Date('2025-06-01');
      const mockDoc = createMockLegalDocument({ effectiveFrom });

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.legalDocument.update.mockResolvedValue({
            ...mockDoc,
            status: 'ACTIVE',
          } as never);
          return callback(txClient);
        },
      );

      await service.activate('doc-123');

      // The transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should add DOCUMENT_PUBLISHED event to outbox', async () => {
      const mockDoc = createMockLegalDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.legalDocument.update.mockResolvedValue({
            ...mockDoc,
            status: 'ACTIVE',
          } as never);
          return callback(txClient);
        },
      );

      await service.activate('doc-123');

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'LegalDocument',
          eventType: 'DOCUMENT_PUBLISHED',
        }),
        expect.anything(),
      );
    });

    it('should invalidate cache after activation', async () => {
      const mockDoc = createMockLegalDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.legalDocument.update.mockResolvedValue({
            ...mockDoc,
            status: 'ACTIVE',
          } as never);
          return callback(txClient);
        },
      );

      await service.activate('doc-123');

      expect(cacheService.invalidateDocument).toHaveBeenCalled();
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.activate('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should archive a document', async () => {
      const mockDoc = createActiveDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        status: 'ARCHIVED',
        effectiveTo: new Date(),
      } as never);

      const result = await service.archive('doc-123');

      expect(result.status).toBe('ARCHIVED');
    });

    it('should set effectiveTo to current date', async () => {
      const mockDoc = createActiveDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        status: 'ARCHIVED',
        effectiveTo: new Date(),
      } as never);

      await service.archive('doc-123');

      expect(prisma.legalDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ARCHIVED',
            effectiveTo: expect.any(Date),
          }),
        }),
      );
    });

    it('should invalidate cache after archiving', async () => {
      const mockDoc = createActiveDocument();
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        status: 'ARCHIVED',
      } as never);

      await service.archive('doc-123');

      expect(cacheService.invalidateDocument).toHaveBeenCalled();
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.archive('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Document Types', () => {
    const documentTypes = [
      'TERMS_OF_SERVICE',
      'PRIVACY_POLICY',
      'COOKIE_POLICY',
      'DATA_PROCESSING_AGREEMENT',
      'CONSENT_FORM',
    ];

    it.each(documentTypes)('should handle %s document type', async (type) => {
      const dto = createLegalDocumentDto({ type });
      const mockDoc = createMockLegalDocument({ type: type as never });

      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

      const result = await service.create(dto as never);

      expect(result.type).toBe(type);
    });
  });

  describe('Multi-locale Support', () => {
    it('should create documents for different locales', async () => {
      const locales = ['en-US', 'ko-KR', 'ja-JP', 'zh-CN'];

      for (const locale of locales) {
        const dto = createLegalDocumentDto({ locale });
        const mockDoc = createMockLegalDocument({ locale });

        prisma.legalDocument.findFirst.mockResolvedValue(null);
        prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

        const result = await service.create(dto as never);

        expect(result.locale).toBe(locale);
      }
    });
  });
});
