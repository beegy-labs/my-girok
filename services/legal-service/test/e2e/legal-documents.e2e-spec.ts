import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { LegalDocumentsController } from '../../src/legal-documents/legal-documents.controller';
import { LegalDocumentsService } from '../../src/legal-documents/legal-documents.service';
import { PrismaService } from '../../src/database/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createMockPrisma } from '../utils/mock-prisma';
import { createMockCacheService } from '../utils/mock-cache';
import {
  createMockLegalDocument,
  createActiveDocument,
  createLegalDocumentDto,
} from '../utils/test-factory';

describe('Legal Documents E2E', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createMockPrisma>;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let outboxService: { addEvent: jest.Mock };

  beforeAll(async () => {
    prisma = createMockPrisma();
    cacheService = createMockCacheService();
    outboxService = { addEvent: jest.fn().mockResolvedValue('outbox-id') };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LegalDocumentsController],
      providers: [
        LegalDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /legal-documents', () => {
    it('should create legal document successfully', async () => {
      const dto = createLegalDocumentDto();
      const mockDoc = createMockLegalDocument();

      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

      const response = await request(app.getHttpServer())
        .post('/legal-documents')
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('DRAFT');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/legal-documents')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 409 if document already exists', async () => {
      const dto = createLegalDocumentDto();
      const existingDoc = createMockLegalDocument();

      prisma.legalDocument.findFirst.mockResolvedValue(existingDoc as never);

      await request(app.getHttpServer()).post('/legal-documents').send(dto).expect(409);
    });
  });

  describe('GET /legal-documents', () => {
    it('should return all legal documents', async () => {
      const mockDocs = [createMockLegalDocument()];
      prisma.legalDocument.findMany.mockResolvedValue(mockDocs as never);

      const response = await request(app.getHttpServer()).get('/legal-documents').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by type', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/legal-documents?type=PRIVACY_POLICY').expect(200);

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'PRIVACY_POLICY' }),
        }),
      );
    });

    it('should filter by countryCode', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/legal-documents?countryCode=KR').expect(200);

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ countryCode: 'KR' }),
        }),
      );
    });

    it('should filter by locale', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/legal-documents?locale=ko-KR').expect(200);

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locale: 'ko-KR' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/legal-documents?status=ACTIVE').expect(200);

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  describe('GET /legal-documents/active', () => {
    it('should return active documents for country', async () => {
      const mockDocs = [createActiveDocument()];
      prisma.legalDocument.findMany.mockResolvedValue(mockDocs as never);

      const response = await request(app.getHttpServer())
        .get('/legal-documents/active?countryCode=KR')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by locale when provided', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/legal-documents/active?countryCode=KR&locale=ko-KR')
        .expect(200);

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
  });

  describe('GET /legal-documents/:id', () => {
    it('should get legal document by ID', async () => {
      const docId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const mockDoc = createMockLegalDocument({ id: docId });

      cacheService.getDocumentById.mockResolvedValue(undefined);
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);

      const response = await request(app.getHttpServer())
        .get(`/legal-documents/${docId}`)
        .expect(200);

      expect(response.body.id).toBe(docId);
    });

    it('should return 404 for non-existent document', async () => {
      cacheService.getDocumentById.mockResolvedValue(undefined);
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/legal-documents/nonexistent-id').expect(404);
    });
  });

  describe('PATCH /legal-documents/:id', () => {
    it('should update document title', async () => {
      const docId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const mockDoc = createMockLegalDocument({ id: docId });

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        title: 'Updated Title',
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/legal-documents/${docId}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should update document content', async () => {
      const docId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const mockDoc = createMockLegalDocument({ id: docId });
      const newContent = 'Updated content';

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        content: newContent,
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/legal-documents/${docId}`)
        .send({ content: newContent })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/legal-documents/nonexistent-id')
        .send({ title: 'Test' })
        .expect(404);
    });
  });

  describe('PATCH /legal-documents/:id/activate', () => {
    it('should activate document', async () => {
      const docId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const mockDoc = createMockLegalDocument({ id: docId });

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.legalDocument.update.mockResolvedValue({
          ...mockDoc,
          status: 'ACTIVE',
          effectiveFrom: new Date(),
        } as never);
        return callback(txClient);
      });

      const response = await request(app.getHttpServer())
        .patch(`/legal-documents/${docId}/activate`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('should return 404 when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/legal-documents/nonexistent-id/activate')
        .expect(404);
    });
  });

  describe('PATCH /legal-documents/:id/archive', () => {
    it('should archive document', async () => {
      const docId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const mockDoc = createActiveDocument({ id: docId });

      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        status: 'ARCHIVED',
        effectiveTo: new Date(),
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/legal-documents/${docId}/archive`)
        .expect(200);

      expect(response.body.status).toBe('ARCHIVED');
    });

    it('should return 404 when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/legal-documents/nonexistent-id/archive')
        .expect(404);
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

    documentTypes.forEach((type) => {
      it(`should create ${type} document`, async () => {
        const dto = createLegalDocumentDto({ type });
        const mockDoc = createMockLegalDocument({ type: type as never });

        prisma.legalDocument.findFirst.mockResolvedValue(null);
        prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

        const response = await request(app.getHttpServer())
          .post('/legal-documents')
          .send(dto)
          .expect(201);

        expect(response.body.type).toBe(type);
      });
    });
  });

  describe('Multi-locale Support', () => {
    const locales = ['en-US', 'ko-KR', 'ja-JP', 'zh-CN', 'de-DE', 'fr-FR'];

    locales.forEach((locale) => {
      it(`should create document for ${locale} locale`, async () => {
        const dto = createLegalDocumentDto({ locale });
        const mockDoc = createMockLegalDocument({ locale });

        prisma.legalDocument.findFirst.mockResolvedValue(null);
        prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

        const response = await request(app.getHttpServer())
          .post('/legal-documents')
          .send(dto)
          .expect(201);

        expect(response.body.locale).toBe(locale);
      });
    });
  });

  describe('Document Lifecycle', () => {
    it('should complete full document lifecycle: draft -> active -> archived', async () => {
      const docId = 'doc-lifecycle-test';
      const mockDoc = createMockLegalDocument({ id: docId });

      // Step 1: Create (DRAFT)
      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

      const createResponse = await request(app.getHttpServer())
        .post('/legal-documents')
        .send(createLegalDocumentDto())
        .expect(201);
      expect(createResponse.body.status).toBe('DRAFT');

      // Step 2: Activate
      prisma.legalDocument.findUnique.mockResolvedValue(mockDoc as never);
      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.legalDocument.update.mockResolvedValue({
          ...mockDoc,
          status: 'ACTIVE',
          effectiveFrom: new Date(),
        } as never);
        return callback(txClient);
      });

      const activateResponse = await request(app.getHttpServer())
        .patch(`/legal-documents/${docId}/activate`)
        .expect(200);
      expect(activateResponse.body.status).toBe('ACTIVE');

      // Step 3: Archive
      prisma.legalDocument.findUnique.mockResolvedValue({
        ...mockDoc,
        status: 'ACTIVE',
      } as never);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDoc,
        status: 'ARCHIVED',
        effectiveTo: new Date(),
      } as never);

      const archiveResponse = await request(app.getHttpServer())
        .patch(`/legal-documents/${docId}/archive`)
        .expect(200);
      expect(archiveResponse.body.status).toBe('ARCHIVED');
    });
  });

  describe('Versioning', () => {
    it('should support semantic versioning', async () => {
      const versions = ['1.0.0', '1.1.0', '2.0.0', '2.0.1'];

      for (const version of versions) {
        const dto = createLegalDocumentDto({ version });
        const mockDoc = createMockLegalDocument({ version });

        prisma.legalDocument.findFirst.mockResolvedValue(null);
        prisma.legalDocument.create.mockResolvedValue(mockDoc as never);

        const response = await request(app.getHttpServer())
          .post('/legal-documents')
          .send(dto)
          .expect(201);

        expect(response.body.version).toBe(version);
      }
    });
  });
});
