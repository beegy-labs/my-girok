import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { LawRegistryService } from '../services/law-registry.service';
import {
  CreateLawDto,
  UpdateLawDto,
  LawQueryDto,
  LawResponse,
  LawListResponse,
  ConsentRequirementResponse,
} from '../dto/law-registry.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';

@Controller('admin/laws')
@UseGuards(PermissionGuard)
export class LawRegistryController {
  constructor(private readonly lawRegistryService: LawRegistryService) {}

  /**
   * List all laws
   * GET /v1/admin/laws
   */
  @Get()
  @Permissions('law:read')
  async findAll(@Query() query: LawQueryDto): Promise<LawListResponse> {
    return this.lawRegistryService.findAll(query);
  }

  /**
   * Get law by code
   * GET /v1/admin/laws/:code
   */
  @Get(':code')
  @Permissions('law:read')
  async findByCode(@Param('code') code: string): Promise<LawResponse> {
    return this.lawRegistryService.findByCode(code);
  }

  /**
   * Register new law
   * POST /v1/admin/laws
   */
  @Post()
  @Permissions('law:create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLawDto): Promise<LawResponse> {
    return this.lawRegistryService.create(dto);
  }

  /**
   * Update law
   * PATCH /v1/admin/laws/:code
   */
  @Patch(':code')
  @Permissions('law:update')
  async update(@Param('code') code: string, @Body() dto: UpdateLawDto): Promise<LawResponse> {
    return this.lawRegistryService.update(code, dto);
  }

  /**
   * Delete law
   * DELETE /v1/admin/laws/:code
   */
  @Delete(':code')
  @Permissions('law:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('code') code: string): Promise<void> {
    return this.lawRegistryService.delete(code);
  }

  /**
   * Get law's consent requirements
   * GET /v1/admin/laws/:code/consent-requirements
   */
  @Get(':code/consent-requirements')
  @Permissions('law:read')
  async getConsentRequirements(@Param('code') code: string): Promise<ConsentRequirementResponse[]> {
    return this.lawRegistryService.getConsentRequirements(code);
  }

  /**
   * Seed default laws
   * POST /v1/admin/laws/seed
   */
  @Post('seed')
  @Permissions('law:create')
  @HttpCode(HttpStatus.NO_CONTENT)
  async seedDefaultLaws(): Promise<void> {
    return this.lawRegistryService.seedDefaultLaws();
  }
}
