import apiClient from './client';

// ============================================================
// Types
// ============================================================

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceListResponse {
  data: Service[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ConsentRequirement {
  id: string;
  serviceId: string;
  countryCode: string;
  consentType: string;
  isRequired: boolean;
  documentType: string;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRequirementListResponse {
  data: ConsentRequirement[];
  meta: {
    total: number;
    serviceId: string;
    countryCode?: string;
  };
}

export interface CreateConsentRequirementDto {
  countryCode: string;
  consentType: string;
  isRequired: boolean;
  documentType: string;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
}

export interface UpdateConsentRequirementDto {
  isRequired?: boolean;
  documentType?: string;
  displayOrder?: number;
  labelKey?: string;
  descriptionKey?: string;
}

// ============================================================
// API Functions
// ============================================================

export const servicesApi = {
  // Services
  async listServices(params?: { isActive?: boolean; page?: number; limit?: number }) {
    const { data } = await apiClient.get<ServiceListResponse>('/services', { params });
    return data;
  },

  async getService(id: string) {
    const { data } = await apiClient.get<Service>(`/services/${id}`);
    return data;
  },

  async getServiceBySlug(slug: string) {
    const { data } = await apiClient.get<Service>(`/services/slug/${slug}`);
    return data;
  },

  // Consent Requirements
  async listConsentRequirements(serviceId: string, countryCode?: string) {
    const params = countryCode ? { countryCode } : undefined;
    const { data } = await apiClient.get<ConsentRequirementListResponse>(
      `/services/${serviceId}/consent-requirements`,
      { params },
    );
    return data;
  },

  async getConsentRequirement(serviceId: string, id: string) {
    const { data } = await apiClient.get<ConsentRequirement>(
      `/services/${serviceId}/consent-requirements/${id}`,
    );
    return data;
  },

  async createConsentRequirement(serviceId: string, dto: CreateConsentRequirementDto) {
    const { data } = await apiClient.post<ConsentRequirement>(
      `/services/${serviceId}/consent-requirements`,
      dto,
    );
    return data;
  },

  async updateConsentRequirement(serviceId: string, id: string, dto: UpdateConsentRequirementDto) {
    const { data } = await apiClient.patch<ConsentRequirement>(
      `/services/${serviceId}/consent-requirements/${id}`,
      dto,
    );
    return data;
  },

  async deleteConsentRequirement(serviceId: string, id: string) {
    await apiClient.delete(`/services/${serviceId}/consent-requirements/${id}`);
  },
};
