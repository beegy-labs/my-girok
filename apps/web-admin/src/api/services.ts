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

// Service Supported Countries
export interface ServiceCountry {
  id: string;
  serviceId: string;
  countryCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCountryListResponse {
  data: ServiceCountry[];
  meta: {
    total: number;
    serviceId: string;
  };
}

// Service Supported Locales
export interface ServiceLocale {
  id: string;
  serviceId: string;
  locale: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceLocaleListResponse {
  data: ServiceLocale[];
  meta: {
    total: number;
    serviceId: string;
  };
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

  // Service Supported Countries
  async listServiceCountries(serviceId: string) {
    const { data } = await apiClient.get<ServiceCountryListResponse>(
      `/services/${serviceId}/countries`,
    );
    return data;
  },

  async addServiceCountry(serviceId: string, countryCode: string) {
    const { data } = await apiClient.post<ServiceCountry>(`/services/${serviceId}/countries`, {
      countryCode,
    });
    return data;
  },

  async removeServiceCountry(serviceId: string, countryCode: string) {
    await apiClient.delete(`/services/${serviceId}/countries/${countryCode}`);
  },

  // Service Supported Locales
  async listServiceLocales(serviceId: string) {
    const { data } = await apiClient.get<ServiceLocaleListResponse>(
      `/services/${serviceId}/locales`,
    );
    return data;
  },

  async addServiceLocale(serviceId: string, locale: string) {
    const { data } = await apiClient.post<ServiceLocale>(`/services/${serviceId}/locales`, {
      locale,
    });
    return data;
  },

  async removeServiceLocale(serviceId: string, locale: string) {
    await apiClient.delete(`/services/${serviceId}/locales/${locale}`);
  },
};
