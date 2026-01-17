import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { leave_type } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateLeaveDto,
  SubmitLeaveDto,
  ApproveLeaveDto,
  CancelLeaveDto,
  LeaveQueryDto,
  LeaveResponseDto,
} from '../dto/leave.dto';
import { LeaveStatus, LeaveType } from '@my-girok/types';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async create(adminId: string, dto: CreateLeaveDto): Promise<LeaveResponseDto> {
    // Check for overlapping leaves
    const overlapping = await this.prisma.adminLeave.findFirst({
      where: {
        adminId: adminId,
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        },
        OR: [
          {
            startDate: {
              lte: dto.endDate,
            },
            endDate: {
              gte: dto.startDate,
            },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Leave request overlaps with existing leave');
    }

    const leave = await this.prisma.adminLeave.create({
      data: {
        adminId: adminId,
        leaveType: dto.leaveType as leave_type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        startHalf: dto.startHalf,
        endHalf: dto.endHalf,
        daysCount: dto.daysCount,
        status: LeaveStatus.DRAFT,
        reason: dto.reason,
        emergencyContact: dto.emergencyContact,
        handoverTo: dto.handoverTo,
        handoverNotes: dto.handoverNotes,
        attachmentUrls: dto.attachmentUrls,
      },
    });

    return this.mapToResponse(leave);
  }

  async submit(leaveId: string, adminId: string, dto: SubmitLeaveDto): Promise<LeaveResponseDto> {
    const leave = await this.prisma.adminLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException(`Leave request ${leaveId} not found`);
    }

    if (leave.adminId !== adminId) {
      throw new ForbiddenException('You can only submit your own leave requests');
    }

    if (leave.status !== LeaveStatus.DRAFT) {
      throw new BadRequestException('Leave request has already been submitted');
    }

    const updated = await this.prisma.adminLeave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.PENDING,
        submittedAt: new Date(),
        firstApproverId: dto.firstApproverId,
        secondApproverId: dto.secondApproverId,
      },
    });

    return this.mapToResponse(updated);
  }

  async approve(
    leaveId: string,
    approverId: string,
    dto: ApproveLeaveDto,
  ): Promise<LeaveResponseDto> {
    const leave = await this.prisma.adminLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException(`Leave request ${leaveId} not found`);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending approval');
    }

    const updateData: any = {};

    // First approver
    if (leave.firstApproverId === approverId && !leave.firstApprovedAt) {
      updateData.firstApproverId = approverId;
      updateData.firstApprovedAt = new Date();
      updateData.firstApprovalStatus = dto.approvalStatus;

      if (dto.approvalStatus === 'REJECTED') {
        updateData.status = LeaveStatus.REJECTED;
        updateData.rejected_by = approverId;
        updateData.rejected_at = new Date();
        updateData.rejection_reason = dto.rejectionReason;
      } else if (!leave.secondApproverId) {
        // No second approver needed
        updateData.status = LeaveStatus.APPROVED;
        updateData.final_approved_by = approverId;
        updateData.final_approved_at = new Date();
      }
    }
    // Second approver
    else if (
      leave.secondApproverId === approverId &&
      leave.firstApprovalStatus === 'APPROVED' &&
      !leave.secondApprovedAt
    ) {
      updateData.secondApproverId = approverId;
      updateData.secondApprovedAt = new Date();
      updateData.second_approval_status = dto.approvalStatus;

      if (dto.approvalStatus === 'REJECTED') {
        updateData.status = LeaveStatus.REJECTED;
        updateData.rejected_by = approverId;
        updateData.rejected_at = new Date();
        updateData.rejection_reason = dto.rejectionReason;
      } else {
        updateData.status = LeaveStatus.APPROVED;
        updateData.final_approved_by = approverId;
        updateData.final_approved_at = new Date();
      }
    } else {
      throw new ForbiddenException('You are not authorized to approve this leave');
    }

    const updated = await this.prisma.adminLeave.update({
      where: { id: leaveId },
      data: updateData,
    });

    // Update leave balance if approved
    if (updated.status === LeaveStatus.APPROVED) {
      await this.deductLeaveBalance(updated);
    }

    return this.mapToResponse(updated);
  }

  async cancel(leaveId: string, adminId: string, dto: CancelLeaveDto): Promise<LeaveResponseDto> {
    const leave = await this.prisma.adminLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException(`Leave request ${leaveId} not found`);
    }

    if (leave.adminId !== adminId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (
      ![LeaveStatus.DRAFT, LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(
        leave.status as LeaveStatus,
      )
    ) {
      throw new BadRequestException('Leave request cannot be cancelled');
    }

    const updated = await this.prisma.adminLeave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
      },
    });

    // Restore leave balance if was approved
    if (leave.status === LeaveStatus.APPROVED) {
      await this.restoreLeaveBalance(leave);
    }

    return this.mapToResponse(updated);
  }

  async findOne(leaveId: string): Promise<LeaveResponseDto> {
    const leave = await this.prisma.adminLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException(`Leave request ${leaveId} not found`);
    }

    return this.mapToResponse(leave);
  }

  async list(query: LeaveQueryDto): Promise<{ data: LeaveResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.leaveType) {
      where.leaveType = query.leaveType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.start_date = {};
      if (query.startDate) {
        where.start_date.gte = query.startDate;
      }
      if (query.endDate) {
        where.start_date.lte = query.endDate;
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminLeave.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminLeave.count({ where }),
    ]);

    return {
      data: data.map((l) => this.mapToResponse(l)),
      total,
    };
  }

  async getPendingApprovals(approverId: string): Promise<LeaveResponseDto[]> {
    const leaves = await this.prisma.adminLeave.findMany({
      where: {
        status: LeaveStatus.PENDING,
        OR: [{ firstApproverId: approverId }, { secondApproverId: approverId }],
      },
      orderBy: { submittedAt: 'asc' },
    });

    return leaves.map((l) => this.mapToResponse(l));
  }

  private async deductLeaveBalance(leave: any): Promise<void> {
    const year = new Date(leave.start_date).getFullYear();

    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        adminId_year: {
          adminId: leave.adminId,
          year,
        },
      },
    });

    if (!balance) {
      return;
    }

    const updateData: any = { lastCalculatedAt: new Date() };
    const days = Number(leave.daysCount);

    switch (leave.leaveType) {
      case LeaveType.ANNUAL:
        updateData.annualUsed = Number(balance.annualUsed) + days;
        updateData.annualRemaining = Number(balance.annualRemaining) - days;
        break;
      case LeaveType.SICK:
        updateData.sickUsed = Number(balance.sickUsed) + days;
        updateData.sickRemaining = Number(balance.sickRemaining) - days;
        break;
      case LeaveType.COMPENSATORY:
        updateData.compensatoryUsed = Number(balance.compensatoryUsed) + days;
        updateData.compensatoryRemaining = Number(balance.compensatoryRemaining) - days;
        break;
    }

    await this.prisma.adminLeaveBalance.update({
      where: {
        adminId_year: {
          adminId: leave.adminId,
          year,
        },
      },
      data: updateData,
    });
  }

  private async restoreLeaveBalance(leave: any): Promise<void> {
    const year = new Date(leave.start_date).getFullYear();

    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        adminId_year: {
          adminId: leave.adminId,
          year,
        },
      },
    });

    if (!balance) {
      return;
    }

    const updateData: any = { lastCalculatedAt: new Date() };
    const days = Number(leave.daysCount);

    switch (leave.leaveType) {
      case LeaveType.ANNUAL:
        updateData.annualUsed = Number(balance.annualUsed) - days;
        updateData.annualRemaining = Number(balance.annualRemaining) + days;
        break;
      case LeaveType.SICK:
        updateData.sickUsed = Number(balance.sickUsed) - days;
        updateData.sickRemaining = Number(balance.sickRemaining) + days;
        break;
      case LeaveType.COMPENSATORY:
        updateData.compensatoryUsed = Number(balance.compensatoryUsed) - days;
        updateData.compensatoryRemaining = Number(balance.compensatoryRemaining) + days;
        break;
    }

    await this.prisma.adminLeaveBalance.update({
      where: {
        adminId_year: {
          adminId: leave.adminId,
          year,
        },
      },
      data: updateData,
    });
  }

  private mapToResponse(leave: any): LeaveResponseDto {
    return {
      id: leave.id,
      adminId: leave.adminId,
      leaveType: leave.leaveType as LeaveType,
      startDate: leave.start_date,
      endDate: leave.end_date,
      startHalf: leave.start_half,
      endHalf: leave.end_half,
      daysCount: parseFloat(leave.daysCount || '0'),
      status: leave.status as LeaveStatus,
      requestedAt: leave.requested_at,
      submittedAt: leave.submitted_at,
      firstApproverId: leave.firstApproverId,
      firstApprovedAt: leave.firstApprovedAt,
      firstApprovalStatus: leave.firstApprovalStatus,
      secondApproverId: leave.secondApproverId,
      secondApprovedAt: leave.secondApprovedAt,
      secondApprovalStatus: leave.second_approval_status,
      finalApprovedBy: leave.final_approved_by,
      finalApprovedAt: leave.final_approved_at,
      rejectedBy: leave.rejected_by,
      rejectedAt: leave.rejected_at,
      rejectionReason: leave.rejection_reason,
      cancelledAt: leave.cancelled_at,
      cancellationReason: leave.cancellation_reason,
      reason: leave.reason,
      emergencyContact: leave.emergency_contact,
      handoverTo: leave.handover_to,
      handoverNotes: leave.handover_notes,
      attachmentUrls: leave.attachment_urls,
      createdAt: leave.created_at,
      updatedAt: leave.updated_at,
    };
  }
}
