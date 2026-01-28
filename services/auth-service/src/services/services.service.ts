import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ID, CacheKey, CacheTTL, IdentityGrpcClient, isGrpcError } from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ConsentType } from '@my-girok/types';
import {
  ConsentInput,
  ConsentRequirementResponse,
  ServiceJoinResponse,
  AddCountryConsentResponse,
  UserConsentResponse,
  UpdateConsentResponse,
} from './dto';

interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  requiredConsents: unknown;
}

interface ConsentRequirementRow {
  id: string;
  serviceId: string;
  consentType: string;
  countryCode: string;
  isRequired: boolean;
  documentType: string;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
}

interface UserServiceRow {
  id: string;
  userId: string;
  serviceId: string;
  status: string;
  countryCode: string;
  joinedAt: Date;
  serviceSlug: string;
}

interface UserConsentRow {
  id: string;
  userId: string;
  serviceId: string;
  consentType: string;
  countryCode: string;
  documentId: string | null;
  agreed: boolean;
  agreedAt: Date | null;
  withdrawnAt: Date | null;
}

/**
 * Services Service for user service join and consent management
 * Issue: #356
 */
@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private identityClient: IdentityGrpcClient,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  /**
   * Get service by slug with caching
   * Cache key: {env}:auth:service:{slug}
   * TTL: 24 hours
   */
  private async getServiceBySlug(slug: string): Promise<ServiceRow> {
    const cacheKey = CacheKey.make('auth', 'service', slug);
    const cached = await this.cache.get<ServiceRow>(cacheKey);
    if (cached) {
      return cached;
    }

    const services = await this.prisma.$queryRaw<ServiceRow[]>`
      SELECT id, slug, name, required_consents as "requiredConsents"
      FROM services
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    `;

    if (!services.length) {
      throw new NotFoundException(`Service not found: ${slug}`);
    }

    const service = services[0];
    await this.cache.set(cacheKey, service, CacheTTL.STATIC_CONFIG);
    return service;
  }

  /**
   * Invalidate service cache by slug
   * Should be called when service configuration is updated
   */
  async invalidateServiceCache(slug: string): Promise<void> {
    const cacheKey = CacheKey.make('auth', 'service', slug);
    await this.cache.del(cacheKey);
  }

  /**
   * Get service by domain
   * Supports exact match and partial matching (removes protocol and port)
   * Returns null if service not found
   */
  async getServiceFromDomain(domain: string): Promise<ServiceRow | null> {
    if (!domain) {
      return null;
    }

    // Normalize domain (remove protocol, trailing slash)
    let normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Also try without port for matching
    const domainWithoutPort = normalizedDomain.replace(/:\d+$/, '');

    // Find service with matching domain
    const services = await this.prisma.$queryRaw<ServiceRow[]>`
      SELECT id, slug, name, required_consents as "requiredConsents"
      FROM services
      WHERE is_active = true
        AND (
          ${normalizedDomain} = ANY(domains)
          OR ${domainWithoutPort} = ANY(domains)
        )
      LIMIT 1
    `;

    return services.length > 0 ? services[0] : null;
  }

  /**
   * Get consent requirements for a service and country
   */
  async getConsentRequirements(
    slug: string,
    countryCode: string,
    _locale: string = 'en',
  ): Promise<ConsentRequirementResponse[]> {
    // Find service (cached)
    const service = await this.getServiceBySlug(slug);

    // Get consent requirements for this service and country
    const requirements = await this.prisma.$queryRaw<ConsentRequirementRow[]>`
      SELECT
        scr.id,
        scr.service_id as "serviceId",
        scr.consent_type as "consentType",
        scr.country_code as "countryCode",
        scr.is_required as "isRequired",
        scr.document_type as "documentType",
        scr.display_order as "displayOrder",
        scr.label_key as "labelKey",
        scr.description_key as "descriptionKey"
      FROM service_consent_requirements scr
      WHERE scr.service_id = ${service.id}::uuid
        AND scr.country_code = ${countryCode}
      ORDER BY scr.display_order ASC
    `;

    return requirements.map((r) => ({
      type: r.consentType as ConsentType,
      isRequired: r.isRequired,
    }));
  }

  /**
   * Join a service with consents
   */
  async joinService(
    userId: string,
    slug: string,
    countryCode: string,
    consents: ConsentInput[],
    ip: string,
    userAgent: string,
  ): Promise<ServiceJoinResponse> {
    // Find service (cached)
    const service = await this.getServiceBySlug(slug);

    // Check if already joined
    const existingJoin = await this.prisma.$queryRaw<UserServiceRow[]>`
      SELECT id FROM user_services
      WHERE user_id = ${userId}::uuid
        AND service_id = ${service.id}::uuid
        AND country_code = ${countryCode}
      LIMIT 1
    `;

    if (existingJoin.length) {
      throw new ConflictException(`Already joined service: ${slug} in ${countryCode}`);
    }

    // Validate required consents
    await this.validateRequiredConsents(service.id, countryCode, consents);

    // Create user_service and consents in transaction
    const userServiceId = await this.createUserServiceWithConsents(
      userId,
      service.id,
      countryCode,
      consents,
      ip,
      userAgent,
    );

    // Get updated user services for new token
    const userServices = await this.getUserServices(userId);

    // Get user info for token generation via gRPC
    let email = '';
    let accountMode: 'SERVICE' | 'UNIFIED' = 'SERVICE';
    let userCountryCode = 'KR';

    try {
      const accountResponse = await this.identityClient.getAccount({ id: userId });
      if (!accountResponse.account) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      email = accountResponse.account.email;
      // Get profile for additional info if needed
      try {
        const profileResponse = await this.identityClient.getProfile({ account_id: userId });
        if (profileResponse.profile) {
          userCountryCode = profileResponse.profile.country_code || 'KR';
        }
      } catch {
        // Profile not found is OK
      }
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      this.logger.error('Failed to get account info for token generation', error);
      throw error;
    }

    // Generate new tokens with updated services
    const tokens = await this.authService.generateTokensWithServices(
      userId,
      email,
      accountMode,
      userCountryCode,
      userServices,
    );

    // Save refresh token
    await this.authService.saveRefreshToken(userId, tokens.refreshToken);

    return {
      userService: {
        id: userServiceId,
        serviceId: service.id,
        serviceSlug: slug,
        countryCode,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Add consent for a new country (existing service user)
   */
  async addCountryConsent(
    userId: string,
    slug: string,
    countryCode: string,
    consents: ConsentInput[],
    ip: string,
    userAgent: string,
  ): Promise<AddCountryConsentResponse> {
    // Find service (cached)
    const service = await this.getServiceBySlug(slug);

    // Check if user has joined this service (any country)
    const existingJoin = await this.prisma.$queryRaw<UserServiceRow[]>`
      SELECT id FROM user_services
      WHERE user_id = ${userId}::uuid
        AND service_id = ${service.id}::uuid
        AND status = 'ACTIVE'
      LIMIT 1
    `;

    if (!existingJoin.length) {
      throw new BadRequestException(`Must join service first: ${slug}`);
    }

    // Check if already has consent for this country
    const existingCountry = await this.prisma.$queryRaw<UserServiceRow[]>`
      SELECT id FROM user_services
      WHERE user_id = ${userId}::uuid
        AND service_id = ${service.id}::uuid
        AND country_code = ${countryCode}
      LIMIT 1
    `;

    if (existingCountry.length) {
      throw new ConflictException(`Already have consent for country: ${countryCode}`);
    }

    // Validate required consents
    await this.validateRequiredConsents(service.id, countryCode, consents);

    // Create user_service entry for new country
    await this.createUserServiceWithConsents(
      userId,
      service.id,
      countryCode,
      consents,
      ip,
      userAgent,
    );

    // Get updated user services for new token
    const userServices = await this.getUserServices(userId);

    // Get user info for token generation via gRPC
    let email = '';
    let accountMode: 'SERVICE' | 'UNIFIED' = 'SERVICE';
    let userCountryCode = 'KR';

    try {
      const accountResponse = await this.identityClient.getAccount({ id: userId });
      if (!accountResponse.account) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      email = accountResponse.account.email;
      // Get profile for additional info if needed
      try {
        const profileResponse = await this.identityClient.getProfile({ account_id: userId });
        if (profileResponse.profile) {
          userCountryCode = profileResponse.profile.country_code || 'KR';
        }
      } catch {
        // Profile not found is OK
      }
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      throw error;
    }

    // Generate new tokens with updated services
    const tokens = await this.authService.generateTokensWithServices(
      userId,
      email,
      accountMode,
      userCountryCode,
      userServices,
    );

    // Save refresh token
    await this.authService.saveRefreshToken(userId, tokens.refreshToken);

    return {
      countryCode,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Get user's consents for a service
   */
  async getMyConsents(
    userId: string,
    slug: string,
    countryCode?: string,
  ): Promise<UserConsentResponse[]> {
    // Find service (cached)
    const service = await this.getServiceBySlug(slug);

    let consents: UserConsentRow[];

    if (countryCode) {
      consents = await this.prisma.$queryRaw<UserConsentRow[]>`
        SELECT
          id, user_id as "userId", service_id as "serviceId",
          consent_type as "consentType", country_code as "countryCode",
          document_id as "documentId", agreed, agreed_at as "agreedAt",
          withdrawn_at as "withdrawnAt"
        FROM user_consents
        WHERE user_id = ${userId}::uuid
          AND service_id = ${service.id}::uuid
          AND country_code = ${countryCode}
        ORDER BY consent_type ASC
      `;
    } else {
      consents = await this.prisma.$queryRaw<UserConsentRow[]>`
        SELECT
          id, user_id as "userId", service_id as "serviceId",
          consent_type as "consentType", country_code as "countryCode",
          document_id as "documentId", agreed, agreed_at as "agreedAt",
          withdrawn_at as "withdrawnAt"
        FROM user_consents
        WHERE user_id = ${userId}::uuid
          AND service_id = ${service.id}::uuid
        ORDER BY country_code ASC, consent_type ASC
      `;
    }

    return consents.map((c) => ({
      id: c.id,
      consentType: c.consentType as ConsentType,
      countryCode: c.countryCode,
      documentId: c.documentId || undefined,
      agreed: c.agreed,
      agreedAt: c.agreedAt || undefined,
      withdrawnAt: c.withdrawnAt || undefined,
    }));
  }

  /**
   * Update a single consent
   */
  async updateConsent(
    userId: string,
    slug: string,
    consentType: ConsentType,
    countryCode: string,
    agreed: boolean,
    ip: string,
    userAgent: string,
  ): Promise<UpdateConsentResponse> {
    // Find service (cached)
    const service = await this.getServiceBySlug(slug);

    // Find existing consent
    const existingConsents = await this.prisma.$queryRaw<UserConsentRow[]>`
      SELECT id, agreed FROM user_consents
      WHERE user_id = ${userId}::uuid
        AND service_id = ${service.id}::uuid
        AND consent_type = ${consentType}
        AND country_code = ${countryCode}
      LIMIT 1
    `;

    if (!existingConsents.length) {
      throw new NotFoundException(`Consent not found`);
    }

    // Check if required consent is being withdrawn
    if (!agreed) {
      const requirements = await this.prisma.$queryRaw<ConsentRequirementRow[]>`
        SELECT is_required as "isRequired" FROM service_consent_requirements
        WHERE service_id = ${service.id}::uuid
          AND country_code = ${countryCode}
          AND consent_type = ${consentType}
          AND is_required = true
        LIMIT 1
      `;

      if (requirements.length) {
        throw new BadRequestException(`Cannot withdraw required consent: ${consentType}`);
      }
    }

    // Update consent
    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE user_consents
      SET agreed = ${agreed},
          agreed_at = ${agreed ? now : null},
          withdrawn_at = ${agreed ? null : now},
          ip_address = ${ip},
          user_agent = ${userAgent},
          updated_at = NOW()
      WHERE id = ${existingConsents[0].id}::uuid
    `;

    // Get updated consent
    const updatedConsents = await this.prisma.$queryRaw<UserConsentRow[]>`
      SELECT
        id, consent_type as "consentType", country_code as "countryCode",
        document_id as "documentId", agreed, agreed_at as "agreedAt",
        withdrawn_at as "withdrawnAt"
      FROM user_consents
      WHERE id = ${existingConsents[0].id}::uuid
    `;

    const consent = updatedConsents[0];

    return {
      consent: {
        id: consent.id,
        consentType: consent.consentType as ConsentType,
        countryCode: consent.countryCode,
        documentId: consent.documentId || undefined,
        agreed: consent.agreed,
        agreedAt: consent.agreedAt || undefined,
        withdrawnAt: consent.withdrawnAt || undefined,
      },
    };
  }

  /**
   * Withdraw from a service
   */
  async withdrawService(
    userId: string,
    slug: string,
    countryCode?: string,
    _reason?: string,
  ): Promise<void> {
    // Find service (cached)
    const service = await this.getServiceBySlug(slug);

    // Process withdrawal in transaction (CLAUDE.md: @Transactional for multi-step DB)
    await this.prisma.$transaction(async (tx) => {
      if (countryCode) {
        // Withdraw from specific country only
        await tx.$executeRaw`
          UPDATE user_services
          SET status = 'WITHDRAWN', updated_at = NOW()
          WHERE user_id = ${userId}::uuid
            AND service_id = ${service.id}::uuid
            AND country_code = ${countryCode}
        `;

        // Withdraw all consents for this country
        await tx.$executeRaw`
          UPDATE user_consents
          SET agreed = false, withdrawn_at = NOW(), updated_at = NOW()
          WHERE user_id = ${userId}::uuid
            AND service_id = ${service.id}::uuid
            AND country_code = ${countryCode}
        `;
      } else {
        // Withdraw from entire service
        await tx.$executeRaw`
          UPDATE user_services
          SET status = 'WITHDRAWN', updated_at = NOW()
          WHERE user_id = ${userId}::uuid
            AND service_id = ${service.id}::uuid
        `;

        // Withdraw all consents
        await tx.$executeRaw`
          UPDATE user_consents
          SET agreed = false, withdrawn_at = NOW(), updated_at = NOW()
          WHERE user_id = ${userId}::uuid
            AND service_id = ${service.id}::uuid
        `;
      }
    });
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async validateRequiredConsents(
    serviceId: string,
    countryCode: string,
    consents: ConsentInput[],
  ): Promise<void> {
    // Get required consents for this service/country
    const requirements = await this.prisma.$queryRaw<ConsentRequirementRow[]>`
      SELECT consent_type as "consentType", is_required as "isRequired"
      FROM service_consent_requirements
      WHERE service_id = ${serviceId}::uuid
        AND country_code = ${countryCode}
        AND is_required = true
    `;

    const requiredTypes = requirements.map((r) => r.consentType);
    const providedConsents = new Map(consents.map((c) => [c.type, c]));

    for (const requiredType of requiredTypes) {
      const consent = providedConsents.get(requiredType as ConsentType);
      if (!consent || !consent.agreed) {
        throw new BadRequestException(`Required consent missing or not agreed: ${requiredType}`);
      }
    }
  }

  private async createUserServiceWithConsents(
    userId: string,
    serviceId: string,
    countryCode: string,
    consents: ConsentInput[],
    ip: string,
    userAgent: string,
  ): Promise<string> {
    // Generate IDs
    const userServiceId = ID.generate();
    const now = new Date();

    // Process in transaction (CLAUDE.md: @Transactional for multi-step DB)
    await this.prisma.$transaction(async (tx) => {
      // Create user_service
      await tx.$executeRaw`
        INSERT INTO user_services (id, user_id, service_id, country_code, status, joined_at, created_at, updated_at)
        VALUES (${userServiceId}::uuid, ${userId}::uuid, ${serviceId}::uuid, ${countryCode}, 'ACTIVE', ${now}, ${now}, ${now})
      `;

      // Create consents
      for (const consent of consents) {
        const consentId = ID.generate();
        await tx.$executeRaw`
          INSERT INTO user_consents (
            id, user_id, service_id, consent_type, country_code,
            document_id, agreed, agreed_at, ip_address, user_agent, created_at, updated_at
          )
          VALUES (
            ${consentId}::uuid, ${userId}::uuid, ${serviceId}::uuid, ${consent.type}, ${countryCode},
            ${consent.documentId ? consent.documentId : null}::uuid, ${consent.agreed}, ${consent.agreed ? now : null},
            ${ip}, ${userAgent}, ${now}, ${now}
          )
        `;
      }
    });

    return userServiceId;
  }

  private async getUserServices(
    userId: string,
  ): Promise<Array<{ status: string; countryCode: string; serviceSlug: string }>> {
    return this.prisma.$queryRaw<
      Array<{ status: string; countryCode: string; serviceSlug: string }>
    >`
      SELECT us.status, us.country_code as "countryCode", s.slug as "serviceSlug"
      FROM user_services us
      JOIN services s ON us.service_id = s.id
      WHERE us.user_id = ${userId}::uuid AND us.status = 'ACTIVE'
    `;
  }
}
