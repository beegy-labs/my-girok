import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminId } from '../../common/decorators/admin-id.decorator';
import { WorkScheduleService } from '../services/work-schedule.service';
import {
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
  WorkScheduleResponseDto,
} from '../dto/work-schedule.dto';

@ApiTags('Work Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('work-schedules')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a work schedule' })
  create(@Body() dto: CreateWorkScheduleDto): Promise<WorkScheduleResponseDto> {
    return this.workScheduleService.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my work schedules' })
  getMySchedules(@AdminId() adminId: string): Promise<WorkScheduleResponseDto[]> {
    return this.workScheduleService.findByAdmin(adminId);
  }

  @Get('me/active')
  @ApiOperation({ summary: 'Get my active work schedule' })
  getMyActiveSchedule(@AdminId() adminId: string): Promise<WorkScheduleResponseDto | null> {
    return this.workScheduleService.findActiveByAdmin(adminId);
  }

  @Get('admin/:adminId')
  @ApiOperation({ summary: 'Get admin work schedules' })
  getAdminSchedules(@Param('adminId') adminId: string): Promise<WorkScheduleResponseDto[]> {
    return this.workScheduleService.findByAdmin(adminId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work schedule by ID' })
  findOne(@Param('id') id: string): Promise<WorkScheduleResponseDto> {
    return this.workScheduleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a work schedule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkScheduleDto,
  ): Promise<WorkScheduleResponseDto> {
    return this.workScheduleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a work schedule' })
  remove(@Param('id') id: string): Promise<void> {
    return this.workScheduleService.remove(id);
  }
}
