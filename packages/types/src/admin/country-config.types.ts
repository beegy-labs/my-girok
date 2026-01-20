/**
 * Country Configuration Types
 * Types for country-specific configuration including employment, leave policies, and compliance settings
 */

export interface CountryConfig {
  id: string;
  countryCode: string;
  countryName: string;
  countryNameNative?: string;
  region?: string;
  subregion?: string;
  currencyCode: string;
  currencySymbol?: string;
  defaultTimezone: string;
  timezones: string[];
  standardWorkHoursPerWeek: number;
  standardWorkDays: string[];
  overtimeAllowed: boolean;
  maxOvertimeHoursPerWeek?: number;
  minAnnualLeaveDays: number;
  statutorySickDays?: number;
  maternityLeaveWeeks?: number;
  paternityLeaveWeeks?: number;
  taxYearStartMonth: number;
  taxIdFormat?: string;
  dataPrivacyLaw?: string;
  employmentLawNotes?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountryConfigDto {
  countryCode: string;
  countryName: string;
  countryNameNative?: string;
  region?: string;
  subregion?: string;
  currencyCode: string;
  currencySymbol?: string;
  defaultTimezone: string;
  timezones?: string[];
  standardWorkHoursPerWeek?: number;
  standardWorkDays?: string[];
  overtimeAllowed?: boolean;
  maxOvertimeHoursPerWeek?: number;
  minAnnualLeaveDays?: number;
  statutorySickDays?: number;
  maternityLeaveWeeks?: number;
  paternityLeaveWeeks?: number;
  taxYearStartMonth?: number;
  taxIdFormat?: string;
  dataPrivacyLaw?: string;
  employmentLawNotes?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateCountryConfigDto {
  countryName?: string;
  countryNameNative?: string;
  region?: string;
  subregion?: string;
  currencyCode?: string;
  currencySymbol?: string;
  defaultTimezone?: string;
  timezones?: string[];
  standardWorkHoursPerWeek?: number;
  standardWorkDays?: string[];
  overtimeAllowed?: boolean;
  maxOvertimeHoursPerWeek?: number;
  minAnnualLeaveDays?: number;
  statutorySickDays?: number;
  maternityLeaveWeeks?: number;
  paternityLeaveWeeks?: number;
  taxYearStartMonth?: number;
  taxIdFormat?: string;
  dataPrivacyLaw?: string;
  employmentLawNotes?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CountryConfigListResponse {
  data: CountryConfig[];
  total: number;
}

export interface CountryConfigFilters {
  region?: string;
  isActive?: boolean;
}
