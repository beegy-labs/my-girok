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
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard';
import { LegalEntityService } from '../services/legal-entity.service';
import {
  CreateLegalEntityDto,
  UpdateLegalEntityDto,
  LegalEntityResponseDto,
  LegalEntityListQueryDto,
} from '../dto/legal-entity.dto';

@ApiTags('Organization - Legal Entities')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('organization/legal-entities')
export class LegalEntityController {
  constructor(private readonly legalEntityService: LegalEntityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new legal entity' })
  @ApiResponse({
    status: 201,
    description: 'Legal entity created successfully',
    type: LegalEntityResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Legal entity code already exists' })
  create(@Body() dto: CreateLegalEntityDto): Promise<LegalEntityResponseDto> {
    return this.legalEntityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all legal entities' })
  @ApiQuery({ name: 'countryCode', required: false, example: 'KR' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of legal entities',
    type: [LegalEntityResponseDto],
  })
  findAll(@Query() query: LegalEntityListQueryDto): Promise<LegalEntityResponseDto[]> {
    return this.legalEntityService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a legal entity by ID' })
  @ApiResponse({
    status: 200,
    description: 'Legal entity details',
    type: LegalEntityResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Legal entity not found' })
  findOne(@Param('id') id: string): Promise<LegalEntityResponseDto> {
    return this.legalEntityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a legal entity' })
  @ApiResponse({
    status: 200,
    description: 'Legal entity updated successfully',
    type: LegalEntityResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Legal entity not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalEntityDto,
  ): Promise<LegalEntityResponseDto> {
    return this.legalEntityService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a legal entity' })
  @ApiResponse({ status: 204, description: 'Legal entity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Legal entity not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.legalEntityService.remove(id);
  }
}
