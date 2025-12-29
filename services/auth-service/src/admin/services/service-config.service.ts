import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID, CacheKey, CacheTTL } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from './audit-log.service';
import { AdminPayload } from '../types/admin.types';
import {
  AddDomainDto,
  DomainResponseDto,
  UpdateServiceConfigDto,
  ServiceConfigResponseDto,
  AuditLevel,
} from '../dto/service-config.dto';

// Cache key helpers
const CONFIG_CACHE_KEY = (serviceId: string) => CacheKey.make('auth', 'service_config', serviceId);
const DOMAIN_CACHE_KEY = (serviceId: string) => CacheKey.make('auth', 'service_domains', serviceId);

interface ServiceConfigRow {
  id: string;
  serviceId: string;
  jwtValidation: boolean;
  domainValidation: boolean;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  auditLevel: AuditLevel;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

interface ServiceRow {
  id: string;
  slug: string;
  domains: string[];
}

@Injectable()
export class ServiceConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================
  // DOMAIN MANAGEMENT
  // ============================================================

  async getDomains(serviceId: string): Promise<DomainResponseDto> {
    // Check cache first
    const cacheKey = DOMAIN_CACHE_KEY(serviceId);
    const cached = await this.cache.get<DomainResponseDto>(cacheKey);
    if (cached) return cached;

    const service = await this.getService(serviceId);
    const result: DomainResponseDto = {
      domains: service.domains || [],
      primaryDomain: service.domains?.[0] || null,
    };

    // Cache for 24h (static config)
    await this.cache.set(cacheKey, result, CacheTTL.STATIC_CONFIG);
    return result;
  }

  async addDomain(
    serviceId: string,
    dto: AddDomainDto,
    admin: AdminPayload,
  ): Promise<DomainResponseDto> {
    const service = await this.getService(serviceId);

    // Check if domain already exists in any service
    const existing = await this.prisma.$queryRaw<{ id: string; slug: string }[]>(
      Prisma.sql`
      SELECT id, slug FROM services
      WHERE ${dto.domain} = ANY(domains)
      LIMIT 1
    `,
    );

    if (existing.length) {
      throw new BadRequestException(
        `Domain ${dto.domain} already assigned to service ${existing[0].slug}`,
      );
    }

    const beforeDomains = service.domains || [];

    // Add domain to array
    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE services
      SET domains = array_append(domains, ${dto.domain}),
          updated_at = NOW()
      WHERE id = ${serviceId}::uuid
    `,
    );

    const afterDomains = [...beforeDomains, dto.domain];

    // Invalidate cache
    await this.cache.del(DOMAIN_CACHE_KEY(serviceId));

    // Audit log
    await this.auditLogService.log({
      resource: 'service_domain',
      action: 'create',
      targetId: serviceId,
      targetType: 'Service',
      targetIdentifier: dto.domain,
      beforeState: { domains: beforeDomains },
      afterState: { domains: afterDomains },
      changedFields: ['domains'],
      admin,
    });

    // Emit event for cross-service notification
    this.eventEmitter.emit('service.domain.added', { serviceId, domain: dto.domain });

    return {
      domains: afterDomains,
      primaryDomain: afterDomains[0] || null,
    };
  }

  async removeDomain(
    serviceId: string,
    domain: string,
    admin: AdminPayload,
  ): Promise<DomainResponseDto> {
    const service = await this.getService(serviceId);

    if (!service.domains?.includes(domain)) {
      throw new BadRequestException(`Domain ${domain} not found in service`);
    }

    const beforeDomains = service.domains;

    // Remove domain from array
    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE services
      SET domains = array_remove(domains, ${domain}),
          updated_at = NOW()
      WHERE id = ${serviceId}::uuid
    `,
    );

    const afterDomains = beforeDomains.filter((d) => d !== domain);

    // Invalidate cache
    await this.cache.del(DOMAIN_CACHE_KEY(serviceId));

    // Audit log
    await this.auditLogService.log({
      resource: 'service_domain',
      action: 'delete',
      targetId: serviceId,
      targetType: 'Service',
      targetIdentifier: domain,
      beforeState: { domains: beforeDomains },
      afterState: { domains: afterDomains },
      changedFields: ['domains'],
      admin,
    });

    // Emit event for cross-service notification
    this.eventEmitter.emit('service.domain.removed', { serviceId, domain });

    return {
      domains: afterDomains,
      primaryDomain: afterDomains[0] || null,
    };
  }

  // ============================================================
  // CONFIG MANAGEMENT
  // ============================================================

  async getConfig(serviceId: string): Promise<ServiceConfigResponseDto> {
    // Check cache first
    const cacheKey = CONFIG_CACHE_KEY(serviceId);
    const cached = await this.cache.get<ServiceConfigResponseDto>(cacheKey);
    if (cached) return cached;

    // Verify service exists
    await this.getService(serviceId);

    const configs = await this.prisma.$queryRaw<ServiceConfigRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId",
        jwt_validation as "jwtValidation",
        domain_validation as "domainValidation",
        ip_whitelist_enabled as "ipWhitelistEnabled",
        ip_whitelist as "ipWhitelist",
        rate_limit_enabled as "rateLimitEnabled",
        rate_limit_requests as "rateLimitRequests",
        rate_limit_window as "rateLimitWindow",
        maintenance_mode as "maintenanceMode",
        maintenance_message as "maintenanceMessage",
        audit_level as "auditLevel",
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM service_configs
      WHERE service_id = ${serviceId}::uuid
      LIMIT 1
    `,
    );

    if (!configs.length) {
      // Create default config if not exists
      const newConfig = await this.createDefaultConfig(serviceId);
      await this.cache.set(cacheKey, newConfig, CacheTTL.STATIC_CONFIG);
      return newConfig;
    }

    const result = configs[0] as ServiceConfigResponseDto;
    // Cache for 24h (static config)
    await this.cache.set(cacheKey, result, CacheTTL.STATIC_CONFIG);
    return result;
  }

  async updateConfig(
    serviceId: string,
    dto: UpdateServiceConfigDto,
    admin: AdminPayload,
  ): Promise<ServiceConfigResponseDto> {
    // Get before state (bypass cache for accuracy)
    const beforeConfig = await this.getConfigFromDb(serviceId);
    const { reason, ...updateData } = dto;

    // Use raw SQL with COALESCE for update
    const updated = await this.prisma.$queryRaw<ServiceConfigRow[]>(
      Prisma.sql`
      UPDATE service_configs
      SET
        jwt_validation = COALESCE(${updateData.jwtValidation ?? null}::BOOLEAN, jwt_validation),
        domain_validation = COALESCE(${updateData.domainValidation ?? null}::BOOLEAN, domain_validation),
        ip_whitelist_enabled = COALESCE(${updateData.ipWhitelistEnabled ?? null}::BOOLEAN, ip_whitelist_enabled),
        ip_whitelist = COALESCE(${updateData.ipWhitelist ?? null}::TEXT[], ip_whitelist),
        rate_limit_enabled = COALESCE(${updateData.rateLimitEnabled ?? null}::BOOLEAN, rate_limit_enabled),
        rate_limit_requests = COALESCE(${updateData.rateLimitRequests ?? null}::INTEGER, rate_limit_requests),
        rate_limit_window = COALESCE(${updateData.rateLimitWindow ?? null}::INTEGER, rate_limit_window),
        maintenance_mode = COALESCE(${updateData.maintenanceMode ?? null}::BOOLEAN, maintenance_mode),
        maintenance_message = COALESCE(${updateData.maintenanceMessage ?? null}::TEXT, maintenance_message),
        audit_level = COALESCE(${updateData.auditLevel ?? null}::audit_level, audit_level),
        updated_at = NOW(),
        updated_by = ${admin.sub}::uuid
      WHERE service_id = ${serviceId}::uuid
      RETURNING
        id, service_id as "serviceId",
        jwt_validation as "jwtValidation",
        domain_validation as "domainValidation",
        ip_whitelist_enabled as "ipWhitelistEnabled",
        ip_whitelist as "ipWhitelist",
        rate_limit_enabled as "rateLimitEnabled",
        rate_limit_requests as "rateLimitRequests",
        rate_limit_window as "rateLimitWindow",
        maintenance_mode as "maintenanceMode",
        maintenance_message as "maintenanceMessage",
        audit_level as "auditLevel",
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `,
    );

    const afterConfig = updated[0] as ServiceConfigResponseDto;

    // Calculate changed fields
    const changedFields = Object.keys(updateData).filter(
      (key) =>
        beforeConfig[key as keyof ServiceConfigResponseDto] !==
        afterConfig[key as keyof ServiceConfigResponseDto],
    );

    // Invalidate cache
    await this.cache.del(CONFIG_CACHE_KEY(serviceId));

    // Audit log
    await this.auditLogService.log({
      resource: 'service_config',
      action: 'update',
      targetId: afterConfig.id,
      targetType: 'ServiceConfig',
      targetIdentifier: `config:${serviceId}`,
      beforeState: beforeConfig,
      afterState: afterConfig,
      changedFields,
      reason,
      admin,
    });

    // Emit events for cross-service notification
    this.eventEmitter.emit('service.config.updated', { serviceId });
    if (updateData.maintenanceMode !== undefined) {
      this.eventEmitter.emit(
        updateData.maintenanceMode ? 'service.maintenance.enabled' : 'service.maintenance.disabled',
        { serviceId },
      );
    }

    return afterConfig;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async getConfigFromDb(serviceId: string): Promise<ServiceConfigResponseDto> {
    await this.getService(serviceId);

    const configs = await this.prisma.$queryRaw<ServiceConfigRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId",
        jwt_validation as "jwtValidation",
        domain_validation as "domainValidation",
        ip_whitelist_enabled as "ipWhitelistEnabled",
        ip_whitelist as "ipWhitelist",
        rate_limit_enabled as "rateLimitEnabled",
        rate_limit_requests as "rateLimitRequests",
        rate_limit_window as "rateLimitWindow",
        maintenance_mode as "maintenanceMode",
        maintenance_message as "maintenanceMessage",
        audit_level as "auditLevel",
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM service_configs
      WHERE service_id = ${serviceId}::uuid
      LIMIT 1
    `,
    );

    if (!configs.length) {
      return this.createDefaultConfig(serviceId);
    }

    return configs[0] as ServiceConfigResponseDto;
  }

  private async getService(serviceId: string): Promise<ServiceRow> {
    const services = await this.prisma.$queryRaw<ServiceRow[]>(
      Prisma.sql`
      SELECT id, slug, domains
      FROM services
      WHERE id = ${serviceId}::uuid
      LIMIT 1
    `,
    );

    if (!services.length) {
      throw new NotFoundException(`Service not found: ${serviceId}`);
    }

    return services[0];
  }

  private async createDefaultConfig(serviceId: string): Promise<ServiceConfigResponseDto> {
    const configId = ID.generate();

    const created = await this.prisma.$queryRaw<ServiceConfigRow[]>(
      Prisma.sql`
      INSERT INTO service_configs (id, service_id)
      VALUES (${configId}::uuid, ${serviceId}::uuid)
      RETURNING
        id, service_id as "serviceId",
        jwt_validation as "jwtValidation",
        domain_validation as "domainValidation",
        ip_whitelist_enabled as "ipWhitelistEnabled",
        ip_whitelist as "ipWhitelist",
        rate_limit_enabled as "rateLimitEnabled",
        rate_limit_requests as "rateLimitRequests",
        rate_limit_window as "rateLimitWindow",
        maintenance_mode as "maintenanceMode",
        maintenance_message as "maintenanceMessage",
        audit_level as "auditLevel",
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `,
    );

    return created[0] as ServiceConfigResponseDto;
  }
}
