import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LawRegistryService } from './law-registry.service';
import {
  CreateLawDto,
  UpdateLawDto,
  LawQueryDto,
  LawResponseDto,
  LawListResponseDto,
  ConsentRequirementResponseDto,
} from './dto/law-registry.dto';

/**
 * Law Registry Controller
 *
 * Manages country-specific legal requirements including:
 * - Law CRUD operations
 * - Consent requirements lookup
 * - Default law seeding
 */
@ApiTags('Law Registry')
@Controller('legal/laws')
export class LawRegistryController {
  constructor(private readonly lawRegistryService: LawRegistryService) {}

  /**
   * List all laws
   */
  @Get()
  @ApiOperation({
    summary: 'List all laws',
    description: 'List all law registry entries with optional filters and pagination',
  })
  @ApiQuery({ name: 'countryCode', required: false, example: 'KR' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: LawListResponseDto })
  async findAll(@Query() query: LawQueryDto): Promise<LawListResponseDto> {
    return this.lawRegistryService.findAll(query);
  }

  /**
   * Get law by code
   */
  @Get('code/:code')
  @ApiOperation({
    summary: 'Get law by code',
    description: 'Retrieve a specific law by its code (e.g., PIPA, GDPR)',
  })
  @ApiParam({ name: 'code', example: 'PIPA' })
  @ApiResponse({ status: 200, type: LawResponseDto })
  @ApiResponse({ status: 404, description: 'Law not found' })
  async findByCode(@Param('code') code: string): Promise<LawResponseDto> {
    return this.lawRegistryService.findByCode(code);
  }

  /**
   * Get laws by country
   */
  @Get('country/:countryCode')
  @ApiOperation({
    summary: 'Get laws by country',
    description: 'Retrieve all active laws for a specific country',
  })
  @ApiParam({ name: 'countryCode', example: 'KR' })
  @ApiResponse({ status: 200, type: [LawResponseDto] })
  async findByCountry(@Param('countryCode') countryCode: string): Promise<LawResponseDto[]> {
    return this.lawRegistryService.findByCountry(countryCode);
  }

  /**
   * Create a new law
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create law',
    description: 'Create a new law registry entry',
  })
  @ApiResponse({ status: 201, type: LawResponseDto })
  @ApiResponse({ status: 409, description: 'Law code already exists' })
  async create(@Body() dto: CreateLawDto): Promise<LawResponseDto> {
    return this.lawRegistryService.create(dto);
  }

  /**
   * Update a law
   */
  @Patch(':code')
  @ApiOperation({
    summary: 'Update law',
    description: 'Update an existing law registry entry',
  })
  @ApiParam({ name: 'code', example: 'PIPA' })
  @ApiResponse({ status: 200, type: LawResponseDto })
  @ApiResponse({ status: 404, description: 'Law not found' })
  async update(@Param('code') code: string, @Body() dto: UpdateLawDto): Promise<LawResponseDto> {
    return this.lawRegistryService.update(code, dto);
  }

  /**
   * Deactivate a law
   */
  @Patch(':code/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate law',
    description: 'Deactivate a law (soft delete)',
  })
  @ApiParam({ name: 'code', example: 'PIPA' })
  @ApiResponse({ status: 204, description: 'Law deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Law not found' })
  async deactivate(@Param('code') code: string): Promise<void> {
    return this.lawRegistryService.deactivate(code);
  }

  /**
   * Delete a law
   */
  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete law',
    description: 'Permanently delete a law registry entry',
  })
  @ApiParam({ name: 'code', example: 'PIPA' })
  @ApiResponse({ status: 204, description: 'Law deleted successfully' })
  @ApiResponse({ status: 404, description: 'Law not found' })
  async delete(@Param('code') code: string): Promise<void> {
    return this.lawRegistryService.delete(code);
  }

  /**
   * Get consent requirements for a law
   */
  @Get(':code/consent-requirements')
  @ApiOperation({
    summary: 'Get consent requirements',
    description: 'Get all consent requirements defined by a specific law',
  })
  @ApiParam({ name: 'code', example: 'PIPA' })
  @ApiResponse({ status: 200, type: [ConsentRequirementResponseDto] })
  @ApiResponse({ status: 404, description: 'Law not found' })
  async getConsentRequirements(
    @Param('code') code: string,
  ): Promise<ConsentRequirementResponseDto[]> {
    return this.lawRegistryService.getConsentRequirements(code);
  }

  /**
   * Get consent requirements for a country
   */
  @Get('country/:countryCode/consent-requirements')
  @ApiOperation({
    summary: 'Get country consent requirements',
    description: 'Get all consent requirements for a country based on its laws',
  })
  @ApiParam({ name: 'countryCode', example: 'KR' })
  @ApiResponse({ status: 200, type: [ConsentRequirementResponseDto] })
  async getCountryConsentRequirements(
    @Param('countryCode') countryCode: string,
  ): Promise<ConsentRequirementResponseDto[]> {
    return this.lawRegistryService.getCountryConsentRequirements(countryCode);
  }

  /**
   * Seed default laws
   */
  @Post('seed')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Seed default laws',
    description: 'Seed default laws (PIPA, GDPR, APPI, CCPA)',
  })
  @ApiResponse({ status: 204, description: 'Default laws seeded successfully' })
  async seedDefaultLaws(): Promise<void> {
    return this.lawRegistryService.seedDefaultLaws();
  }
}
