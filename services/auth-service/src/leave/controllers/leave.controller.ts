import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/swagger';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  create(@Req() req: Request, @Body() dto: CreateLeaveDto): Promise<LeaveResponseDto> {
    const adminId = (req.user as any).id;
    return this.leaveService.create(adminId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a leave request for approval' })
  submit(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SubmitLeaveDto,
  ): Promise<LeaveResponseDto> {
    const adminId = (req.user as any).id;
    return this.leaveService.submit(id, adminId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve or reject a leave request (manager)' })
  approve(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ): Promise<LeaveResponseDto> {
    const approverId = (req.user as any).id;
    return this.leaveService.approve(id, approverId, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a leave request' })
  cancel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CancelLeaveDto,
  ): Promise<LeaveResponseDto> {
    const adminId = (req.user as any).id;
    return this.leaveService.cancel(id, adminId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my leave requests' })
  getMyLeaves(
    @Req() req: Request,
    @Query() query: LeaveQueryDto,
  ): Promise<{ data: LeaveResponseDto[]; total: number }> {
    const adminId = (req.user as any).id;
    return this.leaveService.list({ ...query, adminId });
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get pending leave approvals for me (manager)' })
  getPendingApprovals(@Req() req: Request): Promise<LeaveResponseDto[]> {
    const approverId = (req.user as any).id;
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
