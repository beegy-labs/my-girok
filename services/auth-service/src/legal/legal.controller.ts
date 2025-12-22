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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  /**
   * Get consent requirements for registration
   * Public endpoint - no auth required
   */
  @Get('consent-requirements')
  @ApiOperation({ summary: 'Get consent requirements for registration' })
  @ApiResponse({ status: 200, description: 'List of consent requirements' })
  async getConsentRequirements(@Query('locale') locale?: string) {
    return this.legalService.getConsentRequirements(locale || 'ko');
  }

  /**
   * Get a specific legal document
   * Public endpoint - no auth required
   */
  @Get('documents/:type')
  @ApiOperation({ summary: 'Get legal document by type' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  async getDocument(
    @Param('type', new ParseEnumPipe(LegalDocumentType)) type: LegalDocumentType,
    @Query() query: GetDocumentQueryDto,
  ) {
    return this.legalService.getDocument(type, query.locale);
  }

  /**
   * Get document by ID
   * Public endpoint - no auth required
   */
  @Get('documents/id/:id')
  @ApiOperation({ summary: 'Get legal document by ID' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  async getDocumentById(@Param('id') id: string) {
    return this.legalService.getDocumentById(id);
  }

  /**
   * Get current user's consents
   */
  @Get('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user consents' })
  @ApiResponse({ status: 200, type: [UserConsentResponseDto] })
  async getUserConsents(@CurrentUser() user: { id: string }) {
    return this.legalService.getUserConsents(user.id);
  }

  /**
   * Create consents (used during registration)
   * This endpoint is typically called by the auth service internally,
   * but can also be used directly if needed
   */
  @Post('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user consents' })
  @ApiResponse({ status: 201, type: [UserConsentResponseDto] })
  async createConsents(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConsentsDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.legalService.createConsents(user.id, dto.consents, ipAddress, userAgent);
  }

  /**
   * Update a specific consent (agree or withdraw)
   */
  @Put('consents/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update consent (agree or withdraw)' })
  @ApiResponse({ status: 200, type: UserConsentResponseDto })
  async updateConsent(
    @CurrentUser() user: { id: string },
    @Param('type', new ParseEnumPipe(ConsentType)) type: ConsentType,
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.legalService.updateConsent(user.id, type, dto.agreed, ipAddress, userAgent);
  }

  /**
   * Check if user has all required consents
   */
  @Get('consents/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has all required consents' })
  @ApiResponse({ status: 200, schema: { properties: { hasAllRequired: { type: 'boolean' } } } })
  async checkRequiredConsents(@CurrentUser() user: { id: string }) {
    const hasAllRequired = await this.legalService.hasRequiredConsents(user.id);
    return { hasAllRequired };
  }
}
