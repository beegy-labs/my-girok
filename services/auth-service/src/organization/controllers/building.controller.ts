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
import { BuildingService } from '../services/building.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
  BuildingListQueryDto,
} from '../dto/building.dto';

@ApiTags('Organization - Buildings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organization/buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new building' })
  @ApiResponse({
    status: 201,
    description: 'Building created successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Building code already exists' })
  @ApiResponse({ status: 404, description: 'Office not found' })
  create(@Body() dto: CreateBuildingDto): Promise<BuildingResponseDto> {
    return this.buildingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all buildings' })
  @ApiQuery({ name: 'officeId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of buildings',
    type: [BuildingResponseDto],
  })
  findAll(@Query() query: BuildingListQueryDto): Promise<BuildingResponseDto[]> {
    return this.buildingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a building by ID' })
  @ApiResponse({
    status: 200,
    description: 'Building details',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Building not found' })
  findOne(@Param('id') id: string): Promise<BuildingResponseDto> {
    return this.buildingService.findOne(id);
  }

  @Get(':id/floors')
  @ApiOperation({
    summary: 'Get floors for a building',
    description: 'Returns all active floors in this building',
  })
  @ApiResponse({
    status: 200,
    description: 'List of floors',
  })
  @ApiResponse({ status: 404, description: 'Building not found' })
  findFloors(@Param('id') id: string): Promise<any[]> {
    return this.buildingService.findFloors(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a building' })
  @ApiResponse({
    status: 200,
    description: 'Building updated successfully',
    type: BuildingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Building not found' })
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto): Promise<BuildingResponseDto> {
    return this.buildingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a building' })
  @ApiResponse({ status: 204, description: 'Building deleted successfully' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.buildingService.remove(id);
  }
}
