import { AccountType } from '../../config/constants';

export interface BffSession {
  id: string;
  accountType: AccountType;
  accountId: string;
  email: string;
  appSlug?: string;
  serviceId?: string;
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  deviceFingerprint: string;
  mfaVerified: boolean;
  mfaRequired: boolean;
  permissions?: string[];
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  location?: string;
}

export interface CreateSessionInput {
  accountType: AccountType;
  accountId: string;
  email: string;
  appSlug?: string;
  serviceId?: string;
  accessToken: string;
  refreshToken: string;
  deviceFingerprint: string;
  mfaVerified?: boolean;
  mfaRequired?: boolean;
  permissions?: string[];
  metadata?: SessionMetadata;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: BffSession;
  error?: string;
}

export interface ActiveSession {
  id: string;
  accountType: AccountType;
  deviceFingerprint: string;
  createdAt: Date;
  lastActivityAt: Date;
  metadata?: SessionMetadata;
  isCurrent: boolean;
}
