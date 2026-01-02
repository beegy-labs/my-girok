import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto, LoginDto, GrantDomainAccessDto } from './dto';
import {
  AuthPayload,
  TokenResponse,
  DomainAccessPayload,
  JwtPayload,
  Role,
  AuthProvider,
  UserJwtPayload,
  UserServicePayload,
  LegacyUserJwtPayload,
} from '@my-girok/types';
import {
  IdentityGrpcClient,
  AccountMode as GrpcAccountMode,
  AuthProvider as GrpcAuthProvider,
  isGrpcError,
} from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { hashToken } from '../common/utils/session.utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private identityClient: IdentityGrpcClient,
  ) {}

  async register(dto: RegisterDto): Promise<AuthPayload> {
    try {
      // Create account via gRPC (handles email/username uniqueness checks)
      const response = await this.identityClient.createAccount({
        email: dto.email,
        username: dto.username,
        password: dto.password,
        provider: GrpcAuthProvider.AUTH_PROVIDER_LOCAL,
        mode: GrpcAccountMode.ACCOUNT_MODE_USER,
      });

      if (!response.account) {
        throw new ConflictException('Failed to create account');
      }

      const account = response.account;
      const tokens = await this.generateTokens(account.id, account.email, Role.USER);

      await this.saveRefreshToken(account.id, tokens.refreshToken);

      return {
        user: {
          id: account.id,
          email: account.email,
          username: account.username,
          name: dto.name || null,
          avatar: null,
          role: Role.USER,
          provider: AuthProvider.LOCAL,
          emailVerified: account.email_verified,
          createdAt: account.created_at ? new Date(account.created_at.seconds * 1000) : new Date(),
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (isGrpcError(error)) {
        if (error.code === GrpcStatus.ALREADY_EXISTS) {
          // Parse error message to determine which field is duplicate
          if (error.message.includes('email')) {
            throw new ConflictException('Email already registered');
          }
          if (error.message.includes('username')) {
            throw new ConflictException('Username already taken');
          }
          throw new ConflictException('Account already exists');
        }
      }
      this.logger.error('Failed to create account', error);
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    try {
      // Get account by email via gRPC
      const accountResponse = await this.identityClient.getAccountByEmail({
        email: dto.email,
      });

      if (!accountResponse.account) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const account = accountResponse.account;

      // Validate password via gRPC
      const passwordResponse = await this.identityClient.validatePassword({
        account_id: account.id,
        password: dto.password,
      });

      if (!passwordResponse.valid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.generateTokens(account.id, account.email, Role.USER);

      await this.saveRefreshToken(account.id, tokens.refreshToken);

      return {
        user: {
          id: account.id,
          email: account.email,
          username: account.username,
          name: null, // Profile data should be fetched separately if needed
          avatar: null,
          role: Role.USER,
          provider: this.mapGrpcProviderToLocal(GrpcAuthProvider.AUTH_PROVIDER_LOCAL),
          emailVerified: account.email_verified,
          createdAt: account.created_at ? new Date(account.created_at.seconds * 1000) : new Date(),
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (isGrpcError(error)) {
        if (error.code === GrpcStatus.NOT_FOUND) {
          throw new UnauthorizedException('Invalid credentials');
        }
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Login failed', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  private mapGrpcProviderToLocal(grpcProvider: GrpcAuthProvider): AuthProvider {
    switch (grpcProvider) {
      case GrpcAuthProvider.AUTH_PROVIDER_LOCAL:
        return AuthProvider.LOCAL;
      case GrpcAuthProvider.AUTH_PROVIDER_GOOGLE:
        return AuthProvider.GOOGLE;
      case GrpcAuthProvider.AUTH_PROVIDER_KAKAO:
        return AuthProvider.KAKAO;
      case GrpcAuthProvider.AUTH_PROVIDER_NAVER:
        return AuthProvider.NAVER;
      case GrpcAuthProvider.AUTH_PROVIDER_APPLE:
        return AuthProvider.APPLE;
      default:
        return AuthProvider.LOCAL;
    }
  }

  private mapLocalProviderToGrpc(provider: AuthProvider): GrpcAuthProvider {
    switch (provider) {
      case AuthProvider.LOCAL:
        return GrpcAuthProvider.AUTH_PROVIDER_LOCAL;
      case AuthProvider.GOOGLE:
        return GrpcAuthProvider.AUTH_PROVIDER_GOOGLE;
      case AuthProvider.KAKAO:
        return GrpcAuthProvider.AUTH_PROVIDER_KAKAO;
      case AuthProvider.NAVER:
        return GrpcAuthProvider.AUTH_PROVIDER_NAVER;
      case AuthProvider.APPLE:
        return GrpcAuthProvider.AUTH_PROVIDER_APPLE;
      default:
        return GrpcAuthProvider.AUTH_PROVIDER_LOCAL;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      this.jwtService.verify(refreshToken);

      const tokenHash = hashToken(refreshToken);

      // Validate session via gRPC
      const sessionResponse = await this.identityClient.validateSession({
        token_hash: tokenHash,
      });

      if (!sessionResponse.valid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get account via gRPC
      const accountResponse = await this.identityClient.getAccount({
        id: sessionResponse.account_id,
      });

      if (!accountResponse.account) {
        throw new UnauthorizedException('User not found');
      }

      const account = accountResponse.account;
      const tokens = await this.generateTokens(account.id, account.email, Role.USER);

      // Revoke old session and create new one
      await this.identityClient.revokeSession({
        session_id: sessionResponse.session_id,
        reason: 'Token refresh',
      });

      await this.saveRefreshToken(account.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(_userId: string, refreshToken: string): Promise<void> {
    try {
      const tokenHash = hashToken(refreshToken);

      // Validate session first to get session ID
      const sessionResponse = await this.identityClient.validateSession({
        token_hash: tokenHash,
      });

      if (sessionResponse.valid && sessionResponse.session_id) {
        // Revoke the session via gRPC
        await this.identityClient.revokeSession({
          session_id: sessionResponse.session_id,
          reason: 'User logout',
        });
      }
    } catch (error) {
      // Log but don't throw - logout should be idempotent
      this.logger.warn('Session revocation during logout failed', error);
    }
  }

  async grantDomainAccess(userId: string, dto: GrantDomainAccessDto): Promise<DomainAccessPayload> {
    const expiresAt = new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000);

    const payload: JwtPayload = {
      sub: userId,
      email: dto.recipientEmail || '',
      role: Role.GUEST,
      type: 'DOMAIN_ACCESS',
      domain: dto.domain,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${dto.expiresInHours}h`,
    });

    await this.prisma.domainAccessToken.create({
      data: {
        userId,
        domain: dto.domain,
        token: accessToken,
        expiresAt,
      },
    });

    const baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const accessUrl = `${baseUrl}/${dto.domain}?token=${accessToken}`;

    return {
      accessToken,
      expiresAt,
      accessUrl,
    };
  }

  async generateTokens(userId: string, email: string, role: string): Promise<TokenResponse> {
    // Fetch account info via gRPC for accountMode and countryCode
    let accountMode: 'SERVICE' | 'UNIFIED' = 'SERVICE';
    let countryCode = 'KR';

    try {
      const accountResponse = await this.identityClient.getAccount({ id: userId });
      if (accountResponse.account) {
        // Map gRPC AccountMode to local types
        accountMode =
          accountResponse.account.mode === GrpcAccountMode.ACCOUNT_MODE_SERVICE
            ? 'SERVICE'
            : 'UNIFIED';
        // Get countryCode from profile if needed
      }
    } catch (error) {
      this.logger.debug(`Failed to fetch account info for token generation: ${error}`);
    }

    // Fetch user services from local database (stays in auth-service)
    let userServices: Array<{
      status: string;
      countryCode: string;
      serviceSlug: string;
    }> = [];

    try {
      userServices = await this.prisma.$queryRaw<
        Array<{ status: string; countryCode: string; serviceSlug: string }>
      >`
        SELECT us.status, us.country_code as "countryCode", s.slug as "serviceSlug"
        FROM user_services us
        JOIN services s ON us.service_id = s.id
        WHERE us.user_id = ${userId} AND us.status = 'ACTIVE'
      `;
    } catch (error) {
      // Table might not exist yet in dev, continue with empty services
      this.logger.debug(
        `user_services query skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    const services = this.buildUserServicesPayload(userServices);

    const accessPayload: UserJwtPayload = {
      sub: userId,
      email,
      type: 'USER_ACCESS',
      accountMode,
      countryCode,
      services,
    };

    const refreshPayload: LegacyUserJwtPayload = {
      sub: userId,
      email,
      role: role as Role,
      type: 'REFRESH',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '1h'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '14d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async generateTokensWithServices(
    userId: string,
    email: string,
    accountMode: 'SERVICE' | 'UNIFIED',
    countryCode: string,
    userServices: Array<{ status: string; countryCode: string; serviceSlug: string }>,
  ): Promise<TokenResponse> {
    const services = this.buildUserServicesPayload(userServices);

    const accessPayload: UserJwtPayload = {
      sub: userId,
      email,
      type: 'USER_ACCESS',
      accountMode,
      countryCode,
      services,
    };

    const refreshPayload: LegacyUserJwtPayload = {
      sub: userId,
      email,
      role: Role.USER,
      type: 'REFRESH',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '1h'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '14d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private buildUserServicesPayload(
    userServices: Array<{ status: string; countryCode: string; serviceSlug: string }>,
  ): Record<string, UserServicePayload> {
    const services: Record<string, UserServicePayload> = {};

    for (const us of userServices) {
      const slug = us.serviceSlug;
      if (!services[slug]) {
        services[slug] = {
          status: us.status as 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN',
          countries: [],
        };
      }
      if (!services[slug].countries.includes(us.countryCode)) {
        services[slug].countries.push(us.countryCode);
      }
    }

    return services;
  }

  async saveRefreshToken(
    userId: string,
    _refreshToken: string, // Token hash is generated by identity-service
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Create session via gRPC - identity-service will handle token hashing
      await this.identityClient.createSession({
        account_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_in_ms: 14 * 24 * 60 * 60 * 1000, // 14 days
      });
    } catch (error) {
      this.logger.error('Failed to save refresh token', error);
      throw error;
    }
  }

  async validateUser(userId: string) {
    try {
      const response = await this.identityClient.getAccount({ id: userId });
      if (!response.account) {
        return null;
      }

      // Map gRPC Account to expected format
      return {
        id: response.account.id,
        email: response.account.email,
        username: response.account.username,
        emailVerified: response.account.email_verified,
        createdAt: response.account.created_at
          ? new Date(response.account.created_at.seconds * 1000)
          : new Date(),
      };
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        return null;
      }
      this.logger.error('Failed to validate user', error);
      throw error;
    }
  }

  async findOrCreateOAuthUser(
    email: string,
    provider: AuthProvider,
    providerId: string,
    _name?: string,
    _avatar?: string,
  ) {
    try {
      // Try to find existing account by email first
      const existingResponse = await this.identityClient.getAccountByEmail({ email });

      if (existingResponse.account) {
        return {
          id: existingResponse.account.id,
          email: existingResponse.account.email,
          username: existingResponse.account.username,
          emailVerified: existingResponse.account.email_verified,
          createdAt: existingResponse.account.created_at
            ? new Date(existingResponse.account.created_at.seconds * 1000)
            : new Date(),
        };
      }
    } catch (error) {
      if (!isGrpcError(error) || error.code !== GrpcStatus.NOT_FOUND) {
        this.logger.error('Error checking existing OAuth account', error);
        throw error;
      }
    }

    // Create new account via gRPC
    const emailPrefix = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const username = `${emailPrefix}${randomSuffix}`;

    const response = await this.identityClient.createAccount({
      email,
      username,
      provider: this.mapLocalProviderToGrpc(provider),
      provider_id: providerId,
      mode: GrpcAccountMode.ACCOUNT_MODE_USER,
    });

    if (!response.account) {
      throw new ConflictException('Failed to create OAuth account');
    }

    return {
      id: response.account.id,
      email: response.account.email,
      username: response.account.username,
      emailVerified: response.account.email_verified,
      createdAt: response.account.created_at
        ? new Date(response.account.created_at.seconds * 1000)
        : new Date(),
    };
  }
}
