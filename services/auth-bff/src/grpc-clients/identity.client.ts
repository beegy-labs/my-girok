import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom } from 'rxjs';

// Identity Service Interfaces
export interface CreateAccountRequest {
  email: string;
  username: string;
  password?: string;
  provider: number;
  providerId?: string;
  mode: number;
  region?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
}

export interface Account {
  id: string;
  email: string;
  username: string;
  status: number;
  mode: number;
  mfaEnabled: boolean;
  emailVerified: boolean;
  createdAt: { seconds: number; nanos: number };
  updatedAt: { seconds: number; nanos: number };
}

export interface ValidatePasswordRequest {
  accountId: string;
  password: string;
}

export interface CreateSessionRequest {
  accountId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresInMs?: number;
  sessionContext: number;
  serviceId?: string;
  operatorAssignmentId?: string;
}

export interface CreateSessionResponse {
  session: {
    id: string;
    accountId: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
    createdAt: { seconds: number; nanos: number };
    expiresAt: { seconds: number; nanos: number };
    lastActivityAt: { seconds: number; nanos: number };
    sessionContext: number;
    serviceId?: string;
    operatorAssignmentId?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface SetupMfaResponse {
  success: boolean;
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
  message: string;
}

export interface VerifyMfaCodeRequest {
  accountId: string;
  code: string;
  method: number;
}

export interface IdentityServiceClient {
  getAccount(request: { id: string }): Observable<{ account: Account }>;
  getAccountByEmail(request: { email: string }): Observable<{ account: Account }>;
  getAccountByUsername(request: { username: string }): Observable<{ account: Account }>;
  createAccount(request: CreateAccountRequest): Observable<{ account: Account }>;
  validatePassword(
    request: ValidatePasswordRequest,
  ): Observable<{ valid: boolean; message: string }>;
  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse>;
  validateSession(request: { tokenHash: string }): Observable<{
    valid: boolean;
    accountId: string;
    sessionId: string;
    expiresAt: { seconds: number; nanos: number };
    message: string;
  }>;
  revokeSession(request: {
    sessionId: string;
    reason: string;
  }): Observable<{ success: boolean; message: string }>;
  revokeAllSessions(request: {
    accountId: string;
    excludeSessionId?: string;
    reason: string;
  }): Observable<{ success: boolean; revokedCount: number; message: string }>;
  changePassword(request: {
    accountId: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<{ success: boolean; message: string }>;
  setupMfa(request: { accountId: string }): Observable<SetupMfaResponse>;
  verifyMfaSetup(request: {
    accountId: string;
    code: string;
  }): Observable<{ success: boolean; message: string }>;
  verifyMfaCode(request: VerifyMfaCodeRequest): Observable<{ success: boolean; message: string }>;
  disableMfa(request: {
    accountId: string;
    password: string;
  }): Observable<{ success: boolean; message: string }>;
  getBackupCodes(request: {
    accountId: string;
  }): Observable<{ remainingCount: number; generatedAt: { seconds: number; nanos: number } }>;
  regenerateBackupCodes(request: {
    accountId: string;
    password: string;
  }): Observable<{ success: boolean; backupCodes: string[]; message: string }>;
  useBackupCode(request: {
    accountId: string;
    code: string;
  }): Observable<{ success: boolean; remainingCount: number; message: string }>;
  recordLoginAttempt(request: {
    accountId: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failureReason: string;
  }): Observable<{
    accountLocked: boolean;
    failedAttempts: number;
    maxAttempts: number;
    lockedUntil?: { seconds: number; nanos: number };
  }>;
  lockAccount(request: { accountId: string; durationMinutes: number; reason: string }): Observable<{
    success: boolean;
    lockedUntil: { seconds: number; nanos: number };
    message: string;
  }>;
  unlockAccount(request: {
    accountId: string;
    unlockedBy: string;
  }): Observable<{ success: boolean; message: string }>;
  getProfile(request: { accountId: string }): Observable<{ profile: unknown }>;
}

@Injectable()
export class IdentityGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(IdentityGrpcClient.name);
  private identityService!: IdentityServiceClient;
  private client!: ClientGrpc;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('grpc.identity.host', 'localhost');
    const port = this.configService.get<number>('grpc.identity.port', 50051);

    // Dynamic client creation
    // Use process.cwd() for Docker compatibility (webpack bundles change __dirname)
    const protoBasePath = join(process.cwd(), '../../packages/proto');
    const { ClientProxyFactory } = require('@nestjs/microservices');
    this.client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'identity.v1',
        protoPath: join(protoBasePath, 'identity/v1/identity.proto'),
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

    this.identityService = this.client.getService<IdentityServiceClient>('IdentityService');
    this.logger.log(`Identity gRPC client initialized: ${host}:${port}`);
  }

  async getAccount(id: string): Promise<Account | null> {
    try {
      const response = await firstValueFrom(this.identityService.getAccount({ id }));
      return response.account;
    } catch {
      return null;
    }
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    try {
      const response = await firstValueFrom(this.identityService.getAccountByEmail({ email }));
      return response.account;
    } catch {
      return null;
    }
  }

  async createAccount(request: CreateAccountRequest): Promise<Account> {
    const response = await firstValueFrom(this.identityService.createAccount(request));
    return response.account;
  }

  async validatePassword(
    accountId: string,
    password: string,
  ): Promise<{ valid: boolean; message: string }> {
    return firstValueFrom(this.identityService.validatePassword({ accountId, password }));
  }

  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    return firstValueFrom(this.identityService.createSession(request));
  }

  async recordLoginAttempt(
    accountId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason: string,
  ): Promise<{ accountLocked: boolean; failedAttempts: number; maxAttempts: number }> {
    return firstValueFrom(
      this.identityService.recordLoginAttempt({
        accountId,
        email,
        ipAddress,
        userAgent,
        success,
        failureReason,
      }),
    );
  }

  async setupMfa(accountId: string): Promise<SetupMfaResponse> {
    return firstValueFrom(this.identityService.setupMfa({ accountId }));
  }

  async verifyMfaSetup(
    accountId: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.identityService.verifyMfaSetup({ accountId, code }));
  }

  async verifyMfaCode(
    accountId: string,
    code: string,
    method: number,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.identityService.verifyMfaCode({ accountId, code, method }));
  }

  async disableMfa(
    accountId: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.identityService.disableMfa({ accountId, password }));
  }

  async getBackupCodes(accountId: string): Promise<{ remainingCount: number }> {
    return firstValueFrom(this.identityService.getBackupCodes({ accountId }));
  }

  async regenerateBackupCodes(
    accountId: string,
    password: string,
  ): Promise<{ success: boolean; backupCodes: string[]; message: string }> {
    return firstValueFrom(this.identityService.regenerateBackupCodes({ accountId, password }));
  }

  async useBackupCode(
    accountId: string,
    code: string,
  ): Promise<{ success: boolean; remainingCount: number; message: string }> {
    return firstValueFrom(this.identityService.useBackupCode({ accountId, code }));
  }

  async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(
      this.identityService.changePassword({ accountId, currentPassword, newPassword }),
    );
  }

  async revokeAllSessions(
    accountId: string,
    excludeSessionId?: string,
    reason: string = 'User requested',
  ): Promise<{ success: boolean; revokedCount: number }> {
    return firstValueFrom(
      this.identityService.revokeAllSessions({ accountId, excludeSessionId, reason }),
    );
  }
}
