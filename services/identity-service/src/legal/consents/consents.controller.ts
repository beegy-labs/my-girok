import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseEnumPipe,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ConsentsService, ConsentQueryDto, ConsentLogQueryDto } from './consents.service';
import { GrantConsentDto, GrantBulkConsentsDto } from './dto/grant-consent.dto';
import { WithdrawConsentDto } from './dto/withdraw-consent.dto';
import {
  ConsentEntity,
  ConsentSummaryEntity,
  ConsentListResponse,
  ConsentLogEntity,
  ConsentLogListResponse,
} from './entities/consent.entity';
import { ConsentType, ConsentScope, ConsentLogAction } from '.prisma/identity-legal-client';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

/**
 * Extract audit information from request
 */
const extractAuditInfo = (req: Request) => ({
  ipAddress: req.ip || req.socket?.remoteAddress,
  userAgent: req.headers['user-agent'],
});

/**
 * Consents Controller
 *
 * Manages user consent operations including granting, withdrawal, and audit.
 * Implements GDPR/CCPA/PIPA/APPI compliant consent management.
 */
@ApiTags('Consents')
@Controller('legal/consents')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  /**
   * Grant a new consent
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 per minute
  @ApiOperation({
    summary: 'Grant a new consent',
    description: 'Records user consent with full audit trail',
  })
  @ApiResponse({ status: 201, type: ConsentEntity })
  @ApiResponse({ status: 400, description: 'Bad request or consent already exists' })
  async grantConsent(@Body() dto: GrantConsentDto, @Req() req: Request): Promise<ConsentEntity> {
    const { ipAddress, userAgent } = extractAuditInfo(req);
    return this.consentsService.grantConsent({
      ...dto,
      ipAddress: dto.ipAddress || ipAddress,
      userAgent: dto.userAgent || userAgent,
    });
  }

  /**
   * Grant multiple consents at once
   */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({
    summary: 'Grant multiple consents',
    description: 'Records multiple consents in a single transaction (used during registration)',
  })
  @ApiResponse({ status: 201, type: [ConsentEntity] })
  async grantBulkConsents(
    @Body() dto: GrantBulkConsentsDto,
    @Req() req: Request,
  ): Promise<ConsentEntity[]> {
    const { ipAddress, userAgent } = extractAuditInfo(req);
    return this.consentsService.grantBulkConsents(
      dto.accountId,
      dto.countryCode,
      dto.consents,
      dto.ipAddress || ipAddress,
      dto.userAgent || userAgent,
    );
  }

  /**
   * List consents with pagination
   */
  @Get()
  @ApiOperation({
    summary: 'List consents',
    description: 'List consents with optional filters and pagination',
  })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'consentType', required: false, enum: ConsentType })
  @ApiQuery({ name: 'scope', required: false, enum: ConsentScope })
  @ApiQuery({ name: 'countryCode', required: false, type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: ConsentListResponse })
  async listConsents(
    @Query('accountId') accountId?: string,
    @Query('consentType') consentType?: ConsentType,
    @Query('scope') scope?: ConsentScope,
    @Query('countryCode') countryCode?: string,
    @Query('activeOnly') activeOnly?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ConsentListResponse> {
    const query: ConsentQueryDto = {
      accountId,
      consentType,
      scope,
      countryCode,
      activeOnly: activeOnly === true || (activeOnly as unknown) === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };
    return this.consentsService.listConsents(query);
  }

  /**
   * Get consent by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get consent by ID',
    description: 'Retrieves a specific consent record',
  })
  @ApiParam({ name: 'id', description: 'Consent UUID' })
  @ApiResponse({ status: 200, type: ConsentEntity })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async getConsent(@Param('id', ParseUUIDPipe) id: string): Promise<ConsentEntity> {
    return this.consentsService.getConsent(id);
  }

  /**
   * Get consents for an account
   */
  @Get('account/:accountId')
  @ApiOperation({
    summary: 'Get account consents',
    description: 'Get all active consents for an account',
  })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({ status: 200, type: [ConsentSummaryEntity] })
  async getAccountConsents(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<ConsentSummaryEntity[]> {
    return this.consentsService.getAccountConsents(accountId);
  }

  /**
   * Check if account has all required consents
   */
  @Get('account/:accountId/check')
  @ApiOperation({
    summary: 'Check required consents',
    description: 'Check if account has all required consents (Terms of Service, Privacy Policy)',
  })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        hasAllRequired: { type: 'boolean' },
        missingConsents: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async checkRequiredConsents(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<{ hasAllRequired: boolean; missingConsents: ConsentType[] }> {
    const [hasAllRequired, missingConsents] = await Promise.all([
      this.consentsService.hasAllRequiredConsents(accountId),
      this.consentsService.getMissingRequiredConsents(accountId),
    ]);
    return { hasAllRequired, missingConsents };
  }

  /**
   * Get consent history for an account
   */
  @Get('account/:accountId/history')
  @ApiOperation({
    summary: 'Get consent history',
    description: 'Get full consent history including withdrawn consents',
  })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiQuery({ name: 'consentType', required: false, enum: ConsentType })
  @ApiResponse({ status: 200, type: [ConsentEntity] })
  async getConsentHistory(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('consentType') consentType?: ConsentType,
  ): Promise<ConsentEntity[]> {
    return this.consentsService.getConsentHistory(accountId, consentType);
  }

  /**
   * Withdraw consent by ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({
    summary: 'Withdraw consent',
    description: 'Withdraw a consent by ID. Required consents cannot be withdrawn.',
  })
  @ApiParam({ name: 'id', description: 'Consent UUID' })
  @ApiResponse({ status: 204, description: 'Consent withdrawn successfully' })
  @ApiResponse({ status: 400, description: 'Cannot withdraw required consent' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async withdrawConsent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawConsentDto,
    @Req() req: Request,
  ): Promise<void> {
    const { ipAddress, userAgent } = extractAuditInfo(req);
    await this.consentsService.withdrawConsent(id, {
      ...dto,
      ipAddress: dto.ipAddress || ipAddress,
      userAgent: dto.userAgent || userAgent,
    });
  }

  /**
   * Withdraw consent by account and type
   */
  @Delete('account/:accountId/type/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({
    summary: 'Withdraw consent by type',
    description: 'Withdraw a consent by account ID and consent type',
  })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiParam({ name: 'type', description: 'Consent type', enum: ConsentType })
  @ApiResponse({ status: 204, description: 'Consent withdrawn successfully' })
  @ApiResponse({ status: 400, description: 'Cannot withdraw required consent' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async withdrawConsentByType(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('type', new ParseEnumPipe(ConsentType)) type: ConsentType,
    @Body() dto: WithdrawConsentDto,
    @Req() req: Request,
  ): Promise<void> {
    const { ipAddress, userAgent } = extractAuditInfo(req);
    await this.consentsService.withdrawConsentByType(accountId, type, {
      ...dto,
      ipAddress: dto.ipAddress || ipAddress,
      userAgent: dto.userAgent || userAgent,
    });
  }

  /**
   * Get audit logs for a consent
   */
  @Get(':id/logs')
  @ApiOperation({
    summary: 'Get consent audit logs',
    description: 'Get all audit log entries for a specific consent',
  })
  @ApiParam({ name: 'id', description: 'Consent UUID' })
  @ApiResponse({ status: 200, type: [ConsentLogEntity] })
  async getConsentLogs(@Param('id', ParseUUIDPipe) id: string): Promise<ConsentLogEntity[]> {
    return this.consentsService.getConsentLogs(id);
  }

  /**
   * List all consent logs
   */
  @Get('logs/all')
  @ApiOperation({
    summary: 'List consent logs',
    description: 'List all consent logs with pagination and filters',
  })
  @ApiQuery({ name: 'consentId', required: false, type: String })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: ConsentLogAction })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: ConsentLogListResponse })
  async listConsentLogs(
    @Query('consentId') consentId?: string,
    @Query('accountId') accountId?: string,
    @Query('action') action?: ConsentLogAction,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ConsentLogListResponse> {
    const query: ConsentLogQueryDto = {
      consentId,
      accountId,
      action,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };
    return this.consentsService.listConsentLogs(query);
  }
}
