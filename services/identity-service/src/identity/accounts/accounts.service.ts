import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CreateAccountDto, AuthProvider, AccountMode } from './dto/create-account.dto';
import { UpdateAccountDto, AccountStatus, ChangePasswordDto } from './dto/update-account.dto';
import { AccountEntity } from './entities/account.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Pagination meta information
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

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
  private readonly BCRYPT_ROUNDS = 12;
  private readonly EXTERNAL_ID_PREFIX = 'ACC_';
  private readonly EXTERNAL_ID_LENGTH = 10;

  constructor(private readonly prisma: IdentityPrismaService) {}

  /**
   * Generate a unique external ID for accounts
   */
  private generateExternalId(): string {
    const randomPart = crypto
      .randomBytes(5)
      .toString('base64url')
      .slice(0, this.EXTERNAL_ID_LENGTH);
    return `${this.EXTERNAL_ID_PREFIX}${randomPart}`;
  }

  /**
   * Create a new account
   */
  async create(dto: CreateAccountDto): Promise<AccountEntity> {
    this.logger.log(`Creating account for email: ${dto.email}`);

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
      hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
    }

    // Generate unique external ID
    let externalId = this.generateExternalId();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.prisma.account.findUnique({
        where: { externalId },
      });
      if (!existing) break;
      externalId = this.generateExternalId();
      attempts++;
    }

    const account = await this.prisma.account.create({
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

    this.logger.log(`Account created with ID: ${account.id}`);
    return AccountEntity.fromPrisma(account);
  }

  /**
   * Find account by ID
   */
  async findById(id: string): Promise<AccountEntity> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return AccountEntity.fromPrisma(account);
  }

  /**
   * Find account by external ID
   */
  async findByExternalId(externalId: string): Promise<AccountEntity> {
    const account = await this.prisma.account.findUnique({
      where: { externalId },
    });

    if (!account) {
      throw new NotFoundException(`Account with external ID ${externalId} not found`);
    }

    return AccountEntity.fromPrisma(account);
  }

  /**
   * Find account by email
   */
  async findByEmail(email: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findUnique({
      where: { email },
    });

    if (!account) {
      return null;
    }

    return AccountEntity.fromPrisma(account);
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

    // Build where clause
    const where: any = {
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

    // Build order by
    const orderBy: any = {};
    const sortField = params.sort || 'createdAt';
    const sortOrder = params.order || 'desc';
    orderBy[sortField] = sortOrder;

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.account.count({ where }),
    ]);

    return {
      data: accounts.map((account) => AccountEntity.fromPrisma(account)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
      throw new NotFoundException(`Account with ID ${id} not found`);
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

    this.logger.log(`Account ${id} updated`);
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
      throw new NotFoundException(`Account with ID ${id} not found`);
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

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);

    await this.prisma.account.update({
      where: { id },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
    });

    this.logger.log(`Password changed for account ${id}`);
  }

  /**
   * Soft delete an account
   */
  async delete(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Account ${id} soft deleted`);
  }

  /**
   * Verify email address
   */
  async verifyEmail(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: account.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : account.status,
      },
    });

    this.logger.log(`Email verified for account ${id}`);
  }

  /**
   * Enable MFA for account
   */
  async enableMfa(id: string, _method: string = 'TOTP'): Promise<MfaSetupResponse> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    if (account.mfaEnabled) {
      throw new ConflictException('MFA is already enabled');
    }

    // Generate MFA secret (in production, use proper TOTP library)
    const secret = crypto.randomBytes(20).toString('hex');

    await this.prisma.account.update({
      where: { id },
      data: {
        mfaSecret: secret,
      },
    });

    this.logger.log(`MFA setup initiated for account ${id}`);

    return {
      secret,
      qrCode: `otpauth://totp/MyGirok:${account.email}?secret=${secret}&issuer=MyGirok`,
    };
  }

  /**
   * Complete MFA setup after verification
   */
  async completeMfaSetup(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    if (!account.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        mfaEnabled: true,
      },
    });

    this.logger.log(`MFA enabled for account ${id}`);
  }

  /**
   * Disable MFA for account
   */
  async disableMfa(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    if (!account.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    this.logger.log(`MFA disabled for account ${id}`);
  }

  /**
   * Update account status
   */
  async updateStatus(id: string, status: AccountStatus): Promise<AccountEntity> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: { status },
    });

    this.logger.log(`Account ${id} status updated to ${status}`);
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
    const lockThreshold = 5;
    const lockDurationMinutes = 15;

    await this.prisma.account.update({
      where: { id },
      data: {
        failedLoginAttempts: failedAttempts,
        ...(failedAttempts >= lockThreshold
          ? { lockedUntil: new Date(Date.now() + lockDurationMinutes * 60 * 1000) }
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
