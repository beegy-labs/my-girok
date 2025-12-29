import { IsString, IsBoolean, IsOptional, IsInt, Length, Matches, Min } from 'class-validator';

// ============================================================
// SUPPORTED COUNTRIES
// ============================================================

export class CreateSupportedCountryDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'Country code must be ISO 3166-1 alpha-2 (e.g., KR, US, JP)' })
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  nativeName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  flagEmoji?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateSupportedCountryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  nativeName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  flagEmoji?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export interface SupportedCountryResponse {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportedCountryListResponse {
  data: SupportedCountryResponse[];
  meta: {
    total: number;
  };
}

// ============================================================
// SUPPORTED LOCALES
// ============================================================

export class CreateSupportedLocaleDto {
  @IsString()
  @Length(2, 10)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Locale code must be in format: ko, en, ja, or ko-KR',
  })
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  nativeName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  flagEmoji?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateSupportedLocaleDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  nativeName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  flagEmoji?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export interface SupportedLocaleResponse {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportedLocaleListResponse {
  data: SupportedLocaleResponse[];
  meta: {
    total: number;
  };
}
