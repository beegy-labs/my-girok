import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseEnumPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { LegalService } from './legal.service';
import { JwtAuthGuard, CurrentUser } from '@my-girok/nest-common';
import { ConsentType, LegalDocumentType } from '.prisma/auth-client';
import {
  CreateConsentsDto,
  UpdateConsentDto,
  GetDocumentQueryDto,
  LegalDocumentResponseDto,
  UserConsentResponseDto,
} from './dto/consent.dto';
import { Request } from 'express';

/**
 * Extract audit information from request
 * Used for GDPR/CCPA compliance tracking
 */
const extractAuditInfo = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});

/**
 * Legal API Controller
 *
 * Handles legal document management and user consent operations.
 * Implements GDPR/CCPA/PIPA/APPI 2025 compliant consent management.
 *
 * @example
 * ```
 * # Get consent requirements for registration (public)
 * GET /legal/consent-requirements?locale=ko
 *
 * # Get Terms of Service document (public)
 * GET /legal/documents/TERMS_OF_SERVICE?locale=en
 *
 * # Get user's current consents (authenticated)
 * GET /legal/consents
 * Authorization: Bearer <token>
 * ```
 */
@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  /**
   * Get consent requirements for registration
   *
   * Returns region-specific consent requirements based on locale.
   * Public endpoint - no authentication required.
   *
   * @param locale - User's locale (ko, en, ja, de, fr, etc.)
   * @returns Region policy with consent requirements and associated documents
   *
   * @example
   * ```
   * GET /legal/consent-requirements?locale=ko
   *
   * Response:
   * {
   *   "region": "KR",
   *   "law": "PIPA (개인정보보호법)",
   *   "nightTimePushRestriction": { "start": 21, "end": 8 },
   *   "requirements": [
   *     { "type": "TERMS_OF_SERVICE", "required": true, "document": {...} },
   *     { "type": "PRIVACY_POLICY", "required": true, "document": {...} }
   *   ]
   * }
   * ```
   */
  @Get('consent-requirements')
  @ApiOperation({
    summary: 'Get consent requirements for registration',
    description: 'Returns region-specific consent requirements based on locale. No auth required.',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'User locale (ko, en, ja)',
    example: 'ko',
  })
  @ApiResponse({ status: 200, description: 'List of consent requirements with region policy' })
  async getConsentRequirements(@Query('locale') locale?: string) {
    return this.legalService.getConsentRequirements(locale || 'ko');
  }

  /**
   * Get a specific legal document by type
   *
   * Returns the latest active version of a legal document.
   * Falls back to Korean if requested locale is unavailable.
   * Public endpoint - no authentication required.
   *
   * @param type - Legal document type (TERMS_OF_SERVICE, PRIVACY_POLICY, etc.)
   * @param query - Query parameters including locale
   * @returns Full legal document content and metadata
   *
   * @example
   * ```
   * GET /legal/documents/TERMS_OF_SERVICE?locale=en
   *
   * Response:
   * {
   *   "id": "uuid",
   *   "type": "TERMS_OF_SERVICE",
   *   "version": "1.0.0",
   *   "locale": "en",
   *   "title": "Terms of Service",
   *   "content": "...",
   *   "effectiveDate": "2025-01-01T00:00:00Z"
   * }
   * ```
   */
  @Get('documents/:type')
  @ApiOperation({
    summary: 'Get legal document by type',
    description: 'Returns latest active version. Falls back to Korean if locale unavailable.',
  })
  @ApiParam({ name: 'type', enum: LegalDocumentType, description: 'Document type' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('type', new ParseEnumPipe(LegalDocumentType)) type: LegalDocumentType,
    @Query() query: GetDocumentQueryDto,
  ) {
    return this.legalService.getDocument(type, query.locale);
  }

  /**
   * Get legal document by unique ID
   *
   * Retrieves a specific document version for audit purposes.
   * Public endpoint - no authentication required.
   *
   * @param id - Document UUID (validated)
   * @returns Legal document content and metadata
   *
   * @example
   * ```
   * GET /legal/documents/id/550e8400-e29b-41d4-a716-446655440000
   * ```
   */
  @Get('documents/id/:id')
  @ApiOperation({
    summary: 'Get legal document by ID',
    description: 'Retrieves specific document version for audit purposes.',
  })
  @ApiParam({ name: 'id', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.legalService.getDocumentById(id);
  }

  /**
   * Get current user's active consents
   *
   * Returns all consents that have not been withdrawn.
   * Requires authentication.
   *
   * @param user - Authenticated user from JWT
   * @returns Array of active user consents with document info
   *
   * @example
   * ```
   * GET /legal/consents
   * Authorization: Bearer <token>
   *
   * Response:
   * [
   *   {
   *     "id": "uuid",
   *     "consentType": "MARKETING_EMAIL",
   *     "agreed": true,
   *     "agreedAt": "2025-01-01T00:00:00Z",
   *     "document": { "version": "1.0.0", "title": "Marketing Policy" }
   *   }
   * ]
   * ```
   */
  @Get('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user consents',
    description: 'Returns all active (non-withdrawn) consents for authenticated user.',
  })
  @ApiResponse({ status: 200, type: [UserConsentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserConsents(@CurrentUser() user: { id: string }) {
    return this.legalService.getUserConsents(user.id);
  }

  /**
   * Create user consents
   *
   * Records consent decisions during registration or settings update.
   * Captures audit trail including IP address and user agent.
   * Requires authentication.
   *
   * @param user - Authenticated user from JWT
   * @param dto - Consent submissions array
   * @param req - Express request for IP/user agent extraction
   * @returns Array of created consent records
   *
   * @example
   * ```
   * POST /legal/consents
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * {
   *   "consents": [
   *     { "type": "TERMS_OF_SERVICE", "agreed": true, "documentId": "uuid" },
   *     { "type": "PRIVACY_POLICY", "agreed": true, "documentId": "uuid" },
   *     { "type": "MARKETING_EMAIL", "agreed": false }
   *   ]
   * }
   * ```
   */
  @Post('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create user consents',
    description: 'Records consent decisions with audit trail (IP, user agent, document version).',
  })
  @ApiResponse({ status: 201, type: [UserConsentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConsents(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConsentsDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractAuditInfo(req);
    return this.legalService.createConsents(user.id, dto.consents, ipAddress, userAgent);
  }

  /**
   * Update a specific consent (agree or withdraw)
   *
   * Allows users to withdraw optional consents or re-consent.
   * Required consents (TERMS_OF_SERVICE, PRIVACY_POLICY) cannot be withdrawn.
   * Uses locale to determine region-specific consent requirements.
   * Requires authentication.
   *
   * @param user - Authenticated user from JWT
   * @param type - Consent type to update
   * @param locale - User's locale for region policy lookup
   * @param dto - New consent status
   * @param req - Express request for IP/user agent extraction
   * @returns Updated consent record
   *
   * @example
   * ```
   * PUT /legal/consents/MARKETING_EMAIL?locale=ko
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * { "agreed": false }
   * ```
   */
  @Put('consents/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update consent (agree or withdraw)',
    description: 'Update optional consent. Required consents cannot be withdrawn.',
  })
  @ApiParam({ name: 'type', enum: ConsentType, description: 'Consent type to update' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'User locale for region policy lookup (ko, en, ja)',
    example: 'ko',
  })
  @ApiResponse({ status: 200, type: UserConsentResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot withdraw required consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConsent(
    @CurrentUser() user: { id: string },
    @Param('type', new ParseEnumPipe(ConsentType)) type: ConsentType,
    @Query('locale') locale: string | undefined,
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractAuditInfo(req);
    return this.legalService.updateConsent(
      user.id,
      type,
      dto.agreed,
      locale || 'ko',
      ipAddress,
      userAgent,
    );
  }

  /**
   * Check if user has all required consents
   *
   * Validates that user has agreed to mandatory consents.
   * Uses locale to determine region-specific required consents.
   * Useful for middleware or access control checks.
   * Requires authentication.
   *
   * @param user - Authenticated user from JWT
   * @param locale - User's locale for region policy lookup
   * @returns Object with hasAllRequired boolean
   *
   * @example
   * ```
   * GET /legal/consents/check?locale=ko
   * Authorization: Bearer <token>
   *
   * Response:
   * { "hasAllRequired": true }
   * ```
   */
  @Get('consents/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if user has all required consents',
    description: 'Validates mandatory consents based on region (Terms of Service, Privacy Policy).',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'User locale for region policy lookup (ko, en, ja)',
    example: 'ko',
  })
  @ApiResponse({ status: 200, schema: { properties: { hasAllRequired: { type: 'boolean' } } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkRequiredConsents(
    @CurrentUser() user: { id: string },
    @Query('locale') locale?: string,
  ) {
    const hasAllRequired = await this.legalService.hasRequiredConsents(user.id, locale || 'ko');
    return { hasAllRequired };
  }
}
