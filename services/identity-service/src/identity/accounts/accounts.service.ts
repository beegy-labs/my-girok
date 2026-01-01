import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';
import { CacheService } from '../../common/cache';
import { PaginatedResponse } from '../../common/pagination';
import { maskUuid, maskEmail } from '../../common/utils/masking.util';
import { CreateAccountDto, AuthProvider, AccountMode } from './dto/create-account.dto';
import { UpdateAccountDto, AccountStatus, ChangePasswordDto } from './dto/update-account.dto';
import { AccountEntity } from './entities/account.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';

/**
 * Account query parameters
 */
export interface AccountQueryParams {
  email?: string;
  username?: string;
  status?: AccountStatus;
  provider?: AuthProvider;
  emailVerified?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * MFA setup response
 */
export interface MfaSetupResponse {
  secret: string;
  qrCode?: string;
  backupCodes?: string[];
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  // Config values with defaults
  private readonly bcryptRounds: number;
  private readonly externalIdPrefix: string;
  private readonly externalIdLength: number;
  private readonly lockThreshold: number;
  private readonly lockDurationMinutes: number;
  private readonly mfaBackupCodesCount: number;

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    // Load config values
    this.bcryptRounds = this.configService.get<number>('security.bcryptRounds', 12);
    this.externalIdPrefix = this.configService.get<string>('account.externalIdPrefix', 'ACC_');
    this.externalIdLength = this.configService.get<number>('account.externalIdLength', 10);
    this.lockThreshold = this.configService.get<number>('security.accountLockThreshold', 5);
    this.lockDurationMinutes = this.configService.get<number>(
      'security.accountLockDurationMinutes',
      15,
    );
    this.mfaBackupCodesCount = this.configService.get<number>('security.mfaBackupCodesCount', 10);
  }

  /**
   * Generate a unique external ID for accounts
   */
  private generateExternalId(): string {
    const randomPart = crypto.randomBytes(5).toString('base64url').slice(0, this.externalIdLength);
    return `${this.externalIdPrefix}${randomPart}`;
  }

  /**
   * Create a new account
   */
  async create(dto: CreateAccountDto): Promise<AccountEntity> {
    this.logger.log(`Creating account for email: ${maskEmail(dto.email)}`);

    // Check if email already exists
    const existingEmail = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.account.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // For LOCAL provider, password is required
    const provider = dto.provider || AuthProvider.LOCAL;
    if (provider === AuthProvider.LOCAL && !dto.password) {
      throw new BadRequestException('Password is required for local accounts');
    }

    // For OAuth providers, providerId is required
    if (provider !== AuthProvider.LOCAL && !dto.providerId) {
      throw new BadRequestException('Provider ID is required for OAuth accounts');
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, this.bcryptRounds);
    }

    // Generate unique external ID with retry on conflict
    // Uses a transaction to handle race conditions properly
    let account: Awaited<ReturnType<typeof this.prisma.account.create>>;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const externalId = this.generateExternalId();
      try {
        account = await this.prisma.account.create({
          data: {
            externalId,
            email: dto.email,
            username: dto.username,
            password: hashedPassword,
            provider,
            providerId: dto.providerId || null,
            mode: dto.mode || AccountMode.SERVICE,
            status: provider === AuthProvider.LOCAL ? 'PENDING_VERIFICATION' : 'ACTIVE',
            emailVerified: provider !== AuthProvider.LOCAL,
            emailVerifiedAt: provider !== AuthProvider.LOCAL ? new Date() : null,
            region: dto.region || null,
            locale: dto.locale || null,
            timezone: dto.timezone || null,
            countryCode: dto.countryCode || null,
          },
        });

        this.logger.log(`Account created with ID: ${maskUuid(account.id)}`);
        return AccountEntity.fromPrisma(account);
      } catch (error) {
        // Handle unique constraint violation (P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('externalId')) {
            attempts++;
            this.logger.warn(`External ID collision, retrying (${attempts}/${maxAttempts})`);
            continue;
          }
          if (target?.includes('email')) {
            throw new ConflictException('Email already registered');
          }
          if (target?.includes('username')) {
            throw new ConflictException('Username already taken');
          }
        }
        // Re-throw other errors
        throw error;
      }
    }

    // If we exhausted all attempts
    throw new ConflictException('Failed to generate unique external ID after multiple attempts');
  }

  /**
   * Find account by ID (with caching)
   */
  async findById(id: string): Promise<AccountEntity> {
    // Check cache first
    const cached = await this.cacheService.getAccount<AccountEntity>(id);
    if (cached) {
      return cached;
    }

    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const entity = AccountEntity.fromPrisma(account);

    // Cache the result
    await this.cacheService.setAccount(id, entity);

    return entity;
  }

  /**
   * Find account by external ID
   */
  async findByExternalId(externalId: string): Promise<AccountEntity> {
    const account = await this.prisma.account.findUnique({
      where: { externalId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return AccountEntity.fromPrisma(account);
  }

  /**
   * Find account by email (with caching)
   */
  async findByEmail(email: string): Promise<AccountEntity | null> {
    // Check cache first
    const cached = await this.cacheService.getAccountByEmail<AccountEntity>(email);
    if (cached) {
      return cached;
    }

    const account = await this.prisma.account.findUnique({
      where: { email },
    });

    if (!account) {
      return null;
    }

    const entity = AccountEntity.fromPrisma(account);

    // Cache the result
    await this.cacheService.setAccountByEmail(email, entity);

    return entity;
  }

  /**
   * Find account by username
   */
  async findByUsername(username: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findUnique({
      where: { username },
    });

    if (!account) {
      return null;
    }

    return AccountEntity.fromPrisma(account);
  }

  /**
   * List accounts with pagination and filtering
   */
  async findAll(params: AccountQueryParams): Promise<PaginatedResponse<AccountEntity>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build where clause with proper typing
    const where: Prisma.AccountWhereInput = {
      deletedAt: null,
    };

    if (params.email) {
      where.email = { contains: params.email, mode: 'insensitive' };
    }
    if (params.username) {
      where.username = { contains: params.username, mode: 'insensitive' };
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.provider) {
      where.provider = params.provider;
    }
    if (params.emailVerified !== undefined) {
      where.emailVerified = params.emailVerified;
    }

    // Build order by with proper typing and whitelist validation
    const allowedSortFields = ['createdAt', 'updatedAt', 'email', 'username', 'status'];
    const sortField = allowedSortFields.includes(params.sort || '') ? params.sort! : 'createdAt';
    const sortOrder = params.order || 'desc';
    const orderBy: Prisma.AccountOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.account.count({ where }),
    ]);

    return PaginatedResponse.create(
      accounts.map((account) => AccountEntity.fromPrisma(account)),
      total,
      page,
      limit,
    );
  }

  /**
   * Update an account
   */
  async update(id: string, dto: UpdateAccountDto): Promise<AccountEntity> {
    // Verify account exists
    const existing = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    // If email is being changed, check for conflicts
    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.account.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new ConflictException('Email already registered');
      }
    }

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        email: dto.email,
        status: dto.status,
        mfaEnabled: dto.mfaEnabled,
        region: dto.region,
        locale: dto.locale,
        timezone: dto.timezone,
        countryCode: dto.countryCode,
        // Reset email verification if email changed
        ...(dto.email && dto.email !== existing.email
          ? { emailVerified: false, emailVerifiedAt: null }
          : {}),
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateAccount(id, existing.email, existing.username);

    this.logger.log(`Account ${maskUuid(id)} updated`);
    return AccountEntity.fromPrisma(account);
  }

  /**
   * Change account password
   */
  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // If account has password, verify current password
    if (account.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const isValid = await bcrypt.compare(dto.currentPassword, account.password);
      if (!isValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.bcryptRounds);

    await this.prisma.account.update({
      where: { id },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
    });

    this.logger.log(`Password changed for account ${maskUuid(id)}`);
  }

  /**
   * Soft delete an account
   */
  async delete(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateAccount(id, account.email, account.username);

    this.logger.log(`Account ${maskUuid(id)} soft deleted`);
  }

  /**
   * Verify email address
   */
  async verifyEmail(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: account.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : account.status,
      },
    });

    this.logger.log(`Email verified for account ${maskUuid(id)}`);
  }

  /**
   * Enable MFA for account
   * MFA secret is encrypted before storage for security
   * Backup codes are hashed and stored in the database
   */
  async enableMfa(id: string): Promise<MfaSetupResponse> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.mfaEnabled) {
      throw new ConflictException('MFA is already enabled');
    }

    // Generate TOTP-compatible secret (base32 encoded for authenticator apps)
    const secret = this.cryptoService.generateTotpSecret();

    // Encrypt secret before storing in database
    const encryptedSecret = this.cryptoService.encrypt(secret);

    // Generate backup codes
    const backupCodes = Array.from({ length: this.mfaBackupCodesCount }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    // Hash backup codes before storing (one-way hash for security)
    const hashedBackupCodes = backupCodes.map((code) => this.cryptoService.hash(code));

    await this.prisma.account.update({
      where: { id },
      data: {
        mfaSecret: encryptedSecret,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    this.logger.log(`MFA setup initiated for account ${maskUuid(id)}`);

    return {
      secret,
      qrCode: `otpauth://totp/MyGirok:${account.email}?secret=${secret}&issuer=MyGirok`,
      backupCodes, // Return plain backup codes only once during setup
    };
  }

  /**
   * Verify TOTP code and complete MFA setup
   * Uses otpauth library for RFC 6238 compliant verification
   */
  async verifyAndCompleteMfaSetup(id: string, code: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    if (account.mfaEnabled) {
      throw new ConflictException('MFA is already enabled');
    }

    // Decrypt the secret
    const secret = this.cryptoService.decrypt(account.mfaSecret);

    // Create TOTP instance for verification
    const totp = new OTPAuth.TOTP({
      issuer: 'MyGirok',
      label: account.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Verify the code with a window of 1 (allows ±30 seconds drift)
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        mfaEnabled: true,
      },
    });

    this.logger.log(`MFA enabled for account ${maskUuid(id)}`);
  }

  /**
   * Verify TOTP code for authentication
   * Returns true if code is valid (either TOTP or backup code)
   */
  async verifyMfaCode(id: string, code: string): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
    });

    if (!account || !account.mfaEnabled || !account.mfaSecret) {
      return false;
    }

    // First, try TOTP verification
    try {
      const secret = this.cryptoService.decrypt(account.mfaSecret);
      const totp = new OTPAuth.TOTP({
        issuer: 'MyGirok',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta !== null) {
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to verify TOTP for account ${maskUuid(id)}`, error);
    }

    // If TOTP fails, try backup codes
    const codeHash = this.cryptoService.hash(code.toUpperCase());
    const backupCodeIndex = account.mfaBackupCodes.findIndex((hash) => hash === codeHash);

    if (backupCodeIndex !== -1) {
      // Remove used backup code
      const updatedBackupCodes = [...account.mfaBackupCodes];
      updatedBackupCodes.splice(backupCodeIndex, 1);

      await this.prisma.account.update({
        where: { id },
        data: { mfaBackupCodes: updatedBackupCodes },
      });

      this.logger.log(
        `Backup code used for account ${maskUuid(id)}, ${updatedBackupCodes.length} remaining`,
      );
      return true;
    }

    return false;
  }

  /**
   * Disable MFA for account
   * Securely removes encrypted MFA secret
   */
  async disableMfa(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        mfaEnabled: false,
        mfaSecret: null, // Encrypted secret is removed
        mfaBackupCodes: [], // Clear backup codes for security
      },
    });

    this.logger.log(`MFA disabled for account ${maskUuid(id)}`);
  }

  /**
   * Update account status
   */
  async updateStatus(id: string, status: AccountStatus): Promise<AccountEntity> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: { status },
    });

    this.logger.log(`Account ${maskUuid(id)} status updated to ${status}`);
    return AccountEntity.fromPrisma(updated);
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      return; // Silently fail to prevent user enumeration
    }

    const failedAttempts = account.failedLoginAttempts + 1;

    await this.prisma.account.update({
      where: { id },
      data: {
        failedLoginAttempts: failedAttempts,
        ...(failedAttempts >= this.lockThreshold
          ? { lockedUntil: new Date(Date.now() + this.lockDurationMinutes * 60 * 1000) }
          : {}),
      },
    });
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLogins(id: string): Promise<void> {
    await this.prisma.account.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Validate password for authentication
   */
  async validatePassword(id: string, password: string): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account || !account.password) {
      return false;
    }

    return bcrypt.compare(password, account.password);
  }
}
