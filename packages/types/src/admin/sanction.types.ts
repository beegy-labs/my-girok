// packages/types/src/admin/sanction.types.ts

import {
  SanctionSubjectType,
  SanctionType,
  SanctionStatus,
  SanctionScope,
  SanctionSeverity,
  AppealStatus,
  NotificationChannel,
  NotificationStatus,
} from './sanction.enums.js';

// Re-export enums for convenience
export {
  SanctionSubjectType,
  SanctionType,
  SanctionStatus,
  SanctionScope,
  SanctionSeverity,
  AppealStatus,
  NotificationChannel,
  NotificationStatus,
};

/**
 * Sanction subject info
 */
export interface SanctionSubject {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Sanction issuer info
 */
export interface SanctionIssuer {
  id: string;
  email: string;
  name: string;
}

/**
 * Sanction notification
 */
export interface SanctionNotification {
  id: string;
  sanctionId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Full sanction entity
 */
export interface Sanction {
  id: string;
  subjectId: string;
  subjectType: SanctionSubjectType;
  subject?: SanctionSubject;
  serviceId: string | null;
  scope: SanctionScope;
  type: SanctionType;
  status: SanctionStatus;
  severity: SanctionSeverity;
  restrictedFeatures: string[];
  reason: string;
  internalNote: string | null;
  evidenceUrls: string[];
  issuedBy: string;
  issuer?: SanctionIssuer;
  issuedByType: string;
  startAt: string;
  endAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  appealStatus: AppealStatus | null;
  appealedAt: string | null;
  appealReason: string | null;
  appealReviewedBy: string | null;
  appealReviewedAt: string | null;
  appealResponse: string | null;
  createdAt: string;
  updatedAt: string;
  notifications?: SanctionNotification[];
}

/**
 * List response for sanctions
 */
export interface SanctionListResponse {
  data: Sanction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    serviceId: string;
  };
}

/**
 * Appeal info
 */
export interface SanctionAppeal {
  id: string;
  sanctionId: string;
  appealStatus: AppealStatus | null;
  appealedAt: string | null;
  appealReason: string | null;
  appealReviewedBy: string | null;
  appealReviewedAt: string | null;
  appealResponse: string | null;
}

/**
 * DTO for creating a sanction
 */
export interface CreateSanctionDto {
  subjectId: string;
  subjectType: SanctionSubjectType;
  scope?: SanctionScope;
  type: SanctionType;
  severity?: SanctionSeverity;
  restrictedFeatures?: string[];
  reason: string;
  internalNote?: string;
  evidenceUrls?: string[];
  startAt: string;
  endAt?: string;
  notificationChannels?: NotificationChannel[];
}

/**
 * DTO for updating a sanction
 */
export interface UpdateSanctionDto {
  severity?: SanctionSeverity;
  restrictedFeatures?: string[];
  reason?: string;
  internalNote?: string;
  evidenceUrls?: string[];
  endAt?: string;
  updateReason: string;
}

/**
 * DTO for revoking a sanction
 */
export interface RevokeSanctionDto {
  reason: string;
}

/**
 * DTO for extending a sanction
 */
export interface ExtendSanctionDto {
  newEndAt: string;
  reason: string;
}

/**
 * DTO for reducing a sanction
 */
export interface ReduceSanctionDto {
  newEndAt: string;
  reason: string;
}

/**
 * DTO for reviewing an appeal
 */
export interface ReviewAppealDto {
  status: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  response: string;
}

/**
 * DTO for resending notifications
 */
export interface ResendNotificationsDto {
  channels: NotificationChannel[];
}

/**
 * Query params for listing sanctions
 */
export interface ListSanctionsQuery {
  status?: SanctionStatus;
  type?: SanctionType;
  severity?: SanctionSeverity;
  subjectType?: SanctionSubjectType;
  appealStatus?: AppealStatus;
  page?: number;
  limit?: number;
  sort?: string;
}
