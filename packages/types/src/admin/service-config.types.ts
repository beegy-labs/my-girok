// packages/types/src/admin/service-config.types.ts

/**
 * Audit level for service logging granularity
 */
export type AuditLevel = 'MINIMAL' | 'STANDARD' | 'VERBOSE' | 'DEBUG';

/**
 * Service configuration for validation and audit settings
 */
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

/**
 * Domain response for service domain management
 */
export interface DomainResponse {
  domains: string[];
  primaryDomain: string | null;
}

/**
 * DTO for adding a domain to a service
 */
export interface AddDomainDto {
  domain: string;
  isPrimary?: boolean;
}

/**
 * DTO for updating service configuration
 */
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
