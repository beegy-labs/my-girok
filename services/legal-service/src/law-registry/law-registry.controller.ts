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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LawRegistryService } from './law-registry.service';
import { CreateLawRegistryDto, UpdateLawRegistryDto, LawRegistryResponseDto } from './dto';

@ApiTags('law-registry')
@ApiBearerAuth()
@Controller('law-registry')
export class LawRegistryController {
  constructor(private readonly lawRegistryService: LawRegistryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new law registry entry' })
  @ApiResponse({ status: 201, description: 'Law registry created', type: LawRegistryResponseDto })
  async create(@Body() dto: CreateLawRegistryDto): Promise<LawRegistryResponseDto> {
    return this.lawRegistryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List law registry entries' })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of law registries',
    type: [LawRegistryResponseDto],
  })
  async findAll(
    @Query('countryCode') countryCode?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<LawRegistryResponseDto[]> {
    return this.lawRegistryService.findAll({ countryCode, isActive });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get law registry by ID' })
  @ApiParam({ name: 'id', description: 'Law registry UUID' })
  @ApiResponse({ status: 200, description: 'Law registry details', type: LawRegistryResponseDto })
  async findOne(@Param('id') id: string): Promise<LawRegistryResponseDto> {
    return this.lawRegistryService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get law registry by code' })
  @ApiParam({ name: 'code', description: 'Law code (e.g., GDPR, CCPA)' })
  @ApiResponse({ status: 200, description: 'Law registry details', type: LawRegistryResponseDto })
  async findByCode(@Param('code') code: string): Promise<LawRegistryResponseDto> {
    return this.lawRegistryService.findByCode(code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update law registry' })
  @ApiParam({ name: 'id', description: 'Law registry UUID' })
  @ApiResponse({ status: 200, description: 'Law registry updated', type: LawRegistryResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLawRegistryDto,
  ): Promise<LawRegistryResponseDto> {
    return this.lawRegistryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete law registry (soft delete)' })
  @ApiParam({ name: 'id', description: 'Law registry UUID' })
  @ApiResponse({ status: 204, description: 'Law registry deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.lawRegistryService.remove(id);
  }
}
