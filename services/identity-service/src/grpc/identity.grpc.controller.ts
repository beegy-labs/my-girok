import { Controller, Logger, NotFoundException } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { AccountsService } from '../identity/accounts/accounts.service';
import { SessionsService } from '../identity/sessions/sessions.service';
import { DevicesService } from '../identity/devices/devices.service';
import { ProfilesService } from '../identity/profiles/profiles.service';
import { CryptoService } from '../common/crypto';

/**
 * Proto enum mappings for AccountStatus
 */
const AccountStatusMap: Record<string, number> = {
  PENDING_VERIFICATION: 1,
  ACTIVE: 2,
  SUSPENDED: 3,
  DELETED: 4,
  LOCKED: 5,
};

/**
 * Proto enum mappings for AccountMode
 */
const AccountModeMap: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
  OPERATOR: 3,
  SERVICE: 4,
  UNIFIED: 1, // Map UNIFIED to USER for proto compatibility
};

/**
 * Convert Date to google.protobuf.Timestamp format
 */
function toTimestamp(date: Date | null | undefined): { seconds: number; nanos: number } | null {
  if (!date) return null;
  const ms = date.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1000000,
  };
}

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
          created_at: toTimestamp(account.createdAt),
          updated_at: toTimestamp(account.updatedAt),
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
          created_at: toTimestamp(account.createdAt),
          updated_at: toTimestamp(account.updatedAt),
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
          created_at: toTimestamp(account.createdAt),
          updated_at: toTimestamp(account.updatedAt),
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
        expires_at: toTimestamp(session.expiresAt),
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
        last_seen_at: toTimestamp(device.lastActiveAt),
        created_at: toTimestamp(device.createdAt),
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
          created_at: toTimestamp(profile.createdAt),
          updated_at: toTimestamp(profile.updatedAt),
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
}
