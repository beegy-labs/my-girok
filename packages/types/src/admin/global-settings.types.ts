// packages/types/src/admin/global-settings.types.ts

/**
 * Supported Country - ISO 3166-1 alpha-2 country codes
 */
export interface SupportedCountry {
  id: string;
  code: string; // ISO 3166-1 alpha-2 (e.g., KR, US, JP)
  name: string;
  nativeName: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Supported Locale - Language/region codes
 */
export interface SupportedLocale {
  id: string;
  code: string; // e.g., ko, en, ja, ko-KR
  name: string;
  nativeName: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Supported Country DTO
 */
export interface CreateSupportedCountryDto {
  code: string;
  name: string;
  nativeName?: string;
  flagEmoji?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Update Supported Country DTO
 */
export interface UpdateSupportedCountryDto {
  name?: string;
  nativeName?: string;
  flagEmoji?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Create Supported Locale DTO
 */
export interface CreateSupportedLocaleDto {
  code: string;
  name: string;
  nativeName?: string;
  flagEmoji?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Update Supported Locale DTO
 */
export interface UpdateSupportedLocaleDto {
  name?: string;
  nativeName?: string;
  flagEmoji?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Supported Country List Response
 */
export interface SupportedCountryListResponse {
  data: SupportedCountry[];
  meta: {
    total: number;
  };
}

/**
 * Supported Locale List Response
 */
export interface SupportedLocaleListResponse {
  data: SupportedLocale[];
  meta: {
    total: number;
  };
}
