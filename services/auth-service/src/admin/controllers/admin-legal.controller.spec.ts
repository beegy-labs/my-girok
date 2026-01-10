import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminLegalController } from './admin-legal.controller';
import { AdminLegalService } from '../services/admin-legal.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  DocumentListQuery,
  DocumentResponse,
  DocumentListResponse,
  ConsentListQuery,
  ConsentListResponse,
  ConsentStatsResponse,
  LegalDocumentType,
  ConsentType,
} from '../dto/admin-legal.dto';
import { AdminPayload } from '../types/admin.types';

describe('AdminLegalController', () => {
  let controller: AdminLegalController;
  let mockAdminLegalService: {
    listDocuments: Mock;
    getDocumentById: Mock;
    createDocument: Mock;
    updateDocument: Mock;
    deleteDocument: Mock;
    listConsents: Mock;
    getConsentStats: Mock;
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

  const mockDocument: DocumentResponse = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'TERMS_OF_SERVICE' as LegalDocumentType,
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

  const mockConsent = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    userId: '550e8400-e29b-41d4-a716-446655440020',
    user: {
      id: '550e8400-e29b-41d4-a716-446655440020',
      email: 'user@example.com',
      name: 'Test User',
      region: 'KR',
    },
    consentType: 'TERMS_OF_SERVICE' as ConsentType,
    documentId: mockDocument.id,
    documentVersion: '1.0.0',
    agreed: true,
    agreedAt: new Date('2024-01-01'),
    withdrawnAt: null,
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockAdminLegalService = {
      listDocuments: vi.fn(),
      getDocumentById: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
      listConsents: vi.fn(),
      getConsentStats: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLegalController],
      providers: [
        { provide: AdminLegalService, useValue: mockAdminLegalService },
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminLegalController>(AdminLegalController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // DOCUMENTS
  // ============================================================

  describe('listDocuments', () => {
    it('should return list of legal documents', async () => {
      const query: DocumentListQuery = { page: 1, limit: 10 };
      const expectedResponse: DocumentListResponse = {
        items: [mockDocument],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockAdminLegalService.listDocuments.mockResolvedValue(expectedResponse);

      const result = await controller.listDocuments(query);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminLegalService.listDocuments).toHaveBeenCalledWith(query);
    });

    it('should filter by document type', async () => {
      const query: DocumentListQuery = { type: 'PRIVACY_POLICY' };
      mockAdminLegalService.listDocuments.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await controller.listDocuments(query);

      expect(mockAdminLegalService.listDocuments).toHaveBeenCalledWith(query);
    });

    it('should filter by locale', async () => {
      const query: DocumentListQuery = { locale: 'ko' };
      mockAdminLegalService.listDocuments.mockResolvedValue({
        items: [mockDocument],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await controller.listDocuments(query);

      expect(mockAdminLegalService.listDocuments).toHaveBeenCalledWith(query);
    });

    it('should filter by active status', async () => {
      const query: DocumentListQuery = { isActive: true };
      mockAdminLegalService.listDocuments.mockResolvedValue({
        items: [mockDocument],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await controller.listDocuments(query);

      expect(mockAdminLegalService.listDocuments).toHaveBeenCalledWith(query);
    });
  });

  describe('getDocument', () => {
    it('should return a document by id', async () => {
      mockAdminLegalService.getDocumentById.mockResolvedValue(mockDocument);

      const result = await controller.getDocument(mockDocument.id);

      expect(result).toEqual(mockDocument);
      expect(mockAdminLegalService.getDocumentById).toHaveBeenCalledWith(mockDocument.id);
    });
  });

  describe('createDocument', () => {
    it('should create a legal document', async () => {
      const dto: CreateLegalDocumentDto = {
        type: 'TERMS_OF_SERVICE',
        locale: 'ko',
        version: '1.0.0',
        title: 'Terms of Service',
        content: '# Terms of Service\n\nThis is the content...',
        effectiveDate: '2024-01-01',
        countryCode: 'KR',
      };
      mockAdminLegalService.createDocument.mockResolvedValue(mockDocument);

      const result = await controller.createDocument(dto, mockAdmin);

      expect(result).toEqual(mockDocument);
      expect(mockAdminLegalService.createDocument).toHaveBeenCalledWith(dto, mockAdmin);
    });

    it('should create document with optional fields', async () => {
      const dto: CreateLegalDocumentDto = {
        type: 'PRIVACY_POLICY',
        locale: 'en',
        version: '2.0.0',
        title: 'Privacy Policy',
        content: '# Privacy Policy',
        effectiveDate: '2024-06-01',
        summary: 'Summary of the policy',
        serviceId: '550e8400-e29b-41d4-a716-446655440099',
      };
      const newDocument = { ...mockDocument, type: 'PRIVACY_POLICY' as LegalDocumentType };
      mockAdminLegalService.createDocument.mockResolvedValue(newDocument);

      await controller.createDocument(dto, mockAdmin);

      expect(mockAdminLegalService.createDocument).toHaveBeenCalledWith(dto, mockAdmin);
    });
  });

  describe('updateDocument', () => {
    it('should update a legal document', async () => {
      const dto: UpdateLegalDocumentDto = {
        title: 'Updated Terms of Service',
        content: '# Updated Terms',
      };
      const updatedDocument = { ...mockDocument, title: 'Updated Terms of Service' };
      mockAdminLegalService.updateDocument.mockResolvedValue(updatedDocument);

      const result = await controller.updateDocument(mockDocument.id, dto, mockAdmin);

      expect(result.title).toBe('Updated Terms of Service');
      expect(mockAdminLegalService.updateDocument).toHaveBeenCalledWith(
        mockDocument.id,
        dto,
        mockAdmin,
      );
    });

    it('should deactivate a document', async () => {
      const dto: UpdateLegalDocumentDto = { isActive: false };
      const deactivatedDocument = { ...mockDocument, isActive: false };
      mockAdminLegalService.updateDocument.mockResolvedValue(deactivatedDocument);

      const result = await controller.updateDocument(mockDocument.id, dto, mockAdmin);

      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a legal document', async () => {
      mockAdminLegalService.deleteDocument.mockResolvedValue(undefined);

      await controller.deleteDocument(mockDocument.id, mockAdmin);

      expect(mockAdminLegalService.deleteDocument).toHaveBeenCalledWith(mockDocument.id, mockAdmin);
    });
  });

  // ============================================================
  // CONSENTS
  // ============================================================

  describe('listConsents', () => {
    it('should return list of user consents', async () => {
      const query: ConsentListQuery = { page: 1, limit: 10 };
      const expectedResponse: ConsentListResponse = {
        items: [mockConsent],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockAdminLegalService.listConsents.mockResolvedValue(expectedResponse);

      const result = await controller.listConsents(query);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminLegalService.listConsents).toHaveBeenCalledWith(query);
    });

    it('should filter by consent type', async () => {
      const query: ConsentListQuery = { consentType: 'MARKETING_EMAIL' };
      mockAdminLegalService.listConsents.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await controller.listConsents(query);

      expect(mockAdminLegalService.listConsents).toHaveBeenCalledWith(query);
    });

    it('should filter by user id', async () => {
      const query: ConsentListQuery = { userId: mockConsent.userId };
      mockAdminLegalService.listConsents.mockResolvedValue({
        items: [mockConsent],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await controller.listConsents(query);

      expect(mockAdminLegalService.listConsents).toHaveBeenCalledWith(query);
    });

    it('should filter by date range', async () => {
      const query: ConsentListQuery = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      };
      mockAdminLegalService.listConsents.mockResolvedValue({
        items: [mockConsent],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await controller.listConsents(query);

      expect(mockAdminLegalService.listConsents).toHaveBeenCalledWith(query);
    });
  });

  describe('getConsentStats', () => {
    it('should return consent statistics', async () => {
      const expectedStats: ConsentStatsResponse = {
        byType: [
          {
            type: 'TERMS_OF_SERVICE',
            total: 1000,
            agreed: 950,
            withdrawn: 50,
            rate: 0.95,
          },
          {
            type: 'PRIVACY_POLICY',
            total: 1000,
            agreed: 900,
            withdrawn: 100,
            rate: 0.9,
          },
        ],
        byRegion: [
          { region: 'KR', total: 800 },
          { region: 'US', total: 200 },
        ],
        recentActivity: [
          { date: '2024-01-01', agreed: 100, withdrawn: 5 },
          { date: '2024-01-02', agreed: 95, withdrawn: 3 },
        ],
        summary: {
          totalConsents: 2000,
          totalUsers: 1000,
          overallAgreementRate: 0.925,
        },
      };
      mockAdminLegalService.getConsentStats.mockResolvedValue(expectedStats);

      const result = await controller.getConsentStats();

      expect(result).toEqual(expectedStats);
      expect(mockAdminLegalService.getConsentStats).toHaveBeenCalled();
    });
  });
});
