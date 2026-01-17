import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, AdminId } from '@my-girok/nest-common';
import { LeaveService } from '../services/leave.service';
import {
  CreateLeaveDto,
  SubmitLeaveDto,
  ApproveLeaveDto,
  CancelLeaveDto,
  LeaveQueryDto,
  LeaveResponseDto,
} from '../dto/leave.dto';

@ApiTags('Leave Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Create a leave request (draft)' })
  create(@AdminId() adminId: string, @Body() dto: CreateLeaveDto): Promise<LeaveResponseDto> {
    return this.leaveService.create(adminId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a leave request for approval' })
  submit(
    @AdminId() adminId: string,
    @Param('id') id: string,
    @Body() dto: SubmitLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.leaveService.submit(id, adminId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve or reject a leave request (manager)' })
  approve(
    @AdminId() approverId: string,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.leaveService.approve(id, approverId, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a leave request' })
  cancel(
    @AdminId() adminId: string,
    @Param('id') id: string,
    @Body() dto: CancelLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.leaveService.cancel(id, adminId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my leave requests' })
  getMyLeaves(
    @AdminId() adminId: string,
    @Query() query: LeaveQueryDto,
  ): Promise<{ data: LeaveResponseDto[]; total: number }> {
    return this.leaveService.list({ ...query, adminId });
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get pending leave approvals for me (manager)' })
  getPendingApprovals(@AdminId() approverId: string): Promise<LeaveResponseDto[]> {
    return this.leaveService.getPendingApprovals(approverId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a leave request by ID' })
  findOne(@Param('id') id: string): Promise<LeaveResponseDto> {
    return this.leaveService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all leave requests (admin/HR)' })
  list(@Query() query: LeaveQueryDto): Promise<{ data: LeaveResponseDto[]; total: number }> {
    return this.leaveService.list(query);
  }
}
