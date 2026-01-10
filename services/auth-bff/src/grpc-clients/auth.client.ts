import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom } from 'rxjs';

// Auth Service Interfaces
export interface AdminLoginRequest {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
}

export interface AdminLoginResponse {
  success: boolean;
  mfaRequired: boolean;
  challengeId: string;
  availableMethods: number[];
  message: string;
  admin?: Admin;
  session?: AdminSession;
  accessToken: string;
  refreshToken: string;
}

export interface AdminLoginMfaRequest {
  challengeId: string;
  code: string;
  method: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
}

export interface AdminLoginMfaResponse {
  success: boolean;
  message: string;
  admin: Admin;
  session: AdminSession;
  accessToken: string;
  refreshToken: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  scope: number;
  roleId: string;
  role?: Role;
  isActive: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  forcePasswordChange: boolean;
  lastLoginAt?: { seconds: number; nanos: number };
  passwordChangedAt?: { seconds: number; nanos: number };
  createdAt: { seconds: number; nanos: number };
  updatedAt: { seconds: number; nanos: number };
}

export interface AdminSession {
  id: string;
  adminId: string;
  mfaVerified: boolean;
  mfaMethod: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  isActive: boolean;
  mfaVerifiedAt?: { seconds: number; nanos: number };
  lastActivityAt: { seconds: number; nanos: number };
  expiresAt: { seconds: number; nanos: number };
  createdAt: { seconds: number; nanos: number };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  scope: number;
  permissions: Permission[];
  createdAt: { seconds: number; nanos: number };
  updatedAt: { seconds: number; nanos: number };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  category: string;
  description: string;
  isSystem: boolean;
}

export interface OperatorAssignment {
  id: string;
  accountId: string;
  serviceId: string;
  countryCode: string;
  status: number;
  assignedBy: string;
  assignedAt: { seconds: number; nanos: number };
  deactivatedAt?: { seconds: number; nanos: number };
  deactivationReason?: string;
  createdAt: { seconds: number; nanos: number };
  updatedAt: { seconds: number; nanos: number };
  permissions: Permission[];
}

export interface AuthServiceClient {
  // Admin Auth
  adminLogin(request: AdminLoginRequest): Observable<AdminLoginResponse>;
  adminLoginMfa(request: AdminLoginMfaRequest): Observable<AdminLoginMfaResponse>;
  adminValidateSession(request: { tokenHash: string }): Observable<{
    valid: boolean;
    adminId: string;
    sessionId: string;
    mfaVerified: boolean;
    expiresAt: { seconds: number; nanos: number };
    message: string;
  }>;
  adminRefreshSession(request: { refreshTokenHash: string }): Observable<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    expiresAt: { seconds: number; nanos: number };
    message: string;
  }>;
  adminLogout(request: { sessionId: string }): Observable<{ success: boolean; message: string }>;
  adminRevokeAllSessions(request: {
    adminId: string;
    excludeSessionId?: string;
    reason: string;
  }): Observable<{ success: boolean; revokedCount: number; message: string }>;
  adminGetActiveSessions(request: {
    adminId: string;
  }): Observable<{ sessions: AdminSession[]; totalCount: number }>;

  // Admin MFA
  adminSetupMfa(request: { adminId: string }): Observable<{
    success: boolean;
    secret: string;
    qrCodeUri: string;
    backupCodes: string[];
    message: string;
  }>;
  adminVerifyMfa(request: {
    adminId: string;
    code: string;
  }): Observable<{ success: boolean; message: string }>;
  adminDisableMfa(request: {
    adminId: string;
    password: string;
  }): Observable<{ success: boolean; message: string }>;
  adminRegenerateBackupCodes(request: {
    adminId: string;
    password: string;
  }): Observable<{ success: boolean; backupCodes: string[]; message: string }>;

  // Admin Password
  adminChangePassword(request: {
    adminId: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<{ success: boolean; message: string }>;
  adminForcePasswordChange(request: {
    adminId: string;
    requesterAdminId: string;
  }): Observable<{ success: boolean; message: string }>;

  // Operator Assignment
  getOperatorAssignment(request: {
    accountId: string;
    serviceId: string;
    countryCode: string;
  }): Observable<{ assignment?: OperatorAssignment; found: boolean }>;
  getOperatorAssignmentPermissions(request: {
    assignmentId: string;
  }): Observable<{ permissions: Permission[] }>;

  // Permission Check
  checkPermission(request: {
    operatorId: string;
    resource: string;
    action: string;
    context: Record<string, string>;
  }): Observable<{ allowed: boolean; reason: string; matchedPermissions: string[] }>;
  getOperatorPermissions(request: {
    operatorId: string;
    includeRolePermissions: boolean;
  }): Observable<{
    permissions: Permission[];
    directPermissions: Permission[];
    rolePermissions: Permission[];
  }>;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AuthGrpcClient.name);
  private authService!: AuthServiceClient;
  private client!: ClientGrpc;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('grpc.auth.host', 'localhost');
    const port = this.configService.get<number>('grpc.auth.port', 50052);

    // Use process.cwd() for Docker compatibility (webpack bundles change __dirname)
    const protoBasePath = join(process.cwd(), '../../packages/proto');
    const { ClientProxyFactory } = require('@nestjs/microservices');
    this.client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'auth.v1',
        protoPath: join(protoBasePath, 'auth/v1/auth.proto'),
        url: `${host}:${port}`,
        loader: {
          keepCase: false,
          longs: Number,
          enums: Number,
          defaults: true,
          oneofs: true,
          includeDirs: [protoBasePath],
        },
      },
    });

    this.authService = this.client.getService<AuthServiceClient>('AuthService');
    this.logger.log(`Auth gRPC client initialized: ${host}:${port}`);
  }

  // Admin Authentication
  async adminLogin(request: AdminLoginRequest): Promise<AdminLoginResponse> {
    return firstValueFrom(this.authService.adminLogin(request));
  }

  async adminLoginMfa(request: AdminLoginMfaRequest): Promise<AdminLoginMfaResponse> {
    return firstValueFrom(this.authService.adminLoginMfa(request));
  }

  async adminValidateSession(tokenHash: string): Promise<{
    valid: boolean;
    adminId: string;
    sessionId: string;
    mfaVerified: boolean;
    message: string;
  }> {
    return firstValueFrom(this.authService.adminValidateSession({ tokenHash }));
  }

  async adminRefreshSession(
    refreshTokenHash: string,
  ): Promise<{ success: boolean; accessToken: string; refreshToken: string; message: string }> {
    return firstValueFrom(this.authService.adminRefreshSession({ refreshTokenHash }));
  }

  async adminLogout(sessionId: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.authService.adminLogout({ sessionId }));
  }

  async adminRevokeAllSessions(
    adminId: string,
    excludeSessionId?: string,
    reason: string = 'User requested',
  ): Promise<{ success: boolean; revokedCount: number }> {
    return firstValueFrom(
      this.authService.adminRevokeAllSessions({ adminId, excludeSessionId, reason }),
    );
  }

  async adminGetActiveSessions(
    adminId: string,
  ): Promise<{ sessions: AdminSession[]; totalCount: number }> {
    return firstValueFrom(this.authService.adminGetActiveSessions({ adminId }));
  }

  // Admin MFA
  async adminSetupMfa(
    adminId: string,
  ): Promise<{ success: boolean; secret: string; qrCodeUri: string; backupCodes: string[] }> {
    return firstValueFrom(this.authService.adminSetupMfa({ adminId }));
  }

  async adminVerifyMfa(
    adminId: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.authService.adminVerifyMfa({ adminId, code }));
  }

  async adminDisableMfa(
    adminId: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.authService.adminDisableMfa({ adminId, password }));
  }

  async adminRegenerateBackupCodes(
    adminId: string,
    password: string,
  ): Promise<{ success: boolean; backupCodes: string[] }> {
    return firstValueFrom(this.authService.adminRegenerateBackupCodes({ adminId, password }));
  }

  // Admin Password
  async adminChangePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(
      this.authService.adminChangePassword({ adminId, currentPassword, newPassword }),
    );
  }

  // Operator Assignment
  async getOperatorAssignment(
    accountId: string,
    serviceId: string,
    countryCode: string,
  ): Promise<{ assignment?: OperatorAssignment; found: boolean }> {
    return firstValueFrom(
      this.authService.getOperatorAssignment({ accountId, serviceId, countryCode }),
    );
  }

  async getOperatorAssignmentPermissions(assignmentId: string): Promise<Permission[]> {
    const response = await firstValueFrom(
      this.authService.getOperatorAssignmentPermissions({ assignmentId }),
    );
    return response.permissions;
  }

  // Permission Check
  async checkPermission(
    operatorId: string,
    resource: string,
    action: string,
    context: Record<string, string> = {},
  ): Promise<{ allowed: boolean; reason: string }> {
    return firstValueFrom(
      this.authService.checkPermission({ operatorId, resource, action, context }),
    );
  }

  async getOperatorPermissions(
    operatorId: string,
    includeRolePermissions: boolean = true,
  ): Promise<Permission[]> {
    const response = await firstValueFrom(
      this.authService.getOperatorPermissions({ operatorId, includeRolePermissions }),
    );
    return response.permissions;
  }
}
