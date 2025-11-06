import { AuthProvider, Role } from './enums';

/**
 * Registration data transfer object
 */
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

/**
 * Login data transfer object
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Authentication response payload
 */
export interface AuthPayload {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}

/**
 * User payload for auth responses
 */
export interface UserPayload {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: Role;
  provider: AuthProvider;
  emailVerified: boolean;
  createdAt: Date;
}

/**
 * Refresh token request
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * Token response
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Domain access grant request
 */
export interface GrantDomainAccessDto {
  domain: string;
  expiresInHours: number;
  recipientEmail?: string;
}

/**
 * Domain access response
 */
export interface DomainAccessPayload {
  accessToken: string;
  expiresAt: Date;
  accessUrl: string;
}

/**
 * Update profile request
 */
export interface UpdateProfileDto {
  name?: string;
  avatar?: string;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  type: 'ACCESS' | 'REFRESH' | 'DOMAIN_ACCESS';
  domain?: string; // For domain access tokens
  iat?: number;
  exp?: number;
}
