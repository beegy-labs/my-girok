/**
 * Test Factory for creating test data
 * Provides factory functions for creating consistent test entities
 */

import {
  SanctionSubjectType,
  SanctionType,
  SanctionStatus,
  SanctionScope,
  SanctionSeverity,
  AppealStatus,
  SanctionResponseDto,
} from '../../src/admin/dto/sanction.dto';
import { AdminPayload } from '../../src/admin/types/admin.types';
import { OperatorResponse } from '../../src/admin/dto/operator.dto';

let counter = 0;

/**
 * Generate a unique test ID (UUIDv7-like format)
 */
export function generateTestId(): string {
  counter++;
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = counter.toString(16).padStart(12, '0');
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 12).padEnd(12, '0')}`;
}

/**
 * Reset the counter (call in beforeEach)
 */
export function resetTestCounter(): void {
  counter = 0;
}

// ============================================================================
// Admin Payload Factory
// ============================================================================

export interface CreateAdminPayloadOptions {
  id?: string;
  email?: string;
  name?: string;
  scope?: 'SYSTEM' | 'TENANT';
  tenantId?: string | null;
  roleId?: string;
  roleName?: string;
  level?: number;
  permissions?: string[];
}

export function createAdminPayload(options: CreateAdminPayloadOptions = {}): AdminPayload {
  const id = options.id ?? generateTestId();
  return {
    sub: id,
    email: options.email ?? `admin-${id.slice(0, 8)}@test.com`,
    name: options.name ?? 'Test Admin',
    type: 'ADMIN_ACCESS',
    accountMode: 'UNIFIED',
    scope: options.scope ?? 'SYSTEM',
    tenantId: options.tenantId ?? null,
    tenantSlug: null,
    tenantType: null,
    roleId: options.roleId ?? generateTestId(),
    roleName: options.roleName ?? 'Super Admin',
    level: options.level ?? 100,
    permissions: options.permissions ?? ['*'],
    services: {},
  };
}

export function createSystemAdmin(
  options: Omit<CreateAdminPayloadOptions, 'scope'> = {},
): AdminPayload {
  return createAdminPayload({
    ...options,
    scope: 'SYSTEM',
    permissions: options.permissions ?? ['*'],
  });
}

export function createTenantAdmin(
  tenantId: string,
  options: Omit<CreateAdminPayloadOptions, 'scope' | 'tenantId'> = {},
): AdminPayload {
  return createAdminPayload({
    ...options,
    scope: 'TENANT',
    tenantId,
    permissions: options.permissions ?? ['partner_admin:*', 'audit:read'],
  });
}

// ============================================================================
// Sanction Factory
// ============================================================================

export interface CreateSanctionOptions {
  id?: string;
  subjectId?: string;
  subjectType?: SanctionSubjectType;
  serviceId?: string | null;
  scope?: SanctionScope;
  type?: SanctionType;
  status?: SanctionStatus;
  severity?: SanctionSeverity;
  restrictedFeatures?: string[];
  reason?: string;
  internalNote?: string | null;
  evidenceUrls?: string[];
  issuedBy?: string;
  startAt?: Date;
  endAt?: Date | null;
  appealStatus?: AppealStatus | null;
  appealedAt?: Date | null;
  appealReason?: string | null;
}

export function createSanctionResponse(options: CreateSanctionOptions = {}): SanctionResponseDto {
  const id = options.id ?? generateTestId();
  const subjectId = options.subjectId ?? generateTestId();
  const issuedBy = options.issuedBy ?? generateTestId();
  const now = new Date();

  return {
    id,
    subjectId,
    subjectType: options.subjectType ?? SanctionSubjectType.USER,
    subject: {
      id: subjectId,
      email: `user-${subjectId.slice(0, 8)}@test.com`,
      name: 'Test User',
    },
    serviceId: options.serviceId ?? generateTestId(),
    scope: options.scope ?? SanctionScope.SERVICE,
    type: options.type ?? SanctionType.WARNING,
    status: options.status ?? SanctionStatus.ACTIVE,
    severity: options.severity ?? SanctionSeverity.MEDIUM,
    restrictedFeatures: options.restrictedFeatures ?? [],
    reason: options.reason ?? 'Test reason for sanction',
    internalNote: options.internalNote ?? null,
    evidenceUrls: options.evidenceUrls ?? [],
    issuedBy,
    issuer: {
      id: issuedBy,
      email: `admin-${issuedBy.slice(0, 8)}@test.com`,
      name: 'Test Admin',
    },
    issuedByType: 'ADMIN',
    startAt: options.startAt ?? now,
    endAt: options.endAt ?? null,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    appealStatus: options.appealStatus ?? null,
    appealedAt: options.appealedAt ?? null,
    appealReason: options.appealReason ?? null,
    appealReviewedBy: null,
    appealReviewedAt: null,
    appealResponse: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTemporaryBanSanction(
  endAt: Date,
  options: Omit<CreateSanctionOptions, 'type' | 'endAt'> = {},
): SanctionResponseDto {
  return createSanctionResponse({
    ...options,
    type: SanctionType.TEMPORARY_BAN,
    endAt,
  });
}

export function createFeatureRestrictionSanction(
  features: string[],
  options: Omit<CreateSanctionOptions, 'type' | 'restrictedFeatures'> = {},
): SanctionResponseDto {
  return createSanctionResponse({
    ...options,
    type: SanctionType.FEATURE_RESTRICTION,
    restrictedFeatures: features,
  });
}

// ============================================================================
// Operator Factory
// ============================================================================

export interface CreateOperatorOptions {
  id?: string;
  email?: string;
  name?: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  countryCode?: string;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  permissions?: Array<{
    id: string;
    resource: string;
    action: string;
    displayName: string;
  }>;
}

export function createOperatorResponse(options: CreateOperatorOptions = {}): OperatorResponse {
  const id = options.id ?? generateTestId();
  const serviceId = options.serviceId ?? generateTestId();
  const now = new Date();

  return {
    id,
    email: options.email ?? `operator-${id.slice(0, 8)}@test.com`,
    name: options.name ?? 'Test Operator',
    serviceId,
    serviceSlug: options.serviceSlug ?? 'test-service',
    serviceName: options.serviceName ?? 'Test Service',
    countryCode: options.countryCode ?? 'KR',
    isActive: options.isActive ?? true,
    lastLoginAt: options.lastLoginAt ?? null,
    createdAt: options.createdAt ?? now,
    permissions: options.permissions ?? [
      {
        id: generateTestId(),
        resource: 'content',
        action: 'read',
        displayName: 'View Content',
      },
    ],
  };
}

// ============================================================================
// Outbox Event Factory
// ============================================================================

export interface CreateOutboxEventOptions {
  id?: string;
  eventType?: string;
  aggregateId?: string;
  payload?: Record<string, unknown>;
  status?: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount?: number;
  publishedAt?: Date | null;
  errorMessage?: string | null;
  createdAt?: Date;
}

export function createOutboxEvent(options: CreateOutboxEventOptions = {}) {
  const id = options.id ?? generateTestId();
  const now = new Date();

  return {
    id,
    eventType: options.eventType ?? 'TEST_EVENT',
    aggregateId: options.aggregateId ?? generateTestId(),
    payload: options.payload ?? { test: 'data' },
    status: options.status ?? 'PENDING',
    retryCount: options.retryCount ?? 0,
    publishedAt: options.publishedAt ?? null,
    errorMessage: options.errorMessage ?? null,
    createdAt: options.createdAt ?? now,
  };
}

// ============================================================================
// Service Factory
// ============================================================================

export function createService(options: { id?: string; slug?: string; name?: string } = {}) {
  const id = options.id ?? generateTestId();
  return {
    id,
    slug: options.slug ?? `service-${id.slice(0, 8)}`,
    name: options.name ?? 'Test Service',
  };
}

// ============================================================================
// Permission Factory
// ============================================================================

export function createPermission(
  options: { id?: string; resource?: string; action?: string; displayName?: string } = {},
) {
  const id = options.id ?? generateTestId();
  return {
    id,
    resource: options.resource ?? 'content',
    action: options.action ?? 'read',
    displayName: options.displayName ?? 'View Content',
  };
}
