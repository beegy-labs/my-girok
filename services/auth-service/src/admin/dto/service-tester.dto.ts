import { IsString, IsBoolean, IsOptional, IsUUID, IsDateString, MaxLength } from 'class-validator';

// User Tester DTOs
export class CreateTesterUserDto {
  @IsUUID()
  userId!: string;

  @IsBoolean()
  @IsOptional()
  bypassAll?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassDomain?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassIP?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassRate?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class UpdateTesterUserDto {
  @IsBoolean()
  @IsOptional()
  bypassAll?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassDomain?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassIP?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassRate?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class DeleteTesterDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

// Admin Tester DTOs
export class CreateTesterAdminDto {
  @IsUUID()
  adminId!: string;

  @IsBoolean()
  @IsOptional()
  bypassAll?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassDomain?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

// Query DTOs
export class ListTesterUsersQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  expiresWithin?: string; // e.g., "7d", "30d"
}

// Response DTOs
export interface TesterUserResponseDto {
  id: string;
  serviceId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
  bypassAll: boolean;
  bypassDomain: boolean;
  bypassIP: boolean;
  bypassRate: boolean;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface TesterAdminResponseDto {
  id: string;
  serviceId: string;
  adminId: string;
  admin: {
    id: string;
    email: string;
    name: string;
  };
  bypassAll: boolean;
  bypassDomain: boolean;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
}

export interface TesterUserListResponseDto {
  data: TesterUserResponseDto[];
  meta: {
    total: number;
    serviceId: string;
  };
}

export interface TesterAdminListResponseDto {
  data: TesterAdminResponseDto[];
  meta: {
    total: number;
    serviceId: string;
  };
}
