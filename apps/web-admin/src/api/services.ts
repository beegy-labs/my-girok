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

// Service Config
export type AuditLevel = 'MINIMAL' | 'STANDARD' | 'VERBOSE' | 'DEBUG';

export interface ServiceConfig {
  id: string;
  serviceId: string;
  jwtValidation: boolean;
  domainValidation: boolean;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  auditLevel: AuditLevel;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface DomainResponse {
  domains: string[];
  primaryDomain: string | null;
}

export interface UpdateServiceConfigDto {
  jwtValidation?: boolean;
  domainValidation?: boolean;
  ipWhitelistEnabled?: boolean;
  ipWhitelist?: string[];
  rateLimitEnabled?: boolean;
  rateLimitRequests?: number;
  rateLimitWindow?: number;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  auditLevel?: AuditLevel;
  reason: string;
}

// Service Features
export type PermissionTargetType = 'ALL_USERS' | 'USER' | 'TIER' | 'COUNTRY' | 'ROLE';
export type FeatureAction = 'USE' | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ADMIN';

export interface ServiceFeature {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  parentId: string | null;
  path: string;
  depth: number;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  children?: ServiceFeature[];
}

export interface ServiceFeatureListResponse {
  data: ServiceFeature[];
  meta: {
    total: number;
    serviceId: string;
    category?: string;
  };
}

export interface CreateServiceFeatureDto {
  code: string;
  name: string;
  description?: string;
  category: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
}

export interface UpdateServiceFeatureDto {
  name?: string;
  description?: string;
  category?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
}

// Service Testers
export interface TesterUser {
  id: string;
  serviceId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
  bypassAll: boolean;
  bypassDomain: boolean;
  bypassIP: boolean;
  bypassRate: boolean;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface TesterAdmin {
  id: string;
  serviceId: string;
  adminId: string;
  admin: {
    id: string;
    email: string;
    name: string;
  };
  bypassAll: boolean;
  bypassDomain: boolean;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface TesterUserListResponse {
  data: TesterUser[];
  meta: {
    total: number;
    serviceId: string;
  };
}

export interface TesterAdminListResponse {
  data: TesterAdmin[];
  meta: {
    total: number;
    serviceId: string;
  };
}

export interface CreateTesterUserDto {
  userId: string;
  bypassAll?: boolean;
  bypassDomain?: boolean;
  bypassIP?: boolean;
  bypassRate?: boolean;
  note?: string;
  expiresAt?: string;
  reason: string;
}

export interface CreateTesterAdminDto {
  adminId: string;
  bypassAll?: boolean;
  bypassDomain?: boolean;
  note?: string;
  expiresAt?: string;
  reason: string;
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

  // ============================================================
  // Service Config
  // ============================================================

  async getServiceDomains(serviceId: string) {
    const { data } = await apiClient.get<DomainResponse>(`/services/${serviceId}/domains`);
    return data;
  },

  async addServiceDomain(serviceId: string, domain: string, isPrimary?: boolean) {
    const { data } = await apiClient.post<DomainResponse>(`/services/${serviceId}/domains`, {
      domain,
      isPrimary,
    });
    return data;
  },

  async removeServiceDomain(serviceId: string, domain: string) {
    const { data } = await apiClient.delete<DomainResponse>(
      `/services/${serviceId}/domains/${domain}`,
    );
    return data;
  },

  async getServiceConfig(serviceId: string) {
    const { data } = await apiClient.get<ServiceConfig>(`/services/${serviceId}/config`);
    return data;
  },

  async updateServiceConfig(serviceId: string, dto: UpdateServiceConfigDto) {
    const { data } = await apiClient.patch<ServiceConfig>(`/services/${serviceId}/config`, dto);
    return data;
  },

  // ============================================================
  // Service Features
  // ============================================================

  async listServiceFeatures(
    serviceId: string,
    params?: { category?: string; includeInactive?: boolean; includeChildren?: boolean },
  ) {
    const { data } = await apiClient.get<ServiceFeatureListResponse>(
      `/services/${serviceId}/features`,
      { params },
    );
    return data;
  },

  async getServiceFeature(serviceId: string, id: string) {
    const { data } = await apiClient.get<ServiceFeature>(`/services/${serviceId}/features/${id}`);
    return data;
  },

  async createServiceFeature(serviceId: string, dto: CreateServiceFeatureDto) {
    const { data } = await apiClient.post<ServiceFeature>(`/services/${serviceId}/features`, dto);
    return data;
  },

  async updateServiceFeature(serviceId: string, id: string, dto: UpdateServiceFeatureDto) {
    const { data } = await apiClient.patch<ServiceFeature>(
      `/services/${serviceId}/features/${id}`,
      dto,
    );
    return data;
  },

  async deleteServiceFeature(serviceId: string, id: string) {
    await apiClient.delete(`/services/${serviceId}/features/${id}`);
  },

  // ============================================================
  // Service Testers
  // ============================================================

  async listUserTesters(serviceId: string, params?: { search?: string; expiresWithin?: string }) {
    const { data } = await apiClient.get<TesterUserListResponse>(
      `/services/${serviceId}/testers/users`,
      { params },
    );
    return data;
  },

  async createUserTester(serviceId: string, dto: CreateTesterUserDto) {
    const { data } = await apiClient.post<TesterUser>(`/services/${serviceId}/testers/users`, dto);
    return data;
  },

  async deleteUserTester(serviceId: string, userId: string, reason: string) {
    await apiClient.delete(`/services/${serviceId}/testers/users/${userId}`, {
      data: { reason },
    });
  },

  async listAdminTesters(serviceId: string) {
    const { data } = await apiClient.get<TesterAdminListResponse>(
      `/services/${serviceId}/testers/admins`,
    );
    return data;
  },

  async createAdminTester(serviceId: string, dto: CreateTesterAdminDto) {
    const { data } = await apiClient.post<TesterAdmin>(
      `/services/${serviceId}/testers/admins`,
      dto,
    );
    return data;
  },

  async deleteAdminTester(serviceId: string, adminId: string, reason: string) {
    await apiClient.delete(`/services/${serviceId}/testers/admins/${adminId}`, {
      data: { reason },
    });
  },
};
