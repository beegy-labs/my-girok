import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID, CacheKey, CacheTTL } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from './audit-log.service';
import { AdminPayload } from '../types/admin.types';

// Cache key helpers
const TESTERS_USER_CACHE_KEY = (serviceId: string) =>
  CacheKey.make('auth', 'service_testers', serviceId, 'users');
const TESTERS_ADMIN_CACHE_KEY = (serviceId: string) =>
  CacheKey.make('auth', 'service_testers', serviceId, 'admins');
const TESTER_BYPASS_CACHE_KEY = (userId: string, serviceId: string) =>
  CacheKey.make('auth', 'tester_bypass', userId, serviceId);
import {
  CreateTesterUserDto,
  UpdateTesterUserDto,
  CreateTesterAdminDto,
  ListTesterUsersQueryDto,
  TesterUserResponseDto,
  TesterAdminResponseDto,
  TesterUserListResponseDto,
  TesterAdminListResponseDto,
} from '../dto/service-tester.dto';

interface TesterUserRow {
  id: string;
  serviceId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  userAvatar: string | null;
  bypassAll: boolean;
  bypassDomain: boolean;
  bypassIP: boolean;
  bypassRate: boolean;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface TesterAdminRow {
  id: string;
  serviceId: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  bypassAll: boolean;
  bypassDomain: boolean;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
}

@Injectable()
export class ServiceTesterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Invalidate tester caches for a service
   */
  private async invalidateUserTesterCache(serviceId: string, userId?: string): Promise<void> {
    await this.cache.del(TESTERS_USER_CACHE_KEY(serviceId));
    if (userId) {
      await this.cache.del(TESTER_BYPASS_CACHE_KEY(userId, serviceId));
    }
    this.eventEmitter.emit('service.testers.updated', { serviceId, type: 'user', userId });
  }

  private async invalidateAdminTesterCache(serviceId: string): Promise<void> {
    await this.cache.del(TESTERS_ADMIN_CACHE_KEY(serviceId));
    this.eventEmitter.emit('service.testers.updated', { serviceId, type: 'admin' });
  }

  // ============================================================
  // USER TESTERS
  // ============================================================

  async listUserTesters(
    serviceId: string,
    _query: ListTesterUsersQueryDto,
  ): Promise<TesterUserListResponseDto> {
    // Cache for default queries (no filter)
    const cacheKey = TESTERS_USER_CACHE_KEY(serviceId);
    const cached = await this.cache.get<TesterUserListResponseDto>(cacheKey);
    if (cached) return cached;

    // Note: expiresWithin filter can be added with dynamic SQL if needed
    const testers = await this.prisma.$queryRaw<TesterUserRow[]>(
      Prisma.sql`
      SELECT
        t.id, t.service_id as "serviceId", t.user_id as "userId",
        u.email as "userEmail", u.name as "userName", u.avatar as "userAvatar",
        t.bypass_all as "bypassAll", t.bypass_domain as "bypassDomain",
        t.bypass_ip as "bypassIP", t.bypass_rate as "bypassRate",
        t.note, t.expires_at as "expiresAt",
        t.created_at as "createdAt", t.created_by as "createdBy",
        t.updated_at as "updatedAt"
      FROM service_tester_users t
      JOIN users u ON u.id = t.user_id
      WHERE t.service_id = ${serviceId}::uuid
      ORDER BY t.created_at DESC
    `,
    );

    const data: TesterUserResponseDto[] = testers.map((t) => ({
      id: t.id,
      serviceId: t.serviceId,
      userId: t.userId,
      user: {
        id: t.userId,
        email: t.userEmail,
        name: t.userName,
        avatar: t.userAvatar,
      },
      bypassAll: t.bypassAll,
      bypassDomain: t.bypassDomain,
      bypassIP: t.bypassIP,
      bypassRate: t.bypassRate,
      note: t.note,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
      createdBy: t.createdBy,
      updatedAt: t.updatedAt,
    }));

    const response: TesterUserListResponseDto = {
      data,
      meta: { total: data.length, serviceId },
    };

    await this.cache.set(cacheKey, response, CacheTTL.SEMI_STATIC);

    return response;
  }

  async getUserTester(serviceId: string, userId: string): Promise<TesterUserResponseDto> {
    const testers = await this.prisma.$queryRaw<TesterUserRow[]>(
      Prisma.sql`
      SELECT
        t.id, t.service_id as "serviceId", t.user_id as "userId",
        u.email as "userEmail", u.name as "userName", u.avatar as "userAvatar",
        t.bypass_all as "bypassAll", t.bypass_domain as "bypassDomain",
        t.bypass_ip as "bypassIP", t.bypass_rate as "bypassRate",
        t.note, t.expires_at as "expiresAt",
        t.created_at as "createdAt", t.created_by as "createdBy",
        t.updated_at as "updatedAt"
      FROM service_tester_users t
      JOIN users u ON u.id = t.user_id
      WHERE t.service_id = ${serviceId}::uuid AND t.user_id = ${userId}::uuid
      LIMIT 1
    `,
    );

    if (!testers.length) {
      throw new NotFoundException(`Tester not found for user: ${userId}`);
    }

    const t = testers[0];
    return {
      id: t.id,
      serviceId: t.serviceId,
      userId: t.userId,
      user: {
        id: t.userId,
        email: t.userEmail,
        name: t.userName,
        avatar: t.userAvatar,
      },
      bypassAll: t.bypassAll,
      bypassDomain: t.bypassDomain,
      bypassIP: t.bypassIP,
      bypassRate: t.bypassRate,
      note: t.note,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
      createdBy: t.createdBy,
      updatedAt: t.updatedAt,
    };
  }

  async createUserTester(
    serviceId: string,
    dto: CreateTesterUserDto,
    admin: AdminPayload,
  ): Promise<TesterUserResponseDto> {
    // Check if user exists
    const users = await this.prisma.$queryRaw<{ id: string; email: string }[]>(
      Prisma.sql`SELECT id, email FROM users WHERE id = ${dto.userId}::uuid LIMIT 1`,
    );

    if (!users.length) {
      throw new BadRequestException(`User not found: ${dto.userId}`);
    }

    // Check if already a tester
    const existing = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
      SELECT id FROM service_tester_users
      WHERE service_id = ${serviceId}::uuid AND user_id = ${dto.userId}::uuid
      LIMIT 1
    `,
    );

    if (existing.length) {
      throw new BadRequestException('User is already a tester for this service');
    }

    const testerId = ID.generate();
    const { reason, ...testerData } = dto;

    await this.prisma.$executeRaw(
      Prisma.sql`
      INSERT INTO service_tester_users (
        id, service_id, user_id, bypass_all, bypass_domain, bypass_ip, bypass_rate,
        note, expires_at, created_by
      )
      VALUES (
        ${testerId}::uuid,
        ${serviceId}::uuid,
        ${dto.userId}::uuid,
        ${testerData.bypassAll ?? false},
        ${testerData.bypassDomain ?? true},
        ${testerData.bypassIP ?? true},
        ${testerData.bypassRate ?? false},
        ${testerData.note ?? null},
        ${testerData.expiresAt ? new Date(testerData.expiresAt) : null}::timestamptz,
        ${admin.sub}::uuid
      )
    `,
    );

    const tester = await this.getUserTester(serviceId, dto.userId);

    await this.auditLogService.log({
      resource: 'tester_user',
      action: 'create',
      targetId: dto.userId,
      targetType: 'User',
      targetIdentifier: users[0].email,
      afterState: tester,
      reason,
      admin,
    });

    await this.invalidateUserTesterCache(serviceId, dto.userId);

    return tester;
  }

  async updateUserTester(
    serviceId: string,
    userId: string,
    dto: UpdateTesterUserDto,
    admin: AdminPayload,
  ): Promise<TesterUserResponseDto> {
    const beforeTester = await this.getUserTester(serviceId, userId);
    const { reason, ...updateData } = dto;

    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE service_tester_users
      SET
        bypass_all = COALESCE(${updateData.bypassAll ?? null}::BOOLEAN, bypass_all),
        bypass_domain = COALESCE(${updateData.bypassDomain ?? null}::BOOLEAN, bypass_domain),
        bypass_ip = COALESCE(${updateData.bypassIP ?? null}::BOOLEAN, bypass_ip),
        bypass_rate = COALESCE(${updateData.bypassRate ?? null}::BOOLEAN, bypass_rate),
        note = COALESCE(${updateData.note ?? null}, note),
        expires_at = COALESCE(${updateData.expiresAt ? new Date(updateData.expiresAt) : null}::timestamptz, expires_at),
        updated_at = NOW()
      WHERE service_id = ${serviceId}::uuid AND user_id = ${userId}::uuid
    `,
    );

    const afterTester = await this.getUserTester(serviceId, userId);

    await this.auditLogService.log({
      resource: 'tester_user',
      action: 'update',
      targetId: userId,
      targetType: 'User',
      targetIdentifier: afterTester.user.email,
      beforeState: beforeTester,
      afterState: afterTester,
      reason,
      admin,
    });

    await this.invalidateUserTesterCache(serviceId, userId);

    return afterTester;
  }

  async deleteUserTester(
    serviceId: string,
    userId: string,
    reason: string,
    admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    const tester = await this.getUserTester(serviceId, userId);

    await this.prisma.$executeRaw(
      Prisma.sql`
      DELETE FROM service_tester_users
      WHERE service_id = ${serviceId}::uuid AND user_id = ${userId}::uuid
    `,
    );

    await this.auditLogService.log({
      resource: 'tester_user',
      action: 'delete',
      targetId: userId,
      targetType: 'User',
      targetIdentifier: tester.user.email,
      beforeState: tester,
      reason,
      admin,
    });

    await this.invalidateUserTesterCache(serviceId, userId);

    return { success: true };
  }

  // ============================================================
  // ADMIN TESTERS
  // ============================================================

  async listAdminTesters(serviceId: string): Promise<TesterAdminListResponseDto> {
    const cacheKey = TESTERS_ADMIN_CACHE_KEY(serviceId);
    const cached = await this.cache.get<TesterAdminListResponseDto>(cacheKey);
    if (cached) return cached;

    const testers = await this.prisma.$queryRaw<TesterAdminRow[]>(
      Prisma.sql`
      SELECT
        t.id, t.service_id as "serviceId", t.admin_id as "adminId",
        a.email as "adminEmail", a.name as "adminName",
        t.bypass_all as "bypassAll", t.bypass_domain as "bypassDomain",
        t.note, t.expires_at as "expiresAt",
        t.created_at as "createdAt", t.created_by as "createdBy"
      FROM service_tester_admins t
      JOIN admins a ON a.id = t.admin_id
      WHERE t.service_id = ${serviceId}::uuid
      ORDER BY t.created_at DESC
    `,
    );

    const data: TesterAdminResponseDto[] = testers.map((t) => ({
      id: t.id,
      serviceId: t.serviceId,
      adminId: t.adminId,
      admin: {
        id: t.adminId,
        email: t.adminEmail,
        name: t.adminName,
      },
      bypassAll: t.bypassAll,
      bypassDomain: t.bypassDomain,
      note: t.note,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
      createdBy: t.createdBy,
    }));

    const response: TesterAdminListResponseDto = {
      data,
      meta: { total: data.length, serviceId },
    };

    await this.cache.set(cacheKey, response, CacheTTL.SEMI_STATIC);

    return response;
  }

  async createAdminTester(
    serviceId: string,
    dto: CreateTesterAdminDto,
    admin: AdminPayload,
  ): Promise<TesterAdminResponseDto> {
    // Check if admin exists
    const admins = await this.prisma.$queryRaw<{ id: string; email: string; name: string }[]>(
      Prisma.sql`SELECT id, email, name FROM admins WHERE id = ${dto.adminId}::uuid LIMIT 1`,
    );

    if (!admins.length) {
      throw new BadRequestException(`Admin not found: ${dto.adminId}`);
    }

    // Check if already a tester
    const existing = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
      SELECT id FROM service_tester_admins
      WHERE service_id = ${serviceId}::uuid AND admin_id = ${dto.adminId}::uuid
      LIMIT 1
    `,
    );

    if (existing.length) {
      throw new BadRequestException('Admin is already a tester for this service');
    }

    const testerId = ID.generate();
    const { reason, ...testerData } = dto;

    await this.prisma.$executeRaw(
      Prisma.sql`
      INSERT INTO service_tester_admins (
        id, service_id, admin_id, bypass_all, bypass_domain,
        note, expires_at, created_by
      )
      VALUES (
        ${testerId}::uuid,
        ${serviceId}::uuid,
        ${dto.adminId}::uuid,
        ${testerData.bypassAll ?? false},
        ${testerData.bypassDomain ?? true},
        ${testerData.note ?? null},
        ${testerData.expiresAt ? new Date(testerData.expiresAt) : null}::timestamptz,
        ${admin.sub}::uuid
      )
    `,
    );

    const result: TesterAdminResponseDto = {
      id: testerId,
      serviceId,
      adminId: dto.adminId,
      admin: {
        id: dto.adminId,
        email: admins[0].email,
        name: admins[0].name,
      },
      bypassAll: testerData.bypassAll ?? false,
      bypassDomain: testerData.bypassDomain ?? true,
      note: testerData.note ?? null,
      expiresAt: testerData.expiresAt ? new Date(testerData.expiresAt) : null,
      createdAt: new Date(),
      createdBy: admin.sub,
    };

    await this.auditLogService.log({
      resource: 'tester_admin',
      action: 'create',
      targetId: dto.adminId,
      targetType: 'Admin',
      targetIdentifier: admins[0].email,
      afterState: result,
      reason,
      admin,
    });

    await this.invalidateAdminTesterCache(serviceId);

    return result;
  }

  async deleteAdminTester(
    serviceId: string,
    adminId: string,
    reason: string,
    admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    // Get tester info for audit
    const testers = await this.prisma.$queryRaw<TesterAdminRow[]>(
      Prisma.sql`
      SELECT
        t.id, t.service_id as "serviceId", t.admin_id as "adminId",
        a.email as "adminEmail", a.name as "adminName"
      FROM service_tester_admins t
      JOIN admins a ON a.id = t.admin_id
      WHERE t.service_id = ${serviceId}::uuid AND t.admin_id = ${adminId}::uuid
      LIMIT 1
    `,
    );

    if (!testers.length) {
      throw new NotFoundException(`Admin tester not found: ${adminId}`);
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
      DELETE FROM service_tester_admins
      WHERE service_id = ${serviceId}::uuid AND admin_id = ${adminId}::uuid
    `,
    );

    await this.auditLogService.log({
      resource: 'tester_admin',
      action: 'delete',
      targetId: adminId,
      targetType: 'Admin',
      targetIdentifier: testers[0].adminEmail,
      beforeState: testers[0],
      reason,
      admin,
    });

    await this.invalidateAdminTesterCache(serviceId);

    return { success: true };
  }
}
