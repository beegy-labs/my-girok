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
import { OrgUnitService } from '../services/org-unit.service';
import {
  CreateOrgUnitDto,
  UpdateOrgUnitDto,
  OrgUnitResponseDto,
  OrgUnitTreeNodeDto,
  OrgUnitListQueryDto,
} from '../dto/org-unit.dto';

@ApiTags('Organization - Organization Units')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('organization/org-units')
export class OrgUnitController {
  constructor(private readonly orgUnitService: OrgUnitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization unit' })
  @ApiResponse({
    status: 201,
    description: 'Organization unit created successfully',
    type: OrgUnitResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Organization unit code already exists' })
  @ApiResponse({ status: 404, description: 'Parent organization unit not found' })
  create(@Body() dto: CreateOrgUnitDto): Promise<OrgUnitResponseDto> {
    return this.orgUnitService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organization units' })
  @ApiQuery({
    name: 'orgType',
    required: false,
    enum: ['COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'SQUAD', 'TRIBE', 'CHAPTER', 'GUILD'],
  })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of organization units',
    type: [OrgUnitResponseDto],
  })
  findAll(@Query() query: OrgUnitListQueryDto): Promise<OrgUnitResponseDto[]> {
    return this.orgUnitService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({
    summary: 'Get organization tree structure',
    description: 'Returns hierarchical tree of all active organization units',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization tree structure',
    type: [OrgUnitTreeNodeDto],
  })
  findTree(): Promise<OrgUnitTreeNodeDto[]> {
    return this.orgUnitService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization unit by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization unit details',
    type: OrgUnitResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found' })
  findOne(@Param('id') id: string): Promise<OrgUnitResponseDto> {
    return this.orgUnitService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({
    summary: 'Get child organization units',
    description: 'Returns direct children of the specified organization unit',
  })
  @ApiResponse({
    status: 200,
    description: 'List of child organization units',
    type: [OrgUnitResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found' })
  findChildren(@Param('id') id: string): Promise<OrgUnitResponseDto[]> {
    return this.orgUnitService.findChildren(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization unit' })
  @ApiResponse({
    status: 200,
    description: 'Organization unit updated successfully',
    type: OrgUnitResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid parent reference (circular or self-reference)',
  })
  update(@Param('id') id: string, @Body() dto: UpdateOrgUnitDto): Promise<OrgUnitResponseDto> {
    return this.orgUnitService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an organization unit' })
  @ApiResponse({ status: 204, description: 'Organization unit deleted successfully' })
  @ApiResponse({ status: 404, description: 'Organization unit not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete organization unit with children' })
  remove(@Param('id') id: string): Promise<void> {
    return this.orgUnitService.remove(id);
  }
}
