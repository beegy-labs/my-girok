import apiClient from './client';
import type {
  AdminLegalDocument,
  AdminDocumentListQuery,
  AdminDocumentListResponse,
  CreateAdminDocumentDto,
  UpdateAdminDocumentDto,
  AdminConsentStats,
  AdminDateRange,
} from '@my-girok/types';

export const legalApi = {
  listDocuments: async (query?: AdminDocumentListQuery): Promise<AdminDocumentListResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.type) params.append('type', query.type);
    if (query?.locale) params.append('locale', query.locale);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());
    if (query?.serviceId) params.append('serviceId', query.serviceId);
    if (query?.countryCode) params.append('countryCode', query.countryCode);

    const response = await apiClient.get<AdminDocumentListResponse>(`/legal/documents?${params}`);
    return response.data;
  },

  getDocument: async (id: string): Promise<AdminLegalDocument> => {
    const response = await apiClient.get<AdminLegalDocument>(`/legal/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateAdminDocumentDto): Promise<AdminLegalDocument> => {
    const response = await apiClient.post<AdminLegalDocument>('/legal/documents', data);
    return response.data;
  },

  updateDocument: async (id: string, data: UpdateAdminDocumentDto): Promise<AdminLegalDocument> => {
    const response = await apiClient.put<AdminLegalDocument>(`/legal/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/legal/documents/${id}`);
  },

  getConsentStats: async (range: AdminDateRange = '30d'): Promise<AdminConsentStats> => {
    const response = await apiClient.get<AdminConsentStats>(`/legal/consents/stats?range=${range}`);
    return response.data;
  },
};

// Re-export types for convenience
export type {
  AdminLegalDocument as LegalDocument,
  AdminDocumentListQuery as DocumentListQuery,
  AdminDocumentListResponse as DocumentListResponse,
  CreateAdminDocumentDto as CreateDocumentRequest,
  UpdateAdminDocumentDto as UpdateDocumentRequest,
  AdminConsentStats as ConsentStats,
  AdminDateRange as DateRange,
} from '@my-girok/types';
