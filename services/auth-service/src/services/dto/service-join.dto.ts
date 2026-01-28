import {
  IsString,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentType } from '@my-girok/types';

/**
 * DTOs for Service Join and Consent API
 * Issue: #356
 */

export class ConsentInput {
  @IsEnum(ConsentType)
  type!: ConsentType;

  @IsBoolean()
  agreed!: boolean;

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class ServiceJoinRequest {
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentInput)
  consents!: ConsentInput[];
}

export class AddCountryConsentRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentInput)
  consents!: ConsentInput[];
}

export class UpdateConsentRequest {
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsBoolean()
  agreed!: boolean;
}

export class WithdrawServiceRequest {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// Response types
export interface ConsentRequirementResponse {
  type: ConsentType;
  isRequired: boolean;
}

export interface ServiceJoinResponse {
  userService: {
    id: string;
    serviceId: string;
    serviceSlug: string;
    countryCode: string;
    status: string;
    joinedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export interface AddCountryConsentResponse {
  countryCode: string;
  accessToken: string;
  refreshToken: string;
}

export interface UserConsentResponse {
  id: string;
  consentType: ConsentType;
  countryCode: string;
  documentId?: string;
  agreed: boolean;
  agreedAt?: Date;
  withdrawnAt?: Date;
}

export interface UpdateConsentResponse {
  consent: UserConsentResponse;
  accessToken?: string;
  refreshToken?: string;
}

// Verify Service Domain DTOs
export class VerifyServiceDomainDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsString()
  domain?: string;
}

export interface VerifyServiceDomainResponse {
  valid: boolean;
  service?: {
    id: string;
    slug: string;
    name: string;
    domainValidation: boolean;
  };
  reason?: string;
}
