import { AuthProvider, Role } from '../auth/enums.js';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: Role;
  provider: AuthProvider;
  providerId: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session entity
 */
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Domain access token entity
 */
export interface DomainAccessToken {
  id: string;
  userId: string;
  domain: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
