// packages/types/src/admin/legal.types.ts

/**
 * Admin document type (string union for API compatibility)
 * Different from auth-service enum LegalDocumentType
 */
export type AdminDocumentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING'
  | 'THIRD_PARTY'
  | 'LOCATION';

export type AdminSupportedLocale = 'ko' | 'en' | 'ja' | 'hi';

/**
 * Legal document entity for admin panel
 */
export interface AdminLegalDocument {
  id: string;
  type: AdminDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  effectiveDate: string;
  isActive: boolean;
  serviceId: string | null;
  countryCode: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * List query parameters
 */
export interface AdminDocumentListQuery {
  page?: number;
  limit?: number;
  type?: string;
  locale?: string;
  isActive?: boolean;
  serviceId?: string;
  countryCode?: string;
}

/**
 * Paginated list response
 */
export interface AdminDocumentListResponse {
  items: AdminLegalDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create document DTO
 */
export interface CreateAdminDocumentDto {
  type: AdminDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary?: string;
  effectiveDate: string;
  serviceId?: string;
  countryCode?: string;
}

/**
 * Update document DTO
 */
export interface UpdateAdminDocumentDto {
  title?: string;
  content?: string;
  summary?: string;
  effectiveDate?: string;
  isActive?: boolean;
}

/**
 * Consent statistics
 */
export interface AdminConsentTypeStat {
  type: string;
  total: number;
  agreed: number;
  withdrawn: number;
  rate: number;
}

export interface AdminConsentRegionStat {
  region: string;
  total: number;
}

export interface AdminConsentDailyStat {
  date: string;
  agreed: number;
  withdrawn: number;
}

export interface AdminConsentStatsSummary {
  totalConsents: number;
  totalUsers: number;
  overallAgreementRate: number;
}

export interface AdminConsentStats {
  byType: AdminConsentTypeStat[];
  byRegion: AdminConsentRegionStat[];
  recentActivity: AdminConsentDailyStat[];
  summary: AdminConsentStatsSummary;
}

export type AdminDateRange = '7d' | '30d' | '90d';
