import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ID, CacheKey, CacheTTL } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { AdminLoginDto, AdminLoginResponse, AdminProfileResponse } from '../dto/admin-auth.dto';
import { AdminPayload, AdminWithRelations, AdminServicePayload } from '../types/admin.types';
import { hashToken, getSessionExpiresAt } from '../../common/utils/session.utils';

interface UnifiedSession {
  id: string;
  subjectId: string;
  subjectType: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResponse> {
    // Find admin with role and permissions
    const admins = await this.prisma.$queryRaw<AdminWithRelations[]>`
      SELECT
        a.id, a.email, a.password, a.name, a.scope, a.tenant_id as "tenantId",
        a.role_id as "roleId", a.is_active as "isActive", a.last_login_at as "lastLoginAt",
        COALESCE(a.account_mode, 'SERVICE') as "accountMode",
        a.country_code as "countryCode",
        t.slug as "tenantSlug", t.type as "tenantType",
        r.name as "roleName", r.display_name as "roleDisplayName", r.level as "roleLevel"
      FROM admins a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      JOIN roles r ON a.role_id = r.id
      WHERE a.email = ${dto.email}
      LIMIT 1
    `;

    const admin = admins[0];

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get permissions for this admin's role
    const permissions = await this.getAdminPermissions(admin.roleId);

    // Generate tokens
    const tokens = await this.generateTokens(admin, permissions);

    // Save refresh token
    await this.saveAdminSession(admin.id, tokens.refreshToken);

    // Update last login
    await this.prisma.$executeRaw`
      UPDATE admins SET last_login_at = NOW() WHERE id = ${admin.id}
    `;

    // Log audit
    await this.logAudit(admin.id, 'login', 'admin', admin.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        scope: admin.scope,
        tenantId: admin.tenantId,
        tenantSlug: admin.tenantSlug,
        roleName: admin.roleName ?? '',
        permissions,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify token is valid
      this.jwtService.verify(refreshToken);

      // Find session using token hash
      const tokenHash = hashToken(refreshToken);
      const sessions = await this.prisma.$queryRaw<UnifiedSession[]>`
        SELECT id, subject_id as "subjectId", subject_type as "subjectType",
               token_hash as "tokenHash", expires_at as "expiresAt", revoked_at as "revokedAt"
        FROM sessions
        WHERE token_hash = ${tokenHash} AND subject_type = 'ADMIN'
        LIMIT 1
      `;

      const session = sessions[0];

      if (!session || new Date(session.expiresAt) < new Date() || session.revokedAt) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Get admin with role
      const admins = await this.prisma.$queryRaw<AdminWithRelations[]>`
        SELECT
          a.id, a.email, a.name, a.scope, a.tenant_id as "tenantId",
          a.role_id as "roleId", a.is_active as "isActive",
          COALESCE(a.account_mode, 'SERVICE') as "accountMode",
          a.country_code as "countryCode",
          t.slug as "tenantSlug", t.type as "tenantType",
          r.name as "roleName", r.level as "roleLevel"
        FROM admins a
        LEFT JOIN tenants t ON a.tenant_id = t.id
        JOIN roles r ON a.role_id = r.id
        WHERE a.id = ${session.subjectId}
        LIMIT 1
      `;

      const admin = admins[0];

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Admin not found or deactivated');
      }

      const permissions = await this.getAdminPermissions(admin.roleId);
      const tokens = await this.generateTokens(admin, permissions);

      // Update session with new token hash (no plaintext storage for security)
      const newTokenHash = hashToken(tokens.refreshToken);
      const newExpiresAt = getSessionExpiresAt();
      await this.prisma.$executeRaw`
        UPDATE sessions
        SET token_hash = ${newTokenHash},
            expires_at = ${newExpiresAt}
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

  async logout(adminId: string, refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    // Soft delete: mark session as revoked
    await this.prisma.$executeRaw`
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE subject_id = ${adminId} AND subject_type = 'ADMIN' AND token_hash = ${tokenHash}
    `;

    await this.logAudit(adminId, 'logout', 'admin', adminId);
  }

  async getProfile(adminId: string): Promise<AdminProfileResponse> {
    const admins = await this.prisma.$queryRaw<AdminWithRelations[]>`
      SELECT
        a.id, a.email, a.name, a.scope, a.tenant_id as "tenantId",
        a.role_id as "roleId", a.is_active as "isActive",
        a.last_login_at as "lastLoginAt", a.created_at as "createdAt",
        t.id as "tid", t.name as "tname", t.slug as "tenantSlug",
        t.type as "tenantType", t.status as "tenantStatus",
        r.id as "rid", r.name as "roleName", r.display_name as "roleDisplayName",
        r.level as "roleLevel"
      FROM admins a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      JOIN roles r ON a.role_id = r.id
      WHERE a.id = ${adminId}
      LIMIT 1
    `;

    const admin = admins[0];

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const permissions = await this.getAdminPermissions(admin.roleId);

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      scope: admin.scope,
      tenantId: admin.tenantId,
      tenant: admin.tenantId
        ? {
            id: admin.tenantId,
            name: admin.tenantSlug ?? '',
            slug: admin.tenantSlug ?? '',
            type: admin.tenantType!,
            status: admin.tenantStatus ?? 'ACTIVE',
          }
        : undefined,
      role: {
        id: admin.roleId,
        name: admin.roleName ?? '',
        displayName: admin.roleDisplayName ?? '',
        level: admin.roleLevel ?? 0,
      },
      permissions,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  private async getAdminPermissions(roleId: string): Promise<string[]> {
    // Check cache first
    const cacheKey = CacheKey.make('auth', 'permissions', roleId);
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query from database
    const permissions = await this.prisma.$queryRaw<{ key: string }[]>`
      SELECT CONCAT(p.resource, ':', p.action) as key
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ${roleId}
    `;

    const permissionKeys = permissions.map((p) => p.key);

    // Check if role has wildcard (all permissions)
    const allCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM permissions
    `;

    const result = permissionKeys.length === Number(allCount[0].count) ? ['*'] : permissionKeys;

    // Cache the result
    await this.cache.set(cacheKey, result, CacheTTL.STATIC_CONFIG);

    return result;
  }

  private async generateTokens(
    admin: AdminWithRelations,
    permissions: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Fetch admin's services
    const adminServices = await this.getAdminServices(admin.id);

    const accessPayload: AdminPayload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'ADMIN_ACCESS',
      accountMode: (admin.accountMode as 'SERVICE' | 'UNIFIED') || 'SERVICE',
      scope: admin.scope,
      tenantId: admin.tenantId,
      tenantSlug: admin.tenantSlug ?? null,
      tenantType: admin.tenantType ?? null,
      roleId: admin.roleId,
      roleName: admin.roleName ?? '',
      level: admin.roleLevel ?? 0,
      permissions,
      services: adminServices,
    };

    const refreshPayload = {
      sub: admin.id,
      type: 'ADMIN_REFRESH',
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

  private async getAdminServices(adminId: string): Promise<Record<string, AdminServicePayload>> {
    const services: Record<string, AdminServicePayload> = {};

    try {
      const adminServices = await this.prisma.$queryRaw<
        Array<{
          serviceSlug: string;
          countryCode: string | null;
          roleId: string;
          roleName: string;
        }>
      >`
        SELECT
          s.slug as "serviceSlug",
          asv.country_code as "countryCode",
          asv.role_id as "roleId",
          r.name as "roleName"
        FROM admin_services asv
        JOIN services s ON asv.service_id = s.id
        JOIN roles r ON asv.role_id = r.id
        WHERE asv.admin_id = ${adminId}
      `;

      // Batch fetch permissions for all unique roleIds to prevent N+1 queries
      const uniqueRoleIds = [...new Set(adminServices.map((as) => as.roleId))];
      const permissionsMap = new Map<string, string[]>();

      // Fetch all permissions in parallel
      await Promise.all(
        uniqueRoleIds.map(async (roleId) => {
          const perms = await this.getAdminPermissions(roleId);
          permissionsMap.set(roleId, perms);
        }),
      );

      for (const as of adminServices) {
        const slug = as.serviceSlug;
        if (!services[slug]) {
          services[slug] = {
            roleId: as.roleId,
            roleName: as.roleName,
            countries: [],
            permissions: permissionsMap.get(as.roleId) ?? [],
          };
        }
        if (as.countryCode && !services[slug].countries.includes(as.countryCode)) {
          services[slug].countries.push(as.countryCode);
        }
      }
    } catch (error) {
      // admin_services table might not exist yet - log for debugging
      this.logger.debug(
        `admin_services query skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return services;
  }

  private async saveAdminSession(adminId: string, refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = getSessionExpiresAt();
    const sessionId = ID.generate();

    // Store only token hash, never plaintext refresh token (security best practice)
    await this.prisma.$executeRaw`
      INSERT INTO sessions (id, subject_id, subject_type, token_hash, expires_at, created_at)
      VALUES (${sessionId}, ${adminId}, 'ADMIN', ${tokenHash}, ${expiresAt}, NOW())
    `;
  }

  private async logAudit(
    adminId: string,
    action: string,
    resource: string,
    resourceId?: string,
  ): Promise<void> {
    // TODO: Migrate to ClickHouse audit_db.audit_logs
    // Audit logs have been moved to ClickHouse for better performance and analytics
    // See: services/audit-service for ClickHouse integration
    this.logger.log(
      `[AUDIT] admin=${adminId} action=${action} resource=${resource} resourceId=${resourceId}`,
    );
  }
}
