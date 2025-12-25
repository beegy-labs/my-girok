import { IsOptional, IsString, IsDateString, IsEnum, MaxLength, Length } from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export class UpdatePersonalInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  phoneCountryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export interface PersonalInfoResponse {
  id: string;
  name: string | null;
  birthDate: string | null;
  gender: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
