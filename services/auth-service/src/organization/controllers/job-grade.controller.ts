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
import { JobGradeService } from '../services/job-grade.service';
import {
  CreateJobGradeDto,
  UpdateJobGradeDto,
  JobGradeResponseDto,
  JobGradeListQueryDto,
} from '../dto/job-grade.dto';

@ApiTags('Organization - Job Grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organization/job-grades')
export class JobGradeController {
  constructor(private readonly jobGradeService: JobGradeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job grade' })
  @ApiResponse({
    status: 201,
    description: 'Job grade created successfully',
    type: JobGradeResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Job grade code already exists' })
  create(@Body() dto: CreateJobGradeDto): Promise<JobGradeResponseDto> {
    return this.jobGradeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job grades' })
  @ApiQuery({
    name: 'jobFamily',
    required: false,
    enum: [
      'ENGINEERING',
      'PRODUCT',
      'DESIGN',
      'MARKETING',
      'SALES',
      'SUPPORT',
      'OPERATIONS',
      'FINANCE',
      'HR',
      'LEGAL',
      'EXECUTIVE',
    ],
  })
  @ApiQuery({ name: 'track', required: false, example: 'IC' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of job grades',
    type: [JobGradeResponseDto],
  })
  findAll(@Query() query: JobGradeListQueryDto): Promise<JobGradeResponseDto[]> {
    return this.jobGradeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job grade by ID' })
  @ApiResponse({
    status: 200,
    description: 'Job grade details',
    type: JobGradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job grade not found' })
  findOne(@Param('id') id: string): Promise<JobGradeResponseDto> {
    return this.jobGradeService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a job grade by code' })
  @ApiResponse({
    status: 200,
    description: 'Job grade details',
    type: JobGradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job grade not found' })
  findByCode(@Param('code') code: string): Promise<JobGradeResponseDto> {
    return this.jobGradeService.findByCode(code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job grade' })
  @ApiResponse({
    status: 200,
    description: 'Job grade updated successfully',
    type: JobGradeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job grade not found' })
  update(@Param('id') id: string, @Body() dto: UpdateJobGradeDto): Promise<JobGradeResponseDto> {
    return this.jobGradeService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job grade' })
  @ApiResponse({ status: 204, description: 'Job grade deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job grade not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.jobGradeService.remove(id);
  }
}
