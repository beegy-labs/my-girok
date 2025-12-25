import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  OperatorLoginDto,
  AcceptInvitationDto,
  OperatorLoginResponse,
  OperatorProfileResponse,
} from '../dto/operator-auth.dto';
import {
  OperatorPayload,
  OperatorWithRelations,
  OperatorPermissionRow,
} from '../types/operator.types';

interface OperatorSession {
  id: string;
  operatorId: string;
  refreshToken: string;
  expiresAt: Date;
}

interface InvitationRow {
  id: string;
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  email: string;
  name: string;
  permissions: string[];
}

@Injectable()
export class OperatorAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Operator login
   */
  async login(dto: OperatorLoginDto): Promise<OperatorLoginResponse> {
    // Find operator with service info
    const operators = await this.prisma.$queryRaw<OperatorWithRelations[]>`
      SELECT
        o.id, o.email, o.password, o.name,
        o.admin_id as "adminId", o.service_id as "serviceId",
        s.slug as "serviceSlug", s.name as "serviceName",
        o.country_code as "countryCode", o.is_active as "isActive",
        o.last_login_at as "lastLoginAt", o.created_at as "createdAt"
      FROM operators o
      JOIN services s ON o.service_id = s.id
      WHERE o.email = ${dto.email} AND s.slug = ${dto.serviceSlug}
      LIMIT 1
    `;

    const operator = operators[0];

    if (!operator) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!operator.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, operator.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get permissions
    const permissions = await this.getOperatorPermissions(operator.id);

    // Generate tokens
    const tokens = await this.generateTokens(operator, permissions);

    // Save session
    await this.saveOperatorSession(operator.id, tokens.refreshToken);

    // Update last login
    await this.prisma.$executeRaw`
      UPDATE operators SET last_login_at = NOW() WHERE id = ${operator.id}
    `;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      operator: {
        id: operator.id,
        email: operator.email,
        name: operator.name,
        serviceSlug: operator.serviceSlug,
        serviceName: operator.serviceName,
        countryCode: operator.countryCode,
        permissions,
      },
    };
  }

  /**
   * Accept invitation and create operator account
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<OperatorLoginResponse> {
    // Find valid invitation
    const invitations = await this.prisma.$queryRaw<InvitationRow[]>`
      SELECT
        i.id, i.admin_id as "adminId", i.service_id as "serviceId",
        s.slug as "serviceSlug", i.country_code as "countryCode",
        i.email, i.name, i.permissions
      FROM operator_invitations i
      JOIN services s ON i.service_id = s.id
      WHERE i.token = ${dto.token}
        AND i.status = 'PENDING'
        AND i.expires_at > NOW()
      LIMIT 1
    `;

    const invitation = invitations[0];

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    // Create operator in transaction
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create operator
    const operators = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO operators (
        id, email, password, name, admin_id, service_id, country_code,
        is_active, invitation_id, created_at, updated_at
      )
      VALUES (
        gen_random_uuid()::TEXT, ${invitation.email}, ${hashedPassword}, ${invitation.name},
        ${invitation.adminId}, ${invitation.serviceId}, ${invitation.countryCode},
        true, ${invitation.id}, NOW(), NOW()
      )
      RETURNING id
    `;

    const operatorId = operators[0].id;

    // Assign permissions
    const permissionIds = invitation.permissions || [];
    for (const permissionId of permissionIds) {
      await this.prisma.$executeRaw`
        INSERT INTO operator_permissions (id, operator_id, permission_id, granted_by, granted_at)
        VALUES (gen_random_uuid()::TEXT, ${operatorId}, ${permissionId}, ${invitation.adminId}, NOW())
      `;
    }

    // Update invitation status
    await this.prisma.$executeRaw`
      UPDATE operator_invitations
      SET status = 'ACCEPTED', accepted_at = NOW()
      WHERE id = ${invitation.id}
    `;

    // Get full operator info
    const fullOperators = await this.prisma.$queryRaw<OperatorWithRelations[]>`
      SELECT
        o.id, o.email, o.password, o.name,
        o.admin_id as "adminId", o.service_id as "serviceId",
        s.slug as "serviceSlug", s.name as "serviceName",
        o.country_code as "countryCode", o.is_active as "isActive",
        o.last_login_at as "lastLoginAt", o.created_at as "createdAt"
      FROM operators o
      JOIN services s ON o.service_id = s.id
      WHERE o.id = ${operatorId}
      LIMIT 1
    `;

    const operator = fullOperators[0];
    const permissions = permissionIds.length ? await this.getOperatorPermissions(operatorId) : [];

    // Generate tokens
    const tokens = await this.generateTokens(operator, permissions);

    // Save session
    await this.saveOperatorSession(operator.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      operator: {
        id: operator.id,
        email: operator.email,
        name: operator.name,
        serviceSlug: operator.serviceSlug,
        serviceName: operator.serviceName,
        countryCode: operator.countryCode,
        permissions,
      },
    };
  }

  /**
   * Refresh tokens
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify token
      this.jwtService.verify(refreshToken);

      // Find session
      const sessions = await this.prisma.$queryRaw<OperatorSession[]>`
        SELECT id, operator_id as "operatorId", refresh_token as "refreshToken", expires_at as "expiresAt"
        FROM operator_sessions
        WHERE refresh_token = ${refreshToken}
        LIMIT 1
      `;

      const session = sessions[0];

      if (!session || new Date(session.expiresAt) < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Get operator
      const operators = await this.prisma.$queryRaw<OperatorWithRelations[]>`
        SELECT
          o.id, o.email, o.password, o.name,
          o.admin_id as "adminId", o.service_id as "serviceId",
          s.slug as "serviceSlug", s.name as "serviceName",
          o.country_code as "countryCode", o.is_active as "isActive",
          o.last_login_at as "lastLoginAt", o.created_at as "createdAt"
        FROM operators o
        JOIN services s ON o.service_id = s.id
        WHERE o.id = ${session.operatorId}
        LIMIT 1
      `;

      const operator = operators[0];

      if (!operator || !operator.isActive) {
        throw new UnauthorizedException('Operator not found or deactivated');
      }

      const permissions = await this.getOperatorPermissions(operator.id);
      const tokens = await this.generateTokens(operator, permissions);

      // Update session
      await this.prisma.$executeRaw`
        UPDATE operator_sessions
        SET refresh_token = ${tokens.refreshToken},
            expires_at = ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
        WHERE id = ${session.id}
      `;

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout
   */
  async logout(operatorId: string, refreshToken: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM operator_sessions
      WHERE operator_id = ${operatorId} AND refresh_token = ${refreshToken}
    `;
  }

  /**
   * Get operator profile
   */
  async getProfile(operatorId: string): Promise<OperatorProfileResponse> {
    const operators = await this.prisma.$queryRaw<OperatorWithRelations[]>`
      SELECT
        o.id, o.email, o.password, o.name,
        o.admin_id as "adminId", o.service_id as "serviceId",
        s.slug as "serviceSlug", s.name as "serviceName",
        o.country_code as "countryCode", o.is_active as "isActive",
        o.last_login_at as "lastLoginAt", o.created_at as "createdAt"
      FROM operators o
      JOIN services s ON o.service_id = s.id
      WHERE o.id = ${operatorId}
      LIMIT 1
    `;

    const operator = operators[0];

    if (!operator) {
      throw new UnauthorizedException('Operator not found');
    }

    const permissions = await this.getOperatorPermissions(operator.id);

    return {
      id: operator.id,
      email: operator.email,
      name: operator.name,
      serviceId: operator.serviceId,
      serviceSlug: operator.serviceSlug,
      serviceName: operator.serviceName,
      countryCode: operator.countryCode,
      isActive: operator.isActive,
      permissions,
      lastLoginAt: operator.lastLoginAt,
      createdAt: operator.createdAt,
    };
  }

  private async getOperatorPermissions(operatorId: string): Promise<string[]> {
    const permissions = await this.prisma.$queryRaw<OperatorPermissionRow[]>`
      SELECT
        op.operator_id as "operatorId",
        p.resource, p.action
      FROM operator_permissions op
      JOIN permissions p ON op.permission_id = p.id
      WHERE op.operator_id = ${operatorId}
    `;

    return permissions.map((p) => `${p.resource}:${p.action}`);
  }

  private async generateTokens(
    operator: OperatorWithRelations,
    permissions: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: OperatorPayload = {
      sub: operator.id,
      email: operator.email,
      name: operator.name,
      type: 'OPERATOR_ACCESS',
      adminId: operator.adminId,
      serviceId: operator.serviceId,
      serviceSlug: operator.serviceSlug,
      countryCode: operator.countryCode,
      permissions,
    };

    const refreshPayload = {
      sub: operator.id,
      type: 'OPERATOR_REFRESH',
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

  private async saveOperatorSession(operatorId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await this.prisma.$executeRaw`
      INSERT INTO operator_sessions (id, operator_id, refresh_token, expires_at, created_at)
      VALUES (gen_random_uuid()::TEXT, ${operatorId}, ${refreshToken}, ${expiresAt}, NOW())
    `;
  }
}
