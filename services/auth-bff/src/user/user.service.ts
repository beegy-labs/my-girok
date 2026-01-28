import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  IdentityGrpcClient,
  AuditGrpcClient,
  Account,
  AccountType as AuditAccountType,
} from '../grpc-clients';
import { SessionService } from '../session/session.service';
import { BffSession } from '../common/types';
import { UserRegisterDto, UserLoginDto, UserInfoDto, UserLoginResponseDto } from './dto/user.dto';
import { AccountType } from '../config/constants';

// Auth provider enum matching proto
const AUTH_PROVIDER = {
  LOCAL: 1,
  GOOGLE: 2,
  APPLE: 3,
  KAKAO: 4,
  NAVER: 5,
} as const;

// Account mode enum matching proto
const ACCOUNT_MODE = {
  USER: 1,
  ADMIN: 2,
  OPERATOR: 3,
  SERVICE: 4,
} as const;

// Session context enum matching proto
const SESSION_CONTEXT = {
  USER: 1,
  OPERATOR: 2,
} as const;

// MFA method enum
const MFA_METHOD = {
  TOTP: 1,
  BACKUP_CODE: 2,
} as const;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  // Store pending MFA challenges (in production, use Redis)
  private readonly mfaChallenges = new Map<
    string,
    { accountId: string; email: string; expiresAt: Date }
  >();

  constructor(
    private readonly identityClient: IdentityGrpcClient,
    private readonly auditClient: AuditGrpcClient,
    private readonly sessionService: SessionService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    req: Request,
    res: Response,
    dto: UserRegisterDto,
  ): Promise<{ success: boolean; user: UserInfoDto; message: string }> {
    try {
      // Verify service and domain (X-Service-Id + optional domain validation)
      await this.verifyServiceDomain(req);

      // Check if account already exists
      const existingAccount = await this.identityClient.getAccountByEmail(dto.email);
      if (existingAccount) {
        throw new ConflictException('Email already registered');
      }

      // Create account
      const account = await this.identityClient.createAccount({
        email: dto.email,
        username: dto.username,
        password: dto.password,
        provider: AUTH_PROVIDER.LOCAL,
        mode: ACCOUNT_MODE.USER,
        countryCode: dto.countryCode,
        locale: dto.locale,
        timezone: dto.timezone,
      });

      // Create session
      const ip = this.getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      const sessionResponse = await this.identityClient.createSession({
        accountId: account.id,
        ipAddress: ip,
        userAgent,
        sessionContext: SESSION_CONTEXT.USER,
      });

      // Create BFF session
      const metadata = this.sessionService.extractMetadata(req);
      const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

      await this.sessionService.createSession(
        res,
        {
          accountType: AccountType.USER,
          accountId: account.id,
          email: account.email,
          accessToken: sessionResponse.accessToken,
          refreshToken: sessionResponse.refreshToken,
          deviceFingerprint,
          mfaVerified: false,
          mfaRequired: false,
        },
        metadata,
      );

      this.logger.log(`User registered: ${account.email}`);

      return {
        success: true,
        user: this.mapAccountToDto(account),
        message: 'Registration successful',
      };
    } catch (error) {
      this.logger.error('User registration failed', error);
      if (error instanceof ConflictException) throw error;
      throw new UnauthorizedException('Registration failed');
    }
  }

  async login(req: Request, res: Response, dto: UserLoginDto): Promise<UserLoginResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Verify service and domain (X-Service-Id + optional domain validation)
      await this.verifyServiceDomain(req);

      // Get account
      const account = await this.identityClient.getAccountByEmail(dto.email);
      if (!account) {
        // Record failed attempt with fake account ID
        await this.identityClient.recordLoginAttempt(
          'unknown',
          dto.email,
          ip,
          userAgent,
          false,
          'Account not found',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Validate password
      const passwordResult = await this.identityClient.validatePassword(account.id, dto.password);
      if (!passwordResult.valid) {
        // Record failed attempt
        const attemptResult = await this.identityClient.recordLoginAttempt(
          account.id,
          dto.email,
          ip,
          userAgent,
          false,
          'Invalid password',
        );

        if (attemptResult.accountLocked) {
          throw new UnauthorizedException('Account locked due to too many failed attempts');
        }

        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if MFA is enabled
      if (account.mfaEnabled) {
        // Create MFA challenge
        const challengeId = this.generateChallengeId();
        this.mfaChallenges.set(challengeId, {
          accountId: account.id,
          email: account.email,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        });

        return {
          success: true,
          mfaRequired: true,
          challengeId,
          availableMethods: ['totp', 'backup_code'],
          message: 'MFA verification required',
        };
      }

      // No MFA - create session
      return this.completeLogin(req, res, account, ip, userAgent);
    } catch (error) {
      this.logger.error(`User login failed for ${dto.email}`, error);

      // Log failed login to audit service
      this.auditClient.logLoginFailed({
        accountId: dto.email,
        accountType: AuditAccountType.USER,
        ipAddress: ip,
        userAgent,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Login failed');
    }
  }

  async loginMfa(
    req: Request,
    res: Response,
    challengeId: string,
    code: string,
    method: 'totp' | 'backup_code',
  ): Promise<{ success: boolean; user: UserInfoDto; message: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Get challenge
    const challenge = this.mfaChallenges.get(challengeId);
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    if (challenge.expiresAt < new Date()) {
      this.mfaChallenges.delete(challengeId);
      throw new UnauthorizedException('Challenge expired');
    }

    try {
      // Verify MFA code
      const mfaMethod = method === 'totp' ? MFA_METHOD.TOTP : MFA_METHOD.BACKUP_CODE;

      if (method === 'backup_code') {
        const result = await this.identityClient.useBackupCode(challenge.accountId, code);
        if (!result.success) {
          throw new UnauthorizedException('Invalid backup code');
        }
      } else {
        const result = await this.identityClient.verifyMfaCode(
          challenge.accountId,
          code,
          mfaMethod,
        );
        if (!result.success) {
          throw new UnauthorizedException('Invalid MFA code');
        }
      }

      // Get account info
      const account = await this.identityClient.getAccount(challenge.accountId);
      if (!account) {
        throw new UnauthorizedException('Account not found');
      }

      // Delete challenge
      this.mfaChallenges.delete(challengeId);

      // Create session with MFA verified
      const sessionResponse = await this.identityClient.createSession({
        accountId: account.id,
        ipAddress: ip,
        userAgent,
        sessionContext: SESSION_CONTEXT.USER,
      });

      const metadata = this.sessionService.extractMetadata(req);
      const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

      await this.sessionService.createSession(
        res,
        {
          accountType: AccountType.USER,
          accountId: account.id,
          email: account.email,
          accessToken: sessionResponse.accessToken,
          refreshToken: sessionResponse.refreshToken,
          deviceFingerprint,
          mfaVerified: true,
          mfaRequired: true,
        },
        metadata,
      );

      // Record successful login
      await this.identityClient.recordLoginAttempt(
        account.id,
        account.email,
        ip,
        userAgent,
        true,
        '',
      );

      // Log successful MFA verification to audit service
      this.auditClient.logMfaVerified({
        accountId: account.id,
        accountType: AuditAccountType.USER,
        ipAddress: ip,
        userAgent,
        method,
      });

      return {
        success: true,
        user: this.mapAccountToDto(account),
        message: 'Login successful',
      };
    } catch (error) {
      this.logger.error('User MFA login failed', error);

      // Log failed MFA to audit service
      this.auditClient.logMfaFailed({
        accountId: challengeId,
        accountType: AuditAccountType.USER,
        ipAddress: ip,
        userAgent,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('MFA verification failed');
    }
  }

  async logout(req: Request, res: Response): Promise<{ success: boolean; message: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      const session = await this.sessionService.getSession(req);

      if (session) {
        // Log logout event to audit service
        this.auditClient.logLogout({
          accountId: session.accountId,
          accountType: AuditAccountType.USER,
          sessionId: session.id,
          ipAddress: ip,
          userAgent,
        });
      }

      await this.sessionService.destroySession(req, res);
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('User logout failed', error);
      await this.sessionService.destroySession(req, res);
      return { success: true, message: 'Logged out' };
    }
  }

  async getMe(session: BffSession): Promise<UserInfoDto> {
    const account = await this.identityClient.getAccount(session.accountId);
    if (!account) {
      throw new UnauthorizedException('Account not found');
    }
    return this.mapAccountToDto(account);
  }

  async setupMfa(
    session: BffSession,
  ): Promise<{ secret: string; qrCodeUri: string; backupCodes: string[] }> {
    try {
      const response = await this.identityClient.setupMfa(session.accountId);
      return {
        secret: response.secret,
        qrCodeUri: response.qrCodeUri,
        backupCodes: response.backupCodes,
      };
    } catch (error) {
      this.logger.error('Failed to setup MFA', error);
      throw new UnauthorizedException('Failed to setup MFA');
    }
  }

  async verifyMfaSetup(
    session: BffSession,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await this.identityClient.verifyMfaSetup(session.accountId, code);
    } catch (error) {
      this.logger.error('Failed to verify MFA setup', error);
      throw new UnauthorizedException('Failed to verify MFA');
    }
  }

  async disableMfa(
    session: BffSession,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await this.identityClient.disableMfa(session.accountId, password);
    } catch (error) {
      this.logger.error('Failed to disable MFA', error);
      throw new UnauthorizedException('Failed to disable MFA');
    }
  }

  async getBackupCodesCount(session: BffSession): Promise<{ remainingCount: number }> {
    try {
      return await this.identityClient.getBackupCodes(session.accountId);
    } catch (error) {
      this.logger.error('Failed to get backup codes', error);
      return { remainingCount: 0 };
    }
  }

  async regenerateBackupCodes(
    session: BffSession,
    password: string,
  ): Promise<{ backupCodes: string[] }> {
    try {
      const response = await this.identityClient.regenerateBackupCodes(session.accountId, password);
      return { backupCodes: response.backupCodes };
    } catch (error) {
      this.logger.error('Failed to regenerate backup codes', error);
      throw new UnauthorizedException('Failed to regenerate backup codes');
    }
  }

  async changePassword(
    session: BffSession,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await this.identityClient.changePassword(
        session.accountId,
        currentPassword,
        newPassword,
      );
    } catch (error) {
      this.logger.error('Failed to change password', error);
      throw new UnauthorizedException('Failed to change password');
    }
  }

  async revokeAllOtherSessions(
    session: BffSession,
  ): Promise<{ success: boolean; revokedCount: number; message: string }> {
    try {
      const result = await this.identityClient.revokeAllSessions(session.accountId, session.id);
      return {
        success: result.success,
        revokedCount: result.revokedCount,
        message: `Revoked ${result.revokedCount} sessions`,
      };
    } catch (error) {
      this.logger.error('Failed to revoke all sessions', error);
      throw new UnauthorizedException('Failed to revoke sessions');
    }
  }

  private async completeLogin(
    req: Request,
    res: Response,
    account: Account,
    ip: string,
    userAgent: string,
  ): Promise<UserLoginResponseDto> {
    // Create session
    const sessionResponse = await this.identityClient.createSession({
      accountId: account.id,
      ipAddress: ip,
      userAgent,
      sessionContext: SESSION_CONTEXT.USER,
    });

    const metadata = this.sessionService.extractMetadata(req);
    const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

    await this.sessionService.createSession(
      res,
      {
        accountType: AccountType.USER,
        accountId: account.id,
        email: account.email,
        accessToken: sessionResponse.accessToken,
        refreshToken: sessionResponse.refreshToken,
        deviceFingerprint,
        mfaVerified: false,
        mfaRequired: false,
      },
      metadata,
    );

    // Record successful login
    await this.identityClient.recordLoginAttempt(
      account.id,
      account.email,
      ip,
      userAgent,
      true,
      '',
    );

    // Log successful login to audit service
    this.auditClient.logLoginSuccess({
      accountId: account.id,
      accountType: AuditAccountType.USER,
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      user: this.mapAccountToDto(account),
      message: 'Login successful',
    };
  }

  private mapAccountToDto(account: Account): UserInfoDto {
    return {
      id: account.id,
      email: account.email,
      username: account.username,
      emailVerified: account.emailVerified,
      mfaEnabled: account.mfaEnabled,
    };
  }

  private generateChallengeId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Verify service with X-Service-Id header and optional domain validation
   * Implements 2-tier authentication:
   * - Tier 1 (ALWAYS): X-Service-Id (UUID from services.id)
   * - Tier 2 (OPTIONAL): Domain validation (controlled by service_configs.domain_validation)
   *
   * @param req - Express request object
   * @throws UnauthorizedException if verification fails
   */
  private async verifyServiceDomain(req: Request): Promise<void> {
    // STEP 1: Extract X-Service-Id header (required)
    const serviceId = req.headers['x-service-id'] as string;
    if (!serviceId) {
      this.logger.warn('Missing X-Service-Id header');
      throw new UnauthorizedException('Missing required header: X-Service-Id');
    }

    // STEP 2: Extract Referer/Origin for domain validation (optional)
    const referer = req.headers.referer || req.headers.origin;
    let domain: string | undefined;
    if (referer) {
      try {
        const url = new URL(referer as string);
        domain = url.host;
      } catch (error) {
        this.logger.warn(`Invalid referer URL: ${referer}`);
      }
    }

    // STEP 3: Call auth-service verify-domain endpoint
    try {
      const authServiceUrl = this.configService.get<string>(
        'auth.service.url',
        'http://auth-service:3000',
      );
      const response = await firstValueFrom(
        this.httpService.post(`${authServiceUrl}/v1/services/verify-domain`, {
          serviceId,
          domain,
        }),
      );

      const result = response.data;

      if (!result.valid) {
        this.logger.warn(`Service verification failed: ${result.reason}`, {
          serviceId,
          domain,
        });
        throw new UnauthorizedException(result.reason || 'Invalid service or domain');
      }

      this.logger.log(
        `Service verified: ${result.service?.slug} (domain validation: ${result.service?.domainValidation})`,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Service verification request failed', error);
      throw new UnauthorizedException('Service verification failed');
    }
  }
}
