/**
 * Account Link Types
 * SERVICE → UNIFIED account linking types
 */

import { ConsentType } from '../legal/enums.js';

export enum AccountLinkStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  UNLINKED = 'UNLINKED',
}

/**
 * User row type (from database query)
 * Used in account-linking.service.ts for raw SQL results
 */
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password?: string | null;
  accountMode: string;
  createdAt: Date;
}

/**
 * Account link row type (from database query)
 */
export interface AccountLinkRow {
  id: string;
  primaryUserId: string;
  linkedUserId: string;
  linkedServiceId: string;
  status: string;
  linkedAt: Date | null;
  createdAt: Date;
}

export interface AccountLink {
  id: string;
  primaryUserId: string;
  linkedUserId: string;
  linkedServiceId: string;
  status: AccountLinkStatus;
  linkedAt?: Date;
  createdAt: Date;
}

export interface PlatformConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  countryCode: string;
  documentId?: string;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateAccountLinkDto {
  linkedUserId: string;
  linkedServiceId: string;
}

export interface AcceptAccountLinkDto {
  linkId: string;
}

export interface CreatePlatformConsentDto {
  consentType: ConsentType;
  countryCode: string;
  documentId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface WithdrawPlatformConsentDto {
  consentType: ConsentType;
  countryCode: string;
}
