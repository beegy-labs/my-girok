import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsIP,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

// Enum matching Prisma schema
export enum AuditLevel {
  MINIMAL = 'MINIMAL',
  STANDARD = 'STANDARD',
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
}

// Domain DTOs
export class AddDomainDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
    message: 'Invalid domain format',
  })
  domain!: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export interface DomainResponseDto {
  domains: string[];
  primaryDomain: string | null;
}

// Config DTOs
export class UpdateServiceConfigDto {
  // Validation
  @IsBoolean()
  @IsOptional()
  jwtValidation?: boolean;

  @IsBoolean()
  @IsOptional()
  domainValidation?: boolean;

  @IsBoolean()
  @IsOptional()
  ipWhitelistEnabled?: boolean;

  @IsArray()
  @IsIP(undefined, { each: true })
  @IsOptional()
  ipWhitelist?: string[];

  // Rate Limiting
  @IsBoolean()
  @IsOptional()
  rateLimitEnabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(100000)
  @IsOptional()
  rateLimitRequests?: number;

  @IsInt()
  @Min(1)
  @Max(3600)
  @IsOptional()
  rateLimitWindow?: number;

  // Feature Flags
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  maintenanceMessage?: string;

  // Audit
  @IsEnum(AuditLevel)
  @IsOptional()
  auditLevel?: AuditLevel;

  // Required for audit trail
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export interface ServiceConfigResponseDto {
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
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}
