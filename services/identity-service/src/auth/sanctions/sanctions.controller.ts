import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { SanctionsService } from './sanctions.service';
import { CreateSanctionDto, SanctionSubjectType } from './dto/create-sanction.dto';
import {
  UpdateSanctionDto,
  RevokeSanctionDto,
  ExtendSanctionDto,
  ReduceSanctionDto,
  SubmitAppealDto,
  ReviewAppealDto,
  QuerySanctionDto,
} from './dto/update-sanction.dto';
import {
  SanctionEntity,
  SanctionListResponse,
  ActiveSanctionsResult,
} from './entities/sanction.entity';

/**
 * Sanctions Controller
 *
 * REST API endpoints for sanction management
 */
@ApiTags('Sanctions')
@Controller('sanctions')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
export class SanctionsController {
  constructor(private readonly sanctionsService: SanctionsService) {}

  /**
   * Create a new sanction
   */
  @Post()
  @ApiOperation({ summary: 'Create a new sanction' })
  @ApiResponse({
    status: 201,
    description: 'Sanction created successfully',
    type: SanctionEntity,
  })
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator/Issuer ID from auth context',
    required: true,
  })
  async create(
    @Body() dto: CreateSanctionDto,
    @Headers('x-operator-id') issuedBy: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.create(dto, issuedBy);
  }

  /**
   * List sanctions with filters
   */
  @Get()
  @ApiOperation({ summary: 'List sanctions with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of sanctions',
    type: SanctionListResponse,
  })
  async findAll(@Query() query: QuerySanctionDto): Promise<SanctionListResponse> {
    return this.sanctionsService.findAll(query);
  }

  /**
   * Get active sanctions for a subject
   */
  @Get('active/:subjectType/:subjectId')
  @ApiOperation({ summary: 'Get active sanctions for a subject' })
  @ApiParam({ name: 'subjectType', enum: SanctionSubjectType })
  @ApiParam({ name: 'subjectId', type: 'string' })
  @ApiQuery({ name: 'serviceId', required: false, type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Active sanctions result',
    type: ActiveSanctionsResult,
  })
  async getActiveSanctions(
    @Param('subjectType') subjectType: SanctionSubjectType,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Query('serviceId') serviceId?: string,
  ): Promise<ActiveSanctionsResult> {
    return this.sanctionsService.getActiveSanctions(subjectId, subjectType, serviceId);
  }

  /**
   * Check if a subject is sanctioned
   */
  @Get('check/:subjectType/:subjectId')
  @ApiOperation({ summary: 'Check if a subject is currently sanctioned' })
  @ApiParam({ name: 'subjectType', enum: SanctionSubjectType })
  @ApiParam({ name: 'subjectId', type: 'string' })
  @ApiQuery({ name: 'serviceId', required: false, type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Sanction check result',
    schema: { type: 'object', properties: { isSanctioned: { type: 'boolean' } } },
  })
  async checkSanctioned(
    @Param('subjectType') subjectType: SanctionSubjectType,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Query('serviceId') serviceId?: string,
  ): Promise<{ isSanctioned: boolean }> {
    const isSanctioned = await this.sanctionsService.isSanctioned(
      subjectId,
      subjectType,
      serviceId,
    );
    return { isSanctioned };
  }

  /**
   * Get sanction by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get sanction by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Sanction details',
    type: SanctionEntity,
  })
  @ApiResponse({ status: 404, description: 'Sanction not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<SanctionEntity> {
    return this.sanctionsService.findById(id);
  }

  /**
   * Update a sanction
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a sanction' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Sanction updated',
    type: SanctionEntity,
  })
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSanctionDto,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.update(id, dto, operatorId);
  }

  /**
   * Revoke a sanction
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a sanction' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Sanction revoked',
    type: SanctionEntity,
  })
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeSanctionDto,
    @Headers('x-operator-id') revokedBy: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.revoke(id, dto, revokedBy);
  }

  /**
   * Extend a sanction
   */
  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend a sanction' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Sanction extended',
    type: SanctionEntity,
  })
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendSanctionDto,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.extend(id, dto, operatorId);
  }

  /**
   * Reduce a sanction
   */
  @Post(':id/reduce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reduce a sanction' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Sanction reduced',
    type: SanctionEntity,
  })
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async reduce(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReduceSanctionDto,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.reduce(id, dto, operatorId);
  }

  /**
   * Submit an appeal
   */
  @Post(':id/appeal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit an appeal for a sanction' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Appeal submitted',
    type: SanctionEntity,
  })
  @ApiHeader({ name: 'x-subject-id', description: 'Subject ID from auth context', required: true })
  async submitAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAppealDto,
    @Headers('x-subject-id') subjectId: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.submitAppeal(id, dto, subjectId);
  }

  /**
   * Review an appeal
   */
  @Post(':id/appeal/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review an appeal' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Appeal reviewed',
    type: SanctionEntity,
  })
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Reviewer ID from auth context',
    required: true,
  })
  async reviewAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewAppealDto,
    @Headers('x-operator-id') reviewerId: string,
  ): Promise<SanctionEntity> {
    return this.sanctionsService.reviewAppeal(id, dto, reviewerId);
  }

  /**
   * Trigger sanction expiration check (for cron jobs)
   */
  @Post('maintenance/expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expire outdated sanctions' })
  @ApiResponse({
    status: 200,
    description: 'Number of expired sanctions',
    schema: { type: 'object', properties: { expired: { type: 'number' } } },
  })
  async expireSanctions(): Promise<{ expired: number }> {
    const expired = await this.sanctionsService.expireSanctions();
    return { expired };
  }
}
