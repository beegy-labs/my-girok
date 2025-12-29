import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID } from '@my-girok/nest-common';
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
  ) {}

  // ============================================================
  // DOMAIN MANAGEMENT
  // ============================================================

  async getDomains(serviceId: string): Promise<DomainResponseDto> {
    const service = await this.getService(serviceId);
    return {
      domains: service.domains || [],
      primaryDomain: service.domains?.[0] || null,
    };
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

    return {
      domains: afterDomains,
      primaryDomain: afterDomains[0] || null,
    };
  }

  // ============================================================
  // CONFIG MANAGEMENT
  // ============================================================

  async getConfig(serviceId: string): Promise<ServiceConfigResponseDto> {
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
      return this.createDefaultConfig(serviceId);
    }

    return configs[0] as ServiceConfigResponseDto;
  }

  async updateConfig(
    serviceId: string,
    dto: UpdateServiceConfigDto,
    admin: AdminPayload,
  ): Promise<ServiceConfigResponseDto> {
    const beforeConfig = await this.getConfig(serviceId);
    const { reason, ...updateData } = dto;

    // Build SET clause dynamically
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updateData.jwtValidation !== undefined) {
      setClauses.push('jwt_validation = $' + (values.length + 1));
      values.push(updateData.jwtValidation);
    }
    if (updateData.domainValidation !== undefined) {
      setClauses.push('domain_validation = $' + (values.length + 1));
      values.push(updateData.domainValidation);
    }
    if (updateData.ipWhitelistEnabled !== undefined) {
      setClauses.push('ip_whitelist_enabled = $' + (values.length + 1));
      values.push(updateData.ipWhitelistEnabled);
    }
    if (updateData.ipWhitelist !== undefined) {
      setClauses.push('ip_whitelist = $' + (values.length + 1));
      values.push(updateData.ipWhitelist);
    }
    if (updateData.rateLimitEnabled !== undefined) {
      setClauses.push('rate_limit_enabled = $' + (values.length + 1));
      values.push(updateData.rateLimitEnabled);
    }
    if (updateData.rateLimitRequests !== undefined) {
      setClauses.push('rate_limit_requests = $' + (values.length + 1));
      values.push(updateData.rateLimitRequests);
    }
    if (updateData.rateLimitWindow !== undefined) {
      setClauses.push('rate_limit_window = $' + (values.length + 1));
      values.push(updateData.rateLimitWindow);
    }
    if (updateData.maintenanceMode !== undefined) {
      setClauses.push('maintenance_mode = $' + (values.length + 1));
      values.push(updateData.maintenanceMode);
    }
    if (updateData.maintenanceMessage !== undefined) {
      setClauses.push('maintenance_message = $' + (values.length + 1));
      values.push(updateData.maintenanceMessage);
    }
    if (updateData.auditLevel !== undefined) {
      setClauses.push('audit_level = $' + (values.length + 1) + '::audit_level');
      values.push(updateData.auditLevel);
    }

    // Always update these
    setClauses.push('updated_at = NOW()');
    setClauses.push('updated_by = $' + (values.length + 1) + '::uuid');
    values.push(admin.sub);

    // Use raw SQL for update
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

    return afterConfig;
  }

  // ============================================================
  // HELPERS
  // ============================================================

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
