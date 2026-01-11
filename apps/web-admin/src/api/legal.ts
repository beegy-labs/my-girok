import axios from 'axios';
import type {
  AdminLegalDocument,
  AdminDocumentListQuery,
  AdminDocumentListResponse,
  CreateAdminDocumentDto,
  UpdateAdminDocumentDto,
  AdminConsentStats,
  AdminDateRange,
} from '@my-girok/types';

// Legal Service API base URL (through unified gateway)
const LEGAL_API_URL = import.meta.env.VITE_LEGAL_API_URL || 'https://my-api-dev.girok.dev/legal';

const legalClient = axios.create({
  baseURL: LEGAL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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

    const response = await legalClient.get<AdminDocumentListResponse>(`/legal-documents?${params}`);
    return response.data;
  },

  getDocument: async (id: string): Promise<AdminLegalDocument> => {
    const response = await legalClient.get<AdminLegalDocument>(`/legal-documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateAdminDocumentDto): Promise<AdminLegalDocument> => {
    const response = await legalClient.post<AdminLegalDocument>('/legal-documents', data);
    return response.data;
  },

  updateDocument: async (id: string, data: UpdateAdminDocumentDto): Promise<AdminLegalDocument> => {
    const response = await legalClient.patch<AdminLegalDocument>(`/legal-documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await legalClient.delete(`/legal-documents/${id}`);
  },

  getConsentStats: async (range: AdminDateRange = '30d'): Promise<AdminConsentStats> => {
    const response = await legalClient.get<AdminConsentStats>(`/consents/stats?range=${range}`);
    return response.data;
  },

  // Law Registry endpoints
  listLawRegistries: async () => {
    const response = await legalClient.get('/law-registry');
    return response.data;
  },

  createLawRegistry: async (data: {
    code: string;
    name: string;
    description?: string;
    countryCode: string;
    effectiveDate: string;
    isActive?: boolean;
  }) => {
    const response = await legalClient.post('/law-registry', data);
    return response.data;
  },

  getLawRegistry: async (id: string) => {
    const response = await legalClient.get(`/law-registry/${id}`);
    return response.data;
  },

  updateLawRegistry: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>,
  ) => {
    const response = await legalClient.patch(`/law-registry/${id}`, data);
    return response.data;
  },

  deleteLawRegistry: async (id: string) => {
    await legalClient.delete(`/law-registry/${id}`);
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
