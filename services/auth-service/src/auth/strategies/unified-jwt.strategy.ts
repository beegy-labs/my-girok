import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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
import { IdentityGrpcClient, isGrpcError } from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';

/**
 * Unified JWT Strategy for User/Admin/Operator authentication
 * Issue: #358
 */
@Injectable()
export class UnifiedJwtStrategy extends PassportStrategy(Strategy, 'unified-jwt') {
  private readonly logger = new Logger(UnifiedJwtStrategy.name);

  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private identityClient: IdentityGrpcClient,
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
    try {
      const response = await this.identityClient.getAccount({ id: payload.sub });

      if (!response.account) {
        throw new UnauthorizedException('User not found');
      }

      // Get profile for name if available
      let name = '';
      try {
        const profileResponse = await this.identityClient.getProfile({
          account_id: payload.sub,
        });
        if (profileResponse.profile) {
          name = profileResponse.profile.display_name || '';
        }
      } catch {
        // Profile not found is OK, use empty name
      }

      return {
        type: 'USER',
        id: response.account.id,
        email: response.account.email,
        name,
        accountMode: payload.accountMode,
        countryCode: payload.countryCode,
        services: payload.services,
      };
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new UnauthorizedException('User not found');
      }
      this.logger.error('Failed to validate user', error);
      throw new UnauthorizedException('User validation failed');
    }
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
    try {
      // Backward compatibility for old tokens - validate via gRPC
      const response = await this.identityClient.getAccount({ id: payload.sub });

      if (!response.account) {
        throw new UnauthorizedException('User not found');
      }

      // Get profile for name if available
      let name = '';
      try {
        const profileResponse = await this.identityClient.getProfile({
          account_id: payload.sub,
        });
        if (profileResponse.profile) {
          name = profileResponse.profile.display_name || '';
        }
      } catch {
        // Profile not found is OK, use empty name
      }

      return {
        type: 'USER',
        id: response.account.id,
        email: response.account.email,
        name,
        accountMode: 'SERVICE',
        countryCode: 'KR',
        services: {},
      };
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new UnauthorizedException('User not found');
      }
      this.logger.error('Failed to validate legacy user', error);
      throw new UnauthorizedException('User validation failed');
    }
  }
}
