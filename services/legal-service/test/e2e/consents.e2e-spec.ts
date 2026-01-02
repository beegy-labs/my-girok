import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConsentsController } from '../../src/consents/consents.controller';
import { ConsentsService } from '../../src/consents/consents.service';
import { PrismaService } from '../../src/database/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createMockPrisma } from '../utils/mock-prisma';
import { createMockCacheService } from '../utils/mock-cache';
import {
  createMockConsent,
  createConsentWithDocument,
  createGrantConsentDto,
  createWithdrawConsentDto,
} from '../utils/test-factory';

describe('Consents E2E', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createMockPrisma>;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let outboxService: { addEvent: jest.Mock };

  beforeAll(async () => {
    prisma = createMockPrisma();
    cacheService = createMockCacheService();
    outboxService = { addEvent: jest.fn().mockResolvedValue('outbox-id') };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConsentsController],
      providers: [
        ConsentsService,
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

  describe('POST /consents', () => {
    it('should grant consent successfully', async () => {
      const dto = createGrantConsentDto();
      const mockConsent = createConsentWithDocument();

      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.consent.create.mockResolvedValue(mockConsent as never);
        return callback(txClient);
      });

      const response = await request(app.getHttpServer()).post('/consents').send(dto).expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('GRANTED');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer()).post('/consents').send({}).expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate accountId is UUID', async () => {
      const response = await request(app.getHttpServer())
        .post('/consents')
        .send({
          accountId: 'invalid-uuid',
          documentId: 'doc-123e4567-e89b-12d3-a456-426614174000',
        })
        .expect(400);

      expect(response.body.message).toContain('accountId');
    });

    it('should validate documentId is UUID', async () => {
      const response = await request(app.getHttpServer())
        .post('/consents')
        .send({
          accountId: 'account-123e4567-e89b-12d3-a456-426614174000',
          documentId: 'invalid-uuid',
        })
        .expect(400);

      expect(response.body.message).toContain('documentId');
    });
  });

  describe('GET /consents/account/:accountId', () => {
    it('should get consents for account', async () => {
      const accountId = 'account-123e4567-e89b-12d3-a456-426614174000';
      const mockConsents = [createConsentWithDocument({ accountId })];

      cacheService.getConsentsByAccount.mockResolvedValue(undefined);
      prisma.consent.findMany.mockResolvedValue(mockConsents as never);

      const response = await request(app.getHttpServer())
        .get(`/consents/account/${accountId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status query parameter', async () => {
      const accountId = 'account-123e4567-e89b-12d3-a456-426614174000';
      prisma.consent.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/consents/account/${accountId}?status=GRANTED`)
        .expect(200);

      expect(prisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId,
            status: 'GRANTED',
          }),
        }),
      );
    });
  });

  describe('GET /consents/:id', () => {
    it('should get consent by ID', async () => {
      const consentId = 'consent-123e4567-e89b-12d3-a456-426614174000';
      const mockConsent = createConsentWithDocument({ id: consentId });

      cacheService.getConsentById.mockResolvedValue(undefined);
      prisma.consent.findUnique.mockResolvedValue(mockConsent as never);

      const response = await request(app.getHttpServer()).get(`/consents/${consentId}`).expect(200);

      expect(response.body.id).toBe(consentId);
    });

    it('should return 404 for non-existent consent', async () => {
      cacheService.getConsentById.mockResolvedValue(undefined);
      prisma.consent.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/consents/nonexistent-id').expect(404);
    });
  });

  describe('DELETE /consents/:id', () => {
    it('should withdraw consent successfully', async () => {
      const consentId = 'consent-123e4567-e89b-12d3-a456-426614174000';
      const mockConsent = createConsentWithDocument({ id: consentId });
      const dto = createWithdrawConsentDto();

      prisma.consent.findUnique.mockResolvedValue(mockConsent as never);
      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.consent.update.mockResolvedValue({} as never);
        return callback(txClient);
      });

      await request(app.getHttpServer()).delete(`/consents/${consentId}`).send(dto).expect(204);
    });

    it('should return 404 when consent not found', async () => {
      prisma.consent.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/consents/nonexistent-id')
        .send(createWithdrawConsentDto())
        .expect(404);
    });
  });

  describe('GET /consents/document/:documentId/check/:accountId', () => {
    it('should check consent status - has consent', async () => {
      const documentId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const accountId = 'account-123e4567-e89b-12d3-a456-426614174000';
      const mockConsent = createConsentWithDocument({ documentId, accountId });

      cacheService.getConsentStatus.mockResolvedValue(undefined);
      prisma.consent.findFirst.mockResolvedValue(mockConsent as never);

      const response = await request(app.getHttpServer())
        .get(`/consents/document/${documentId}/check/${accountId}`)
        .expect(200);

      expect(response.body.hasConsent).toBe(true);
      expect(response.body.consent).toBeDefined();
    });

    it('should check consent status - no consent', async () => {
      const documentId = 'doc-123e4567-e89b-12d3-a456-426614174000';
      const accountId = 'account-123e4567-e89b-12d3-a456-426614174000';

      cacheService.getConsentStatus.mockResolvedValue(undefined);
      prisma.consent.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/consents/document/${documentId}/check/${accountId}`)
        .expect(200);

      expect(response.body.hasConsent).toBe(false);
      expect(response.body.consent).toBeUndefined();
    });
  });

  describe('GDPR Compliance Scenarios', () => {
    it('should support explicit consent for GDPR', async () => {
      const dto = createGrantConsentDto({
        consentMethod: 'explicit_button',
        metadata: { regulation: 'GDPR' },
      });
      const mockConsent = createConsentWithDocument({
        consentMethod: 'explicit_button',
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.consent.create.mockResolvedValue(mockConsent as never);
        return callback(txClient);
      });

      const response = await request(app.getHttpServer()).post('/consents').send(dto).expect(201);

      expect(response.body.consentMethod).toBe('explicit_button');
    });
  });

  describe('PIPA Compliance Scenarios', () => {
    it('should handle PIPA consent with age verification metadata', async () => {
      const dto = createGrantConsentDto({
        metadata: { regulation: 'PIPA', userAge: 16, countryCode: 'KR' },
      });
      const mockConsent = createConsentWithDocument();

      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.consent.create.mockResolvedValue(mockConsent as never);
        return callback(txClient);
      });

      const response = await request(app.getHttpServer()).post('/consents').send(dto).expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe('CCPA Opt-out Workflow', () => {
    it('should support CCPA opt-out consent method', async () => {
      const dto = createGrantConsentDto({
        consentMethod: 'opt_out_link',
        metadata: { regulation: 'CCPA', optOutOfSale: true },
      });
      const mockConsent = createConsentWithDocument({
        consentMethod: 'opt_out_link',
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        const txClient = createMockPrisma();
        txClient.consent.create.mockResolvedValue(mockConsent as never);
        return callback(txClient);
      });

      const response = await request(app.getHttpServer()).post('/consents').send(dto).expect(201);

      expect(response.body.consentMethod).toBe('opt_out_link');
    });
  });
});
