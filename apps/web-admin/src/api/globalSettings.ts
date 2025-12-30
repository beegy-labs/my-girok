import apiClient from './client';
import type {
  SupportedCountry,
  SupportedCountryListResponse,
  CreateSupportedCountryDto,
  UpdateSupportedCountryDto,
  SupportedLocale,
  SupportedLocaleListResponse,
  CreateSupportedLocaleDto,
  UpdateSupportedLocaleDto,
} from '@my-girok/types';

// Re-export types for convenience
export type {
  SupportedCountry,
  SupportedCountryListResponse,
  CreateSupportedCountryDto,
  UpdateSupportedCountryDto,
  SupportedLocale,
  SupportedLocaleListResponse,
  CreateSupportedLocaleDto,
  UpdateSupportedLocaleDto,
} from '@my-girok/types';

// ============================================================
// API Functions
// ============================================================

export const globalSettingsApi = {
  // Countries
  async listCountries(activeOnly = false) {
    const params = activeOnly ? { activeOnly: 'true' } : undefined;
    const { data } = await apiClient.get<SupportedCountryListResponse>('/settings/countries', {
      params,
    });
    return data;
  },

  async getCountry(code: string) {
    const { data } = await apiClient.get<SupportedCountry>(`/settings/countries/${code}`);
    return data;
  },

  async createCountry(dto: CreateSupportedCountryDto) {
    const { data } = await apiClient.post<SupportedCountry>('/settings/countries', dto);
    return data;
  },

  async updateCountry(code: string, dto: UpdateSupportedCountryDto) {
    const { data } = await apiClient.patch<SupportedCountry>(`/settings/countries/${code}`, dto);
    return data;
  },

  async deleteCountry(code: string) {
    await apiClient.delete(`/settings/countries/${code}`);
  },

  // Locales
  async listLocales(activeOnly = false) {
    const params = activeOnly ? { activeOnly: 'true' } : undefined;
    const { data } = await apiClient.get<SupportedLocaleListResponse>('/settings/locales', {
      params,
    });
    return data;
  },

  async getLocale(code: string) {
    const { data } = await apiClient.get<SupportedLocale>(`/settings/locales/${code}`);
    return data;
  },

  async createLocale(dto: CreateSupportedLocaleDto) {
    const { data } = await apiClient.post<SupportedLocale>('/settings/locales', dto);
    return data;
  },

  async updateLocale(code: string, dto: UpdateSupportedLocaleDto) {
    const { data } = await apiClient.patch<SupportedLocale>(`/settings/locales/${code}`, dto);
    return data;
  },

  async deleteLocale(code: string) {
    await apiClient.delete(`/settings/locales/${code}`);
  },
};
