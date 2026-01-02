import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { DsrRequestsController } from '../../src/dsr-requests/dsr-requests.controller';
import { DsrRequestsService } from '../../src/dsr-requests/dsr-requests.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrisma } from '../utils/mock-prisma';
import {
  createMockDsrRequest,
  createGdprAccessRequest,
  createGdprErasureRequest,
  createCcpaRequest,
  createDsrRequestDto,
} from '../utils/test-factory';

describe('DSR Requests E2E', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeAll(async () => {
    prisma = createMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DsrRequestsController],
      providers: [
        DsrRequestsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: number) => {
              if (key === 'DSR_DEFAULT_DUE_DAYS') return 30;
              return defaultValue;
            }),
          },
        },
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

  describe('POST /dsr-requests', () => {
    it('should create DSR request successfully', async () => {
      const dto = createDsrRequestDto();
      const mockRequest = createMockDsrRequest();

      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const response = await request(app.getHttpServer())
        .post('/dsr-requests')
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PENDING');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/dsr-requests')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should create GDPR Article 15 (Access) request', async () => {
      const dto = createDsrRequestDto({ requestType: 'ACCESS' });
      const mockRequest = createGdprAccessRequest();

      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const response = await request(app.getHttpServer())
        .post('/dsr-requests')
        .send(dto)
        .expect(201);

      expect(response.body.requestType).toBe('ACCESS');
    });

    it('should create GDPR Article 17 (Erasure) request', async () => {
      const dto = createDsrRequestDto({ requestType: 'ERASURE' });
      const mockRequest = createGdprErasureRequest();

      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const response = await request(app.getHttpServer())
        .post('/dsr-requests')
        .send(dto)
        .expect(201);

      expect(response.body.requestType).toBe('ERASURE');
    });
  });

  describe('GET /dsr-requests', () => {
    it('should return paginated DSR requests', async () => {
      const mockRequests = [createMockDsrRequest()];
      prisma.dsrRequest.findMany.mockResolvedValue(mockRequests as never);
      prisma.dsrRequest.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer()).get('/dsr-requests').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await request(app.getHttpServer()).get('/dsr-requests?status=PENDING').expect(200);

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by request type', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await request(app.getHttpServer()).get('/dsr-requests?type=ERASURE').expect(200);

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestType: 'ERASURE' }),
        }),
      );
    });

    it('should support pagination', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);
      prisma.dsrRequest.count.mockResolvedValue(0);

      await request(app.getHttpServer()).get('/dsr-requests?page=2&limit=10').expect(200);

      expect(prisma.dsrRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('GET /dsr-requests/account/:accountId', () => {
    it('should get DSR requests for account', async () => {
      const accountId = 'account-123e4567-e89b-12d3-a456-426614174000';
      const mockRequests = [createMockDsrRequest({ accountId })];

      prisma.dsrRequest.findMany.mockResolvedValue(mockRequests as never);

      const response = await request(app.getHttpServer())
        .get(`/dsr-requests/account/${accountId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /dsr-requests/:id', () => {
    it('should get DSR request by ID', async () => {
      const requestId = 'dsr-123e4567-e89b-12d3-a456-426614174000';
      const mockRequest = createMockDsrRequest({ id: requestId });

      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);

      const response = await request(app.getHttpServer())
        .get(`/dsr-requests/${requestId}`)
        .expect(200);

      expect(response.body.id).toBe(requestId);
    });

    it('should return 404 for non-existent request', async () => {
      prisma.dsrRequest.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/dsr-requests/nonexistent-id').expect(404);
    });
  });

  describe('PATCH /dsr-requests/:id', () => {
    it('should update DSR request status', async () => {
      const requestId = 'dsr-123e4567-e89b-12d3-a456-426614174000';
      const mockRequest = createMockDsrRequest({ id: requestId });

      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
        acknowledgedAt: new Date(),
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/dsr-requests/${requestId}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('should update assignment', async () => {
      const requestId = 'dsr-123e4567-e89b-12d3-a456-426614174000';
      const operatorId = 'operator-123';
      const mockRequest = createMockDsrRequest({ id: requestId });

      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        assignedTo: operatorId,
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/dsr-requests/${requestId}`)
        .send({ assignedTo: operatorId })
        .expect(200);

      expect(response.body.assignedTo).toBe(operatorId);
    });

    it('should complete request with resolution', async () => {
      const requestId = 'dsr-123e4567-e89b-12d3-a456-426614174000';
      const mockRequest = createMockDsrRequest({ id: requestId });

      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'COMPLETED',
        resolution: 'Data exported successfully',
        completedAt: new Date(),
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/dsr-requests/${requestId}`)
        .send({
          status: 'COMPLETED',
          resolution: 'Data exported successfully',
        })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('should reject request with reason', async () => {
      const requestId = 'dsr-123e4567-e89b-12d3-a456-426614174000';
      const mockRequest = createMockDsrRequest({ id: requestId });

      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
        rejectionReason: 'Unable to verify identity',
        completedAt: new Date(),
      } as never);

      const response = await request(app.getHttpServer())
        .patch(`/dsr-requests/${requestId}`)
        .send({
          status: 'REJECTED',
          rejectionReason: 'Unable to verify identity',
        })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
    });

    it('should return 404 when request not found', async () => {
      prisma.dsrRequest.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/dsr-requests/nonexistent-id')
        .send({ status: 'IN_PROGRESS' })
        .expect(404);
    });
  });

  describe('GDPR Compliance Workflows', () => {
    describe('Article 15 - Right of Access', () => {
      it('should create and process access request', async () => {
        const dto = createDsrRequestDto({
          requestType: 'ACCESS',
          description: 'I want to access my personal data',
        });
        const mockRequest = createGdprAccessRequest();

        prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

        const response = await request(app.getHttpServer())
          .post('/dsr-requests')
          .send(dto)
          .expect(201);

        expect(response.body.requestType).toBe('ACCESS');
        expect(response.body.dueDate).toBeDefined();
      });
    });

    describe('Article 17 - Right to Erasure', () => {
      it('should create and process erasure request', async () => {
        const dto = createDsrRequestDto({
          requestType: 'ERASURE',
          description: 'Please delete all my data',
        });
        const mockRequest = createGdprErasureRequest();

        prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

        const response = await request(app.getHttpServer())
          .post('/dsr-requests')
          .send(dto)
          .expect(201);

        expect(response.body.requestType).toBe('ERASURE');
      });
    });

    describe('All GDPR Rights', () => {
      const gdprArticles = [
        { type: 'ACCESS', article: '15', description: 'Right of access' },
        { type: 'RECTIFICATION', article: '16', description: 'Right to rectification' },
        { type: 'ERASURE', article: '17', description: 'Right to erasure' },
        { type: 'RESTRICTION', article: '18', description: 'Right to restriction' },
        { type: 'PORTABILITY', article: '20', description: 'Right to data portability' },
        { type: 'OBJECTION', article: '21', description: 'Right to object' },
      ];

      gdprArticles.forEach(({ type, article, description }) => {
        it(`should handle Article ${article} - ${description}`, async () => {
          const dto = createDsrRequestDto({
            requestType: type,
            description: `GDPR Article ${article}: ${description}`,
          });
          const mockRequest = createMockDsrRequest({ requestType: type as never });

          prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

          const response = await request(app.getHttpServer())
            .post('/dsr-requests')
            .send(dto)
            .expect(201);

          expect(response.body.requestType).toBe(type);
        });
      });
    });
  });

  describe('CCPA Compliance', () => {
    it('should handle CCPA access request with 45-day deadline metadata', async () => {
      const dto = createDsrRequestDto({
        requestType: 'ACCESS',
        metadata: { regulation: 'CCPA' },
      });
      const mockRequest = createCcpaRequest();

      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);

      const response = await request(app.getHttpServer())
        .post('/dsr-requests')
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe('DSR Processing Workflow', () => {
    it('should complete full DSR workflow: create -> acknowledge -> complete', async () => {
      const requestId = 'dsr-workflow-test';
      const mockRequest = createMockDsrRequest({ id: requestId });

      // Step 1: Create
      prisma.dsrRequest.create.mockResolvedValue(mockRequest as never);
      const createResponse = await request(app.getHttpServer())
        .post('/dsr-requests')
        .send(createDsrRequestDto())
        .expect(201);
      expect(createResponse.body.status).toBe('PENDING');

      // Step 2: Acknowledge (transition to IN_PROGRESS)
      prisma.dsrRequest.findUnique.mockResolvedValue(mockRequest as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
        acknowledgedAt: new Date(),
      } as never);

      const ackResponse = await request(app.getHttpServer())
        .patch(`/dsr-requests/${requestId}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
      expect(ackResponse.body.status).toBe('IN_PROGRESS');

      // Step 3: Complete
      prisma.dsrRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
      } as never);
      prisma.dsrRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'COMPLETED',
        resolution: 'Data provided to user',
        completedAt: new Date(),
      } as never);

      const completeResponse = await request(app.getHttpServer())
        .patch(`/dsr-requests/${requestId}`)
        .send({
          status: 'COMPLETED',
          resolution: 'Data provided to user',
        })
        .expect(200);
      expect(completeResponse.body.status).toBe('COMPLETED');
    });
  });
});
