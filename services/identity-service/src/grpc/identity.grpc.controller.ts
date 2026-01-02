import { Controller, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { AccountsService } from '../identity/accounts/accounts.service';
import { SessionsService } from '../identity/sessions/sessions.service';
import { DevicesService } from '../identity/devices/devices.service';
import { ProfilesService } from '../identity/profiles/profiles.service';
import { CryptoService } from '../common/crypto';
import { AuthProvider, AccountMode } from '../identity/accounts/dto/create-account.dto';
import { AccountStatus } from '../identity/accounts/dto/update-account.dto';
import {
  // Shared Proto enum utilities from SSOT
  toProtoTimestamp,
  AccountStatusProto,
  AccountModeProto,
  AuthProviderProto,
} from '@my-girok/nest-common';

/**
 * Proto enum mappings for AccountStatus
 * Uses SSOT from @my-girok/types
 */
const AccountStatusMap: Record<string, number> = {
  PENDING_VERIFICATION: AccountStatusProto.PENDING,
  ACTIVE: AccountStatusProto.ACTIVE,
  SUSPENDED: AccountStatusProto.SUSPENDED,
  DELETED: AccountStatusProto.DELETED,
  LOCKED: AccountStatusProto.LOCKED,
};

/**
 * Proto enum mappings for AccountMode
 * Uses SSOT from @my-girok/types
 */
const AccountModeMap: Record<string, number> = {
  USER: AccountModeProto.USER,
  ADMIN: AccountModeProto.ADMIN,
  OPERATOR: AccountModeProto.OPERATOR,
  SERVICE: AccountModeProto.SERVICE,
  UNIFIED: AccountModeProto.USER, // Map UNIFIED to USER for proto compatibility
};

/**
 * Proto enum mappings for AuthProvider
 * Uses SSOT from @my-girok/types
 */
const AuthProviderMap: Record<number, AuthProvider> = {
  [AuthProviderProto.UNSPECIFIED]: AuthProvider.LOCAL,
  [AuthProviderProto.LOCAL]: AuthProvider.LOCAL,
  [AuthProviderProto.GOOGLE]: AuthProvider.GOOGLE,
  [AuthProviderProto.APPLE]: AuthProvider.APPLE,
  [AuthProviderProto.KAKAO]: AuthProvider.KAKAO,
  [AuthProviderProto.NAVER]: AuthProvider.NAVER,
};

/**
 * Proto to AccountMode mapping
 * Uses SSOT from @my-girok/types
 */
const ProtoToAccountModeMap: Record<number, AccountMode> = {
  [AccountModeProto.UNSPECIFIED]: AccountMode.UNIFIED,
  [AccountModeProto.USER]: AccountMode.UNIFIED,
  [AccountModeProto.ADMIN]: AccountMode.UNIFIED,
  [AccountModeProto.OPERATOR]: AccountMode.UNIFIED,
  [AccountModeProto.SERVICE]: AccountMode.SERVICE,
};

/**
 * Proto to AccountStatus mapping
 * Uses SSOT from @my-girok/types
 */
const ProtoToAccountStatusMap: Record<number, AccountStatus> = {
  [AccountStatusProto.PENDING]: AccountStatus.PENDING_VERIFICATION,
  [AccountStatusProto.ACTIVE]: AccountStatus.ACTIVE,
  [AccountStatusProto.SUSPENDED]: AccountStatus.SUSPENDED,
  [AccountStatusProto.DELETED]: AccountStatus.DELETED,
  [AccountStatusProto.LOCKED]: AccountStatus.SUSPENDED, // LOCKED -> SUSPENDED (no LOCKED in Prisma)
};

/**
 * Request/Response interfaces matching proto definitions
 */
interface GetAccountRequest {
  id: string;
}

interface GetAccountByEmailRequest {
  email: string;
}

interface GetAccountByUsernameRequest {
  username: string;
}

interface ValidateAccountRequest {
  id: string;
}

interface ValidateSessionRequest {
  token_hash: string;
}

interface RevokeSessionRequest {
  session_id: string;
  reason: string;
}

interface RevokeAllSessionsRequest {
  account_id: string;
  exclude_session_id?: string;
  reason: string;
}

interface GetAccountDevicesRequest {
  account_id: string;
}

interface TrustDeviceRequest {
  device_id: string;
  account_id: string;
}

interface RevokeDeviceRequest {
  device_id: string;
  account_id: string;
  reason: string;
}

interface GetProfileRequest {
  account_id: string;
}

interface CreateAccountRequest {
  email: string;
  username: string;
  password?: string;
  provider: number;
  provider_id?: string;
  mode: number;
  region?: string;
  locale?: string;
  timezone?: string;
  country_code?: string;
}

interface UpdateAccountRequest {
  id: string;
  email?: string;
  status?: number;
  mfa_enabled?: boolean;
  region?: string;
  locale?: string;
  timezone?: string;
  country_code?: string;
}

interface DeleteAccountRequest {
  id: string;
}

interface ValidatePasswordRequest {
  account_id: string;
  password: string;
}

interface CreateSessionRequest {
  account_id: string;
  device_id?: string;
  ip_address?: string;
  user_agent?: string;
  expires_in_ms?: number;
}

/**
 * gRPC Controller for Identity Service
 *
 * Implements the IdentityService proto definition providing:
 * - Account operations (Get, Validate, GetByEmail, GetByUsername)
 * - Session operations (Validate, Revoke, RevokeAll)
 * - Device operations (GetAccountDevices, Trust, Revoke)
 * - Profile operations (Get)
 *
 * @see packages/proto/identity/v1/identity.proto
 */
@Controller()
export class IdentityGrpcController {
  private readonly logger = new Logger(IdentityGrpcController.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly sessionsService: SessionsService,
    private readonly devicesService: DevicesService,
    private readonly profilesService: ProfilesService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Get account by ID
   */
  @GrpcMethod('IdentityService', 'GetAccount')
  async getAccount(request: GetAccountRequest) {
    this.logger.debug(`GetAccount request for id: ${request.id}`);

    try {
      const account = await this.accountsService.findById(request.id);

      return {
        account: {
          id: account.id,
          email: account.email,
          username: account.username,
          status: AccountStatusMap[account.status] || 0,
          mode: AccountModeMap[account.mode] || 0,
          mfa_enabled: account.mfaEnabled,
          email_verified: account.emailVerified,
          created_at: toProtoTimestamp(account.createdAt),
          updated_at: toProtoTimestamp(account.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
      this.logger.error(`GetAccount error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Validate account exists and check status
   */
  @GrpcMethod('IdentityService', 'ValidateAccount')
  async validateAccount(request: ValidateAccountRequest) {
    this.logger.debug(`ValidateAccount request for id: ${request.id}`);

    try {
      const account = await this.accountsService.findById(request.id);

      // Check if account is accessible
      const isValid = account.isAccessible();
      let message = 'Account is valid';

      if (!isValid) {
        if (account.status !== 'ACTIVE') {
          message = `Account status is ${account.status}`;
        } else if (account.lockedUntil && new Date() < account.lockedUntil) {
          message = 'Account is temporarily locked';
        }
      }

      return {
        valid: isValid,
        status: AccountStatusMap[account.status] || 0,
        message,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          valid: false,
          status: 0,
          message: 'Account not found',
        };
      }
      this.logger.error(`ValidateAccount error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get account by email
   */
  @GrpcMethod('IdentityService', 'GetAccountByEmail')
  async getAccountByEmail(request: GetAccountByEmailRequest) {
    this.logger.debug(`GetAccountByEmail request for email: ${request.email}`);

    try {
      const account = await this.accountsService.findByEmail(request.email);

      if (!account) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }

      return {
        account: {
          id: account.id,
          email: account.email,
          username: account.username,
          status: AccountStatusMap[account.status] || 0,
          mode: AccountModeMap[account.mode] || 0,
          mfa_enabled: account.mfaEnabled,
          email_verified: account.emailVerified,
          created_at: toProtoTimestamp(account.createdAt),
          updated_at: toProtoTimestamp(account.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`GetAccountByEmail error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get account by username
   */
  @GrpcMethod('IdentityService', 'GetAccountByUsername')
  async getAccountByUsername(request: GetAccountByUsernameRequest) {
    this.logger.debug(`GetAccountByUsername request for username: ${request.username}`);

    try {
      const account = await this.accountsService.findByUsername(request.username);

      if (!account) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }

      return {
        account: {
          id: account.id,
          email: account.email,
          username: account.username,
          status: AccountStatusMap[account.status] || 0,
          mode: AccountModeMap[account.mode] || 0,
          mfa_enabled: account.mfaEnabled,
          email_verified: account.emailVerified,
          created_at: toProtoTimestamp(account.createdAt),
          updated_at: toProtoTimestamp(account.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`GetAccountByUsername error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Validate session by token hash
   * The token is hashed before lookup for security
   */
  @GrpcMethod('IdentityService', 'ValidateSession')
  async validateSession(request: ValidateSessionRequest) {
    this.logger.debug('ValidateSession request received');

    try {
      // Hash the token before lookup (tokens are stored as hashes)
      const tokenHash = this.cryptoService.hash(request.token_hash);
      const session = await this.sessionsService.findByTokenHash(tokenHash);

      if (!session) {
        return {
          valid: false,
          account_id: '',
          session_id: '',
          expires_at: null,
          message: 'Session not found',
        };
      }

      // Check if session is active and not expired
      const now = new Date();
      const isExpired = now > session.expiresAt;
      const isValid = session.isActive && !isExpired;

      let message = 'Session is valid';
      if (!session.isActive) {
        message = 'Session has been revoked';
      } else if (isExpired) {
        message = 'Session has expired';
      }

      return {
        valid: isValid,
        account_id: session.accountId,
        session_id: session.id,
        expires_at: toProtoTimestamp(session.expiresAt),
        message,
      };
    } catch (error) {
      this.logger.error(`ValidateSession error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Revoke a specific session
   */
  @GrpcMethod('IdentityService', 'RevokeSession')
  async revokeSession(request: RevokeSessionRequest) {
    this.logger.debug(`RevokeSession request for session: ${request.session_id}`);

    try {
      await this.sessionsService.revoke(request.session_id, { reason: request.reason });

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Session not found',
        });
      }
      this.logger.error(`RevokeSession error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Revoke all sessions for an account
   */
  @GrpcMethod('IdentityService', 'RevokeAllSessions')
  async revokeAllSessions(request: RevokeAllSessionsRequest) {
    this.logger.debug(`RevokeAllSessions request for account: ${request.account_id}`);

    try {
      const revokedCount = await this.sessionsService.revokeAllForAccount(
        request.account_id,
        request.exclude_session_id,
      );

      return {
        success: true,
        revoked_count: revokedCount,
        message: `Successfully revoked ${revokedCount} session(s)`,
      };
    } catch (error) {
      this.logger.error(`RevokeAllSessions error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get all devices for an account
   */
  @GrpcMethod('IdentityService', 'GetAccountDevices')
  async getAccountDevices(request: GetAccountDevicesRequest) {
    this.logger.debug(`GetAccountDevices request for account: ${request.account_id}`);

    try {
      const result = await this.devicesService.findAll({
        accountId: request.account_id,
        page: 1,
        limit: 100, // Get all devices for the account
      });

      const devices = result.data.map((device) => ({
        id: device.id,
        account_id: device.accountId,
        fingerprint: device.fingerprint,
        device_type: device.deviceType || '',
        device_name: device.name || '',
        os_name: device.platform || '',
        os_version: device.osVersion || '',
        browser_name: device.browserName || '',
        browser_version: device.browserVersion || '',
        is_trusted: device.isTrusted,
        last_seen_at: toProtoTimestamp(device.lastActiveAt),
        created_at: toProtoTimestamp(device.createdAt),
      }));

      return { devices };
    } catch (error) {
      this.logger.error(`GetAccountDevices error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Trust a device
   */
  @GrpcMethod('IdentityService', 'TrustDevice')
  async trustDevice(request: TrustDeviceRequest) {
    this.logger.debug(`TrustDevice request for device: ${request.device_id}`);

    try {
      // Verify the device belongs to the account
      const device = await this.devicesService.findById(request.device_id);

      if (device.accountId !== request.account_id) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Device does not belong to the specified account',
        });
      }

      await this.devicesService.trust(request.device_id);

      return {
        success: true,
        message: 'Device trusted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Device not found',
        });
      }
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`TrustDevice error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Revoke/remove a device
   */
  @GrpcMethod('IdentityService', 'RevokeDevice')
  async revokeDevice(request: RevokeDeviceRequest) {
    this.logger.debug(`RevokeDevice request for device: ${request.device_id}`);

    try {
      // Verify the device belongs to the account
      const device = await this.devicesService.findById(request.device_id);

      if (device.accountId !== request.account_id) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Device does not belong to the specified account',
        });
      }

      await this.devicesService.remove(request.device_id);

      return {
        success: true,
        message: 'Device revoked successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Device not found',
        });
      }
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`RevokeDevice error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get profile by account ID
   * Note: language_code and timezone are fetched from the Account model
   */
  @GrpcMethod('IdentityService', 'GetProfile')
  async getProfile(request: GetProfileRequest) {
    this.logger.debug(`GetProfile request for account: ${request.account_id}`);

    try {
      // Get profile
      const profile = await this.profilesService.findByAccountId(request.account_id);

      // Get account for locale and timezone (these are stored on Account, not Profile)
      let languageCode = '';
      let timezone = '';
      try {
        const account = await this.accountsService.findById(request.account_id);
        languageCode = account.locale || '';
        timezone = account.timezone || '';
      } catch {
        // Account lookup failure should not prevent profile return
        this.logger.warn(
          `Could not fetch account for profile locale/timezone: ${request.account_id}`,
        );
      }

      return {
        profile: {
          id: profile.id,
          account_id: profile.accountId,
          display_name: profile.displayName || '',
          avatar_url: profile.avatar || undefined,
          bio: profile.bio || undefined,
          birth_date: profile.birthDate ? profile.birthDate.toISOString().split('T')[0] : undefined,
          phone_number: profile.phoneNumber || undefined,
          country_code: profile.countryCode || '',
          language_code: languageCode,
          timezone: timezone,
          created_at: toProtoTimestamp(profile.createdAt),
          updated_at: toProtoTimestamp(profile.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Profile not found',
        });
      }
      this.logger.error(`GetProfile error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  // ============================================================================
  // Account CRUD Operations
  // ============================================================================

  /**
   * Create a new account
   */
  @GrpcMethod('IdentityService', 'CreateAccount')
  async createAccount(request: CreateAccountRequest) {
    this.logger.debug(`CreateAccount request for email: ${request.email}`);

    try {
      const account = await this.accountsService.create({
        email: request.email,
        username: request.username,
        password: request.password,
        provider: AuthProviderMap[request.provider] || AuthProvider.LOCAL,
        providerId: request.provider_id,
        mode: ProtoToAccountModeMap[request.mode] || AccountMode.UNIFIED,
        region: request.region,
        locale: request.locale,
        timezone: request.timezone,
        countryCode: request.country_code,
      });

      return {
        account: {
          id: account.id,
          email: account.email,
          username: account.username,
          status: AccountStatusMap[account.status] || 0,
          mode: AccountModeMap[account.mode] || 0,
          mfa_enabled: account.mfaEnabled,
          email_verified: account.emailVerified,
          created_at: toProtoTimestamp(account.createdAt),
          updated_at: toProtoTimestamp(account.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new RpcException({
          code: GrpcStatus.ALREADY_EXISTS,
          message: error.message,
        });
      }
      this.logger.error(`CreateAccount error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Update an existing account
   */
  @GrpcMethod('IdentityService', 'UpdateAccount')
  async updateAccount(request: UpdateAccountRequest) {
    this.logger.debug(`UpdateAccount request for id: ${request.id}`);

    try {
      const updateDto: {
        email?: string;
        status?: AccountStatus;
        mfaEnabled?: boolean;
        region?: string;
        locale?: string;
        timezone?: string;
        countryCode?: string;
      } = {};

      if (request.email !== undefined) updateDto.email = request.email;
      if (request.status !== undefined) updateDto.status = ProtoToAccountStatusMap[request.status];
      if (request.mfa_enabled !== undefined) updateDto.mfaEnabled = request.mfa_enabled;
      if (request.region !== undefined) updateDto.region = request.region;
      if (request.locale !== undefined) updateDto.locale = request.locale;
      if (request.timezone !== undefined) updateDto.timezone = request.timezone;
      if (request.country_code !== undefined) updateDto.countryCode = request.country_code;

      const account = await this.accountsService.update(request.id, updateDto);

      return {
        account: {
          id: account.id,
          email: account.email,
          username: account.username,
          status: AccountStatusMap[account.status] || 0,
          mode: AccountModeMap[account.mode] || 0,
          mfa_enabled: account.mfaEnabled,
          email_verified: account.emailVerified,
          created_at: toProtoTimestamp(account.createdAt),
          updated_at: toProtoTimestamp(account.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
      if (error instanceof ConflictException) {
        throw new RpcException({
          code: GrpcStatus.ALREADY_EXISTS,
          message: error.message,
        });
      }
      this.logger.error(`UpdateAccount error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Delete an account (soft delete)
   */
  @GrpcMethod('IdentityService', 'DeleteAccount')
  async deleteAccount(request: DeleteAccountRequest) {
    this.logger.debug(`DeleteAccount request for id: ${request.id}`);

    try {
      await this.accountsService.delete(request.id);

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
      this.logger.error(`DeleteAccount error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Validate password for authentication
   */
  @GrpcMethod('IdentityService', 'ValidatePassword')
  async validatePassword(request: ValidatePasswordRequest) {
    this.logger.debug(`ValidatePassword request for account: ${request.account_id}`);

    try {
      const isValid = await this.accountsService.validatePassword(
        request.account_id,
        request.password,
      );

      if (!isValid) {
        // Record failed login attempt
        await this.accountsService.recordFailedLogin(request.account_id);
      } else {
        // Reset failed login attempts on successful validation
        await this.accountsService.resetFailedLogins(request.account_id);
      }

      return {
        valid: isValid,
        message: isValid ? 'Password is valid' : 'Invalid password',
      };
    } catch (error) {
      this.logger.error(`ValidatePassword error: ${error}`);
      // Return invalid for any errors (prevents user enumeration)
      return {
        valid: false,
        message: 'Invalid password',
      };
    }
  }

  /**
   * Create a new session
   */
  @GrpcMethod('IdentityService', 'CreateSession')
  async createSession(request: CreateSessionRequest) {
    this.logger.debug(`CreateSession request for account: ${request.account_id}`);

    try {
      const session = await this.sessionsService.create({
        accountId: request.account_id,
        deviceId: request.device_id || undefined,
        ipAddress: request.ip_address || '0.0.0.0', // Default for gRPC internal calls
        userAgent: request.user_agent || 'gRPC-Internal', // Default for gRPC internal calls
        expiresInMs: request.expires_in_ms ? Number(request.expires_in_ms) : undefined,
      });

      return {
        session: {
          id: session.id,
          account_id: session.accountId,
          device_id: session.deviceId || '',
          ip_address: session.ipAddress || '',
          user_agent: session.userAgent || '',
          created_at: toProtoTimestamp(session.createdAt),
          expires_at: toProtoTimestamp(session.expiresAt),
          last_activity_at: toProtoTimestamp(session.lastActivityAt),
        },
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: error.message,
        });
      }
      this.logger.error(`CreateSession error: ${error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Internal server error',
      });
    }
  }
}
