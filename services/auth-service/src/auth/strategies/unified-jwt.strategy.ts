import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  JwtPayloadUnion,
  UserJwtPayload,
  AdminJwtPayload,
  OperatorJwtPayload,
  AuthenticatedUser,
  AuthenticatedAdmin,
  AuthenticatedOperator,
  AuthenticatedEntity,
  isUserPayload,
  isAdminPayload,
  isOperatorPayload,
  isLegacyPayload,
} from '@my-girok/types';

/**
 * Unified JWT Strategy for User/Admin/Operator authentication
 * Issue: #358
 */
@Injectable()
export class UnifiedJwtStrategy extends PassportStrategy(Strategy, 'unified-jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayloadUnion): Promise<AuthenticatedEntity> {
    // Handle new token types
    if (isUserPayload(payload)) {
      return this.validateUser(payload);
    }

    if (isAdminPayload(payload)) {
      return this.validateAdmin(payload);
    }

    if (isOperatorPayload(payload)) {
      return this.validateOperator(payload);
    }

    // Handle legacy tokens (no 'type' field or old types)
    if (isLegacyPayload(payload)) {
      return this.validateLegacyUser(payload);
    }

    throw new UnauthorizedException('Invalid token type');
  }

  private async validateUser(payload: UserJwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      type: 'USER',
      id: user.id,
      email: user.email,
      name: user.name || '',
      accountMode: payload.accountMode,
      countryCode: payload.countryCode,
      services: payload.services,
    };
  }

  private async validateAdmin(payload: AdminJwtPayload): Promise<AuthenticatedAdmin> {
    const admins = await this.prisma.$queryRaw<
      Array<{ id: string; email: string; name: string; isActive: boolean }>
    >`
      SELECT id, email, name, is_active as "isActive"
      FROM admins
      WHERE id = ${payload.sub}
      LIMIT 1
    `;

    const admin = admins[0];

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin not found or inactive');
    }

    return {
      type: 'ADMIN',
      id: admin.id,
      email: admin.email,
      name: admin.name,
      scope: payload.scope,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      level: payload.level,
      permissions: payload.permissions,
      services: payload.services,
    };
  }

  private async validateOperator(payload: OperatorJwtPayload): Promise<AuthenticatedOperator> {
    const operators = await this.prisma.$queryRaw<
      Array<{ id: string; email: string; name: string; isActive: boolean }>
    >`
      SELECT id, email, name, is_active as "isActive"
      FROM operators
      WHERE id = ${payload.sub}
      LIMIT 1
    `;

    const operator = operators[0];

    if (!operator || !operator.isActive) {
      throw new UnauthorizedException('Operator not found or inactive');
    }

    return {
      type: 'OPERATOR',
      id: operator.id,
      email: operator.email,
      name: operator.name,
      adminId: payload.adminId,
      serviceId: payload.serviceId,
      serviceSlug: payload.serviceSlug,
      countryCode: payload.countryCode,
      permissions: payload.permissions,
    };
  }

  private async validateLegacyUser(payload: any): Promise<AuthenticatedUser> {
    // Backward compatibility for old tokens
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      type: 'USER',
      id: user.id,
      email: user.email,
      name: user.name || '',
      accountMode: 'SERVICE',
      countryCode: 'KR',
      services: {},
    };
  }
}
