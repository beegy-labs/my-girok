import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OfficeService } from '../services/office.service';
import {
  CreateOfficeDto,
  UpdateOfficeDto,
  OfficeResponseDto,
  OfficeListQueryDto,
} from '../dto/office.dto';

@ApiTags('Organization - Offices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organization/offices')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new office' })
  @ApiResponse({
    status: 201,
    description: 'Office created successfully',
    type: OfficeResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Office code already exists' })
  @ApiResponse({ status: 404, description: 'Legal entity not found' })
  create(@Body() dto: CreateOfficeDto): Promise<OfficeResponseDto> {
    return this.officeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all offices' })
  @ApiQuery({
    name: 'officeType',
    required: false,
    enum: ['HEADQUARTERS', 'BRANCH', 'SATELLITE', 'REMOTE', 'COWORKING'],
  })
  @ApiQuery({ name: 'legalEntityId', required: false })
  @ApiQuery({ name: 'countryCode', required: false, example: 'KR' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of offices',
    type: [OfficeResponseDto],
  })
  findAll(@Query() query: OfficeListQueryDto): Promise<OfficeResponseDto[]> {
    return this.officeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an office by ID' })
  @ApiResponse({
    status: 200,
    description: 'Office details',
    type: OfficeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Office not found' })
  findOne(@Param('id') id: string): Promise<OfficeResponseDto> {
    return this.officeService.findOne(id);
  }

  @Get(':id/buildings')
  @ApiOperation({
    summary: 'Get buildings for an office',
    description: 'Returns all active buildings belonging to this office',
  })
  @ApiResponse({
    status: 200,
    description: 'List of buildings',
  })
  @ApiResponse({ status: 404, description: 'Office not found' })
  findBuildings(@Param('id') id: string): Promise<any[]> {
    return this.officeService.findBuildings(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an office' })
  @ApiResponse({
    status: 200,
    description: 'Office updated successfully',
    type: OfficeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Office not found' })
  update(@Param('id') id: string, @Body() dto: UpdateOfficeDto): Promise<OfficeResponseDto> {
    return this.officeService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an office' })
  @ApiResponse({ status: 204, description: 'Office deleted successfully' })
  @ApiResponse({ status: 404, description: 'Office not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.officeService.remove(id);
  }
}
