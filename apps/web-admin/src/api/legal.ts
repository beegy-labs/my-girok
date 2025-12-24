import apiClient from './client';

export interface LegalDocument {
  id: string;
  type: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING' | 'THIRD_PARTY' | 'LOCATION';
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  effectiveDate: string;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  type?: string;
  locale?: string;
  isActive?: boolean;
}

export interface DocumentListResponse {
  items: LegalDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDocumentRequest {
  type: LegalDocument['type'];
  version: string;
  locale: string;
  title: string;
  content: string;
  summary?: string;
  effectiveDate: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  summary?: string;
  effectiveDate?: string;
  isActive?: boolean;
}

export interface ConsentStats {
  byType: {
    type: string;
    total: number;
    agreed: number;
    withdrawn: number;
    rate: number;
  }[];
  byRegion: {
    region: string;
    total: number;
  }[];
  recentActivity: {
    date: string;
    agreed: number;
    withdrawn: number;
  }[];
  summary: {
    totalConsents: number;
    totalUsers: number;
    overallAgreementRate: number;
  };
}

export const legalApi = {
  listDocuments: async (query?: DocumentListQuery): Promise<DocumentListResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.type) params.append('type', query.type);
    if (query?.locale) params.append('locale', query.locale);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get<DocumentListResponse>(`/legal/documents?${params}`);
    return response.data;
  },

  getDocument: async (id: string): Promise<LegalDocument> => {
    const response = await apiClient.get<LegalDocument>(`/legal/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateDocumentRequest): Promise<LegalDocument> => {
    const response = await apiClient.post<LegalDocument>('/legal/documents', data);
    return response.data;
  },

  updateDocument: async (id: string, data: UpdateDocumentRequest): Promise<LegalDocument> => {
    const response = await apiClient.put<LegalDocument>(`/legal/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/legal/documents/${id}`);
  },

  getConsentStats: async (range: '7d' | '30d' | '90d' = '30d'): Promise<ConsentStats> => {
    const response = await apiClient.get<ConsentStats>(`/legal/consents/stats?range=${range}`);
    return response.data;
  },
};
