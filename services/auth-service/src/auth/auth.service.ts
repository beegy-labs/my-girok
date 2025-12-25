import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
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
import { generateUniqueExternalId } from '../common/utils/id-generator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthPayload> {
    // Check email uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check username uniqueness
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Generate unique external_id with collision checking
    const externalId = await generateUniqueExternalId(async (id) => {
      const existing = await this.prisma.user.findUnique({
        where: { externalId: id },
      });
      return !existing; // Return true if unique (not existing)
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        externalId,
        password: hashedPassword,
        name: dto.name,
        role: Role.USER,
        provider: AuthProvider.LOCAL,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        role: user.role as Role,
        provider: user.provider as AuthProvider,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        role: user.role as Role,
        provider: user.provider as AuthProvider,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      this.jwtService.verify(refreshToken);

      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(
        session.user.id,
        session.user.email,
        session.user.role,
      );

      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      });

      return tokens;
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        refreshToken,
      },
    });
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
    // Fetch user's services for new JWT structure
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountMode: true,
        countryCode: true,
      },
    });

    // Fetch user services using raw query (Prisma schema may not be updated yet)
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
    } catch {
      // Table might not exist yet in dev, continue with empty services
    }

    const services = this.buildUserServicesPayload(userServices);

    const accessPayload: UserJwtPayload = {
      sub: userId,
      email,
      type: 'USER_ACCESS',
      accountMode: (user?.accountMode as 'SERVICE' | 'UNIFIED') || 'SERVICE',
      countryCode: user?.countryCode || 'KR',
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

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findOrCreateOAuthUser(
    email: string,
    provider: AuthProvider,
    providerId: string,
    name?: string,
    avatar?: string,
  ) {
    let user = await this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });

    if (!user) {
      // Generate unique username from email prefix + random suffix
      const emailPrefix = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const username = `${emailPrefix}${randomSuffix}`;

      // Generate unique external_id with collision checking
      const externalId = await generateUniqueExternalId(async (id) => {
        const existing = await this.prisma.user.findUnique({
          where: { externalId: id },
        });
        return !existing; // Return true if unique (not existing)
      });

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          externalId,
          name,
          avatar,
          provider,
          providerId,
          role: Role.USER,
          emailVerified: true,
        },
      });
    }

    return user;
  }
}
