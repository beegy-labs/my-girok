import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class OperatorLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  serviceSlug!: string;
}

export class OperatorRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export interface OperatorLoginResponse {
  accessToken: string;
  refreshToken: string;
  operator: {
    id: string;
    email: string;
    name: string;
    serviceSlug: string;
    serviceName: string;
    countryCode: string;
    permissions: string[];
  };
}

export interface OperatorProfileResponse {
  id: string;
  email: string;
  name: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  countryCode: string;
  isActive: boolean;
  permissions: string[];
  lastLoginAt: Date | null;
  createdAt: Date;
}
