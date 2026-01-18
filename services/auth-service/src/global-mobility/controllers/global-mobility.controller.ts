import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@my-girok/nest-common';
import { GlobalAssignmentService } from '../services/global-assignment.service';
import { WorkAuthorizationService } from '../services/work-authorization.service';
import {
  CreateGlobalAssignmentDto,
  UpdateGlobalAssignmentDto,
  ApproveGlobalAssignmentDto,
  GlobalAssignmentQueryDto,
  GlobalAssignmentResponseDto,
} from '../dto/global-assignment.dto';
import {
  CreateWorkAuthorizationDto,
  UpdateWorkAuthorizationDto,
  WorkAuthorizationQueryDto,
  WorkAuthorizationResponseDto,
} from '../dto/work-authorization.dto';

@ApiTags('Global Mobility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('global-mobility')
export class GlobalMobilityController {
  constructor(
    private readonly globalAssignmentService: GlobalAssignmentService,
    private readonly workAuthorizationService: WorkAuthorizationService,
  ) {}

  // Global Assignment endpoints
  @Post('assignments')
  @ApiOperation({ summary: 'Create a new global assignment' })
  createAssignment(@Body() dto: CreateGlobalAssignmentDto): Promise<GlobalAssignmentResponseDto> {
    return this.globalAssignmentService.create(dto);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'List all global assignments (with filters)' })
  findAllAssignments(
    @Query() query: GlobalAssignmentQueryDto,
  ): Promise<{ data: GlobalAssignmentResponseDto[]; total: number }> {
    return this.globalAssignmentService.findAll(query);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Get global assignment by ID' })
  findAssignmentById(@Param('id') id: string): Promise<GlobalAssignmentResponseDto> {
    return this.globalAssignmentService.findById(id);
  }

  @Patch('assignments/:id')
  @ApiOperation({ summary: 'Update global assignment' })
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateGlobalAssignmentDto,
  ): Promise<GlobalAssignmentResponseDto> {
    return this.globalAssignmentService.update(id, dto);
  }

  @Post('assignments/:id/approve')
  @ApiOperation({ summary: 'Approve global assignment' })
  approveAssignment(
    @Param('id') id: string,
    @Body() dto: ApproveGlobalAssignmentDto,
  ): Promise<GlobalAssignmentResponseDto> {
    return this.globalAssignmentService.approve(id, dto);
  }

  @Delete('assignments/:id')
  @ApiOperation({ summary: 'Delete global assignment' })
  deleteAssignment(@Param('id') id: string): Promise<void> {
    return this.globalAssignmentService.delete(id);
  }

  // Work Authorization endpoints
  @Post('work-authorizations')
  @ApiOperation({ summary: 'Create a new work authorization' })
  createWorkAuthorization(
    @Body() dto: CreateWorkAuthorizationDto,
  ): Promise<WorkAuthorizationResponseDto> {
    return this.workAuthorizationService.create(dto);
  }

  @Get('work-authorizations')
  @ApiOperation({ summary: 'List all work authorizations (with filters)' })
  findAllWorkAuthorizations(
    @Query() query: WorkAuthorizationQueryDto,
  ): Promise<{ data: WorkAuthorizationResponseDto[]; total: number }> {
    return this.workAuthorizationService.findAll(query);
  }

  @Get('work-authorizations/:id')
  @ApiOperation({ summary: 'Get work authorization by ID' })
  findWorkAuthorizationById(@Param('id') id: string): Promise<WorkAuthorizationResponseDto> {
    return this.workAuthorizationService.findById(id);
  }

  @Patch('work-authorizations/:id')
  @ApiOperation({ summary: 'Update work authorization' })
  updateWorkAuthorization(
    @Param('id') id: string,
    @Body() dto: UpdateWorkAuthorizationDto,
  ): Promise<WorkAuthorizationResponseDto> {
    return this.workAuthorizationService.update(id, dto);
  }

  @Delete('work-authorizations/:id')
  @ApiOperation({ summary: 'Delete work authorization' })
  deleteWorkAuthorization(@Param('id') id: string): Promise<void> {
    return this.workAuthorizationService.delete(id);
  }
}
