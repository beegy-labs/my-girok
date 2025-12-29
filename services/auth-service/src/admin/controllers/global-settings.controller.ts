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
import { GlobalSettingsService } from '../services/global-settings.service';
import {
  CreateSupportedCountryDto,
  UpdateSupportedCountryDto,
  SupportedCountryResponse,
  SupportedCountryListResponse,
  CreateSupportedLocaleDto,
  UpdateSupportedLocaleDto,
  SupportedLocaleResponse,
  SupportedLocaleListResponse,
} from '../dto/global-settings.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';

@Controller('admin/settings')
@UseGuards(PermissionGuard)
export class GlobalSettingsController {
  constructor(private readonly globalSettingsService: GlobalSettingsService) {}

  // ============================================================
  // SUPPORTED COUNTRIES
  // ============================================================

  /**
   * List all supported countries
   * GET /v1/admin/settings/countries
   */
  @Get('countries')
  @Permissions('settings:read')
  async listCountries(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<SupportedCountryListResponse> {
    return this.globalSettingsService.listCountries(activeOnly === 'true');
  }

  /**
   * Get a specific country
   * GET /v1/admin/settings/countries/:code
   */
  @Get('countries/:code')
  @Permissions('settings:read')
  async getCountry(@Param('code') code: string): Promise<SupportedCountryResponse> {
    return this.globalSettingsService.getCountry(code.toUpperCase());
  }

  /**
   * Create a new country
   * POST /v1/admin/settings/countries
   */
  @Post('countries')
  @Permissions('settings:update')
  @HttpCode(HttpStatus.CREATED)
  async createCountry(@Body() dto: CreateSupportedCountryDto): Promise<SupportedCountryResponse> {
    return this.globalSettingsService.createCountry(dto);
  }

  /**
   * Update a country
   * PATCH /v1/admin/settings/countries/:code
   */
  @Patch('countries/:code')
  @Permissions('settings:update')
  async updateCountry(
    @Param('code') code: string,
    @Body() dto: UpdateSupportedCountryDto,
  ): Promise<SupportedCountryResponse> {
    return this.globalSettingsService.updateCountry(code.toUpperCase(), dto);
  }

  /**
   * Delete a country
   * DELETE /v1/admin/settings/countries/:code
   */
  @Delete('countries/:code')
  @Permissions('settings:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCountry(@Param('code') code: string): Promise<void> {
    return this.globalSettingsService.deleteCountry(code.toUpperCase());
  }

  // ============================================================
  // SUPPORTED LOCALES
  // ============================================================

  /**
   * List all supported locales
   * GET /v1/admin/settings/locales
   */
  @Get('locales')
  @Permissions('settings:read')
  async listLocales(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<SupportedLocaleListResponse> {
    return this.globalSettingsService.listLocales(activeOnly === 'true');
  }

  /**
   * Get a specific locale
   * GET /v1/admin/settings/locales/:code
   */
  @Get('locales/:code')
  @Permissions('settings:read')
  async getLocale(@Param('code') code: string): Promise<SupportedLocaleResponse> {
    return this.globalSettingsService.getLocale(code.toLowerCase());
  }

  /**
   * Create a new locale
   * POST /v1/admin/settings/locales
   */
  @Post('locales')
  @Permissions('settings:update')
  @HttpCode(HttpStatus.CREATED)
  async createLocale(@Body() dto: CreateSupportedLocaleDto): Promise<SupportedLocaleResponse> {
    return this.globalSettingsService.createLocale(dto);
  }

  /**
   * Update a locale
   * PATCH /v1/admin/settings/locales/:code
   */
  @Patch('locales/:code')
  @Permissions('settings:update')
  async updateLocale(
    @Param('code') code: string,
    @Body() dto: UpdateSupportedLocaleDto,
  ): Promise<SupportedLocaleResponse> {
    return this.globalSettingsService.updateLocale(code.toLowerCase(), dto);
  }

  /**
   * Delete a locale
   * DELETE /v1/admin/settings/locales/:code
   */
  @Delete('locales/:code')
  @Permissions('settings:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocale(@Param('code') code: string): Promise<void> {
    return this.globalSettingsService.deleteLocale(code.toLowerCase());
  }
}
