import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@my-girok/nest-common';
import { OrganizationHistoryService } from '../services/organization-history.service';
import {
  CreateOrganizationHistoryDto,
  ApproveOrganizationHistoryDto,
  OrganizationHistoryQueryDto,
  OrganizationHistoryResponseDto,
} from '../dto/organization-history.dto';

@ApiTags('Organization History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organization-history')
export class OrganizationHistoryController {
  constructor(private readonly organizationHistoryService: OrganizationHistoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization history record' })
  create(@Body() dto: CreateOrganizationHistoryDto): Promise<OrganizationHistoryResponseDto> {
    return this.organizationHistoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organization history records (with filters)' })
  findAll(
    @Query() query: OrganizationHistoryQueryDto,
  ): Promise<{ data: OrganizationHistoryResponseDto[]; total: number }> {
    return this.organizationHistoryService.findAll(query);
  }

  @Get('admin/:adminId')
  @ApiOperation({ summary: 'Get organization history for a specific admin' })
  getAdminHistory(@Param('adminId') adminId: string): Promise<OrganizationHistoryResponseDto[]> {
    return this.organizationHistoryService.getAdminHistory(adminId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization history record by ID' })
  findById(@Param('id') id: string): Promise<OrganizationHistoryResponseDto> {
    return this.organizationHistoryService.findById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve organization history record' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveOrganizationHistoryDto,
  ): Promise<OrganizationHistoryResponseDto> {
    return this.organizationHistoryService.approve(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization history record' })
  delete(@Param('id') id: string): Promise<void> {
    return this.organizationHistoryService.delete(id);
  }
}
