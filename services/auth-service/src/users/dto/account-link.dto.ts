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

export class RequestLinkDto {
  @IsString()
  linkedUserId!: string;
}

export class PlatformConsentInput {
  @IsEnum(ConsentType)
  type!: ConsentType;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsBoolean()
  agreed!: boolean;

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class AcceptLinkDto {
  @IsString()
  linkId!: string;

  @IsString()
  password!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformConsentInput)
  platformConsents!: PlatformConsentInput[];
}

export interface LinkableAccount {
  id: string;
  email: string;
  services: Array<{
    slug: string;
    name: string;
    joinedAt: Date;
  }>;
  createdAt: Date;
}

export interface LinkedAccount {
  id: string;
  linkedUser: {
    id: string;
    email: string;
    name: string | null;
  };
  service: {
    id: string;
    slug: string;
    name: string;
  };
  linkedAt: Date | null;
}

export interface AcceptLinkResult {
  linkedAt: Date;
  accessToken: string;
  refreshToken: string;
}

export interface AccountLinkResponse {
  id: string;
  primaryUserId: string;
  linkedUserId: string;
  linkedServiceId: string;
  status: string;
  createdAt: Date;
  linkedAt: Date | null;
}
