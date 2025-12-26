import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  MinLength,
  Length,
  IsUUID,
} from 'class-validator';

export enum InvitationType {
  EMAIL = 'EMAIL',
  DIRECT = 'DIRECT',
}

export class CreateOperatorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  serviceSlug!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsString()
  @MinLength(8)
  tempPassword!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}

export class InviteOperatorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  serviceSlug!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsEnum(InvitationType)
  type!: InvitationType;

  @IsOptional()
  @IsString()
  @MinLength(8)
  tempPassword?: string;

  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}

export class UpdateOperatorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GrantPermissionDto {
  @IsUUID()
  permissionId!: string;
}

export class OperatorListQueryDto {
  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

export interface OperatorResponse {
  id: string;
  email: string;
  name: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  countryCode: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  permissions: PermissionResponse[];
}

export interface OperatorListResponse {
  operators: OperatorResponse[];
  total: number;
}

export interface PermissionResponse {
  id: string;
  resource: string;
  action: string;
  displayName: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  name: string;
  type: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}
