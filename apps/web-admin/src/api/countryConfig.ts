/**
 * Country Configuration API Client
 * Handles API calls for country-specific configuration management
 */

import apiClient from './client';
import type {
  CountryConfig,
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  CountryConfigListResponse,
  CountryConfigFilters,
} from '@my-girok/types';

export const countryConfigApi = {
  /**
   * List all country configurations with optional filters
   */
  async list(params?: CountryConfigFilters) {
    const { data } = await apiClient.get<CountryConfigListResponse>('/country-configs', { params });
    return data;
  },

  /**
   * Get country configuration by country code
   */
  async getByCode(countryCode: string) {
    const { data } = await apiClient.get<CountryConfig>(`/country-configs/code/${countryCode}`);
    return data;
  },

  /**
   * Create a new country configuration
   */
  async create(dto: CreateCountryConfigDto) {
    const { data } = await apiClient.post<CountryConfig>('/country-configs', dto);
    return data;
  },

  /**
   * Update an existing country configuration
   */
  async update(countryCode: string, dto: UpdateCountryConfigDto) {
    const { data } = await apiClient.patch<CountryConfig>(
      `/country-configs/code/${countryCode}`,
      dto,
    );
    return data;
  },

  /**
   * Delete a country configuration
   */
  async delete(countryCode: string) {
    await apiClient.delete(`/country-configs/code/${countryCode}`);
  },

  /**
   * Toggle active status of a country configuration
   */
  async toggleActive(countryCode: string, isActive: boolean) {
    const { data } = await apiClient.patch<CountryConfig>(`/country-configs/code/${countryCode}`, {
      isActive,
    });
    return data;
  },
};

export type {
  CountryConfig,
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  CountryConfigListResponse,
  CountryConfigFilters,
};
