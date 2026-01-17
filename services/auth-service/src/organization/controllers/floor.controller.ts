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
import { FloorService } from '../services/floor.service';
import {
  CreateFloorDto,
  UpdateFloorDto,
  FloorResponseDto,
  FloorListQueryDto,
} from '../dto/floor.dto';

@ApiTags('Organization - Floors')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('organization/floors')
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new floor' })
  @ApiResponse({
    status: 201,
    description: 'Floor created successfully',
    type: FloorResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Floor code already exists' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  create(@Body() dto: CreateFloorDto): Promise<FloorResponseDto> {
    return this.floorService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all floors' })
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of floors',
    type: [FloorResponseDto],
  })
  findAll(@Query() query: FloorListQueryDto): Promise<FloorResponseDto[]> {
    return this.floorService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a floor by ID' })
  @ApiResponse({
    status: 200,
    description: 'Floor details',
    type: FloorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Floor not found' })
  findOne(@Param('id') id: string): Promise<FloorResponseDto> {
    return this.floorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a floor' })
  @ApiResponse({
    status: 200,
    description: 'Floor updated successfully',
    type: FloorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Floor not found' })
  update(@Param('id') id: string, @Body() dto: UpdateFloorDto): Promise<FloorResponseDto> {
    return this.floorService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a floor' })
  @ApiResponse({ status: 204, description: 'Floor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Floor not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.floorService.remove(id);
  }
}
