import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Length,
} from 'class-validator';

// Re-use from existing schema
export type LegalDocumentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING_POLICY'
  | 'PERSONALIZED_ADS';

export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING_EMAIL'
  | 'MARKETING_PUSH'
  | 'MARKETING_PUSH_NIGHT'
  | 'MARKETING_SMS'
  | 'PERSONALIZED_ADS'
  | 'THIRD_PARTY_SHARING';

export class CreateLegalDocumentDto {
  @IsEnum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_POLICY', 'PERSONALIZED_ADS'])
  type!: LegalDocumentType;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Locale must be in format: ko, en, ja, or ko-KR',
  })
  locale!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'Version must be semantic format: 1.0.0',
  })
  version!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string; // Markdown content

  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'Country code must be ISO 3166-1 alpha-2 (uppercase)' })
  countryCode?: string;
}

export class UpdateLegalDocumentDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export interface DocumentListQuery {
  type?: LegalDocumentType;
  locale?: string;
  isActive?: boolean;
  serviceId?: string;
  countryCode?: string;
  page?: number;
  limit?: number;
}

export interface DocumentResponse {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  effectiveDate: Date;
  isActive: boolean;
  serviceId: string | null;
  countryCode: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentListResponse {
  items: DocumentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConsentListQuery {
  consentType?: ConsentType;
  userId?: string;
  agreed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ConsentResponse {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    region: string | null;
  };
  consentType: ConsentType;
  documentId: string | null;
  documentVersion: string | null;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt: Date | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ConsentListResponse {
  items: ConsentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConsentStatsResponse {
  byType: Array<{
    type: ConsentType;
    total: number;
    agreed: number;
    withdrawn: number;
    rate: number;
  }>;
  byRegion: Array<{
    region: string;
    total: number;
  }>;
  recentActivity: Array<{
    date: string;
    agreed: number;
    withdrawn: number;
  }>;
  summary: {
    totalConsents: number;
    totalUsers: number;
    overallAgreementRate: number;
  };
}
