import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

export class AdminRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    name: string;
    scope: string;
    tenantId: string | null;
    tenantSlug?: string;
    roleName: string;
    permissions: string[];
  };
}

export interface AdminProfileResponse {
  id: string;
  email: string;
  name: string;
  scope: string;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  role: {
    id: string;
    name: string;
    displayName: string;
    level: number;
  };
  permissions: string[];
  lastLoginAt: Date | null;
  createdAt: Date;
}
