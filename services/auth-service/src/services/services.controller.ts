import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@my-girok/nest-common';
import { ServicesService } from './services.service';
import {
  ServiceJoinRequest,
  AddCountryConsentRequest,
  UpdateConsentRequest,
  WithdrawServiceRequest,
  ConsentRequirementResponse,
  ServiceJoinResponse,
  AddCountryConsentResponse,
  UserConsentResponse,
  UpdateConsentResponse,
} from './dto';
import { AuthenticatedUser, isAuthenticatedUser } from '@my-girok/types';

/**
 * Services Controller for user service join and consent management
 * Issue: #356
 */
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /**
   * Get service by domain
   * GET /v1/services/domain/:domain
   * Public endpoint - no auth required
   * Used for domain-based service detection
   */
  @Get('domain/:domain')
  @Public()
  async getServiceByDomain(@Param('domain') domain: string) {
    const service = await this.servicesService.getServiceFromDomain(decodeURIComponent(domain));

    if (!service) {
      return null; // Return null instead of 404 for soft failure
    }

    return {
      slug: service.slug,
      name: service.name,
    };
  }

  /**
   * Get consent requirements for a service and country
   * GET /v1/services/:slug/consent-requirements
   * Public endpoint - no auth required
   */
  @Get(':slug/consent-requirements')
  @Public()
  async getConsentRequirements(
    @Param('slug') slug: string,
    @Query('countryCode') countryCode: string,
    @Query('locale') locale: string = 'en',
  ): Promise<ConsentRequirementResponse[]> {
    return this.servicesService.getConsentRequirements(slug, countryCode, locale);
  }

  /**
   * Join a service with consents
   * POST /v1/services/:slug/join
   * Requires user authentication
   */
  @Post(':slug/join')
  @HttpCode(HttpStatus.CREATED)
  async joinService(
    @Param('slug') slug: string,
    @Body() dto: ServiceJoinRequest,
    @Req() req: Request,
  ): Promise<ServiceJoinResponse> {
    const user = this.extractUser(req);
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.servicesService.joinService(
      user.id,
      slug,
      dto.countryCode,
      dto.consents,
      ip,
      userAgent,
    );
  }

  /**
   * Add consent for a new country (existing service user)
   * POST /v1/services/:slug/consent/:countryCode
   * Requires user authentication
   */
  @Post(':slug/consent/:countryCode')
  @HttpCode(HttpStatus.CREATED)
  async addCountryConsent(
    @Param('slug') slug: string,
    @Param('countryCode') countryCode: string,
    @Body() dto: AddCountryConsentRequest,
    @Req() req: Request,
  ): Promise<AddCountryConsentResponse> {
    const user = this.extractUser(req);
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.servicesService.addCountryConsent(
      user.id,
      slug,
      countryCode,
      dto.consents,
      ip,
      userAgent,
    );
  }

  /**
   * Get user's consents for a service
   * GET /v1/services/:slug/my-consents
   * Requires user authentication
   */
  @Get(':slug/my-consents')
  async getMyConsents(
    @Param('slug') slug: string,
    @Query('countryCode') countryCode?: string,
    @Req() req?: Request,
  ): Promise<UserConsentResponse[]> {
    const user = this.extractUser(req!);
    return this.servicesService.getMyConsents(user.id, slug, countryCode);
  }

  /**
   * Update a single consent
   * PATCH /v1/services/:slug/my-consents
   * Requires user authentication
   */
  @Patch(':slug/my-consents')
  async updateConsent(
    @Param('slug') slug: string,
    @Body() dto: UpdateConsentRequest,
    @Req() req: Request,
  ): Promise<UpdateConsentResponse> {
    const user = this.extractUser(req);
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.servicesService.updateConsent(
      user.id,
      slug,
      dto.consentType,
      dto.countryCode,
      dto.agreed,
      ip,
      userAgent,
    );
  }

  /**
   * Withdraw from a service
   * POST /v1/services/:slug/withdraw
   * Requires user authentication
   */
  @Post(':slug/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdrawService(
    @Param('slug') slug: string,
    @Body() dto: WithdrawServiceRequest,
    @Req() req: Request,
  ): Promise<void> {
    const user = this.extractUser(req);
    await this.servicesService.withdrawService(user.id, slug, dto.countryCode, dto.reason);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractUser(req: Request): AuthenticatedUser {
    const user = (req as any).user;
    if (!user || !isAuthenticatedUser(user)) {
      throw new Error('User authentication required');
    }
    return user;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '';
  }
}
