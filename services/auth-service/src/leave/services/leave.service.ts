import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateLeaveDto,
  SubmitLeaveDto,
  ApproveLeaveDto,
  CancelLeaveDto,
  LeaveQueryDto,
  LeaveResponseDto,
  LeaveStatus,
  LeaveType,
} from '../dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async create(adminId: string, dto: CreateLeaveDto): Promise<LeaveResponseDto> {
    // Check for overlapping leaves
    const overlapping = await this.prisma.adminLeave.findFirst({
      where: {
        admin_id: adminId,
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        },
        OR: [
          {
            start_date: {
              lte: dto.endDate,
            },
            end_date: {
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
        admin_id: adminId,
        leave_type: dto.leaveType,
        start_date: dto.startDate,
        end_date: dto.endDate,
        start_half: dto.startHalf,
        end_half: dto.endHalf,
        days_count: dto.daysCount,
        status: LeaveStatus.DRAFT,
        reason: dto.reason,
        emergency_contact: dto.emergencyContact,
        handover_to: dto.handoverTo,
        handover_notes: dto.handoverNotes,
        attachment_urls: dto.attachmentUrls,
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

    if (leave.admin_id !== adminId) {
      throw new ForbiddenException('You can only submit your own leave requests');
    }

    if (leave.status !== LeaveStatus.DRAFT) {
      throw new BadRequestException('Leave request has already been submitted');
    }

    const updated = await this.prisma.adminLeave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.PENDING,
        submitted_at: new Date(),
        first_approver_id: dto.firstApproverId,
        second_approver_id: dto.secondApproverId,
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
    if (leave.first_approver_id === approverId && !leave.first_approved_at) {
      updateData.first_approver_id = approverId;
      updateData.first_approved_at = new Date();
      updateData.first_approval_status = dto.approvalStatus;

      if (dto.approvalStatus === 'REJECTED') {
        updateData.status = LeaveStatus.REJECTED;
        updateData.rejected_by = approverId;
        updateData.rejected_at = new Date();
        updateData.rejection_reason = dto.rejectionReason;
      } else if (!leave.second_approver_id) {
        // No second approver needed
        updateData.status = LeaveStatus.APPROVED;
        updateData.final_approved_by = approverId;
        updateData.final_approved_at = new Date();
      }
    }
    // Second approver
    else if (
      leave.second_approver_id === approverId &&
      leave.first_approval_status === 'APPROVED' &&
      !leave.second_approved_at
    ) {
      updateData.second_approver_id = approverId;
      updateData.second_approved_at = new Date();
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

    if (leave.admin_id !== adminId) {
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
        cancelled_at: new Date(),
        cancellation_reason: dto.cancellationReason,
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
      where.admin_id = query.adminId;
    }

    if (query.leaveType) {
      where.leave_type = query.leaveType;
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
        orderBy: { created_at: 'desc' },
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
        OR: [{ first_approver_id: approverId }, { second_approver_id: approverId }],
      },
      orderBy: { submitted_at: 'asc' },
    });

    return leaves.map((l) => this.mapToResponse(l));
  }

  private async deductLeaveBalance(leave: any): Promise<void> {
    const year = new Date(leave.start_date).getFullYear();

    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        admin_id_year: {
          admin_id: leave.admin_id,
          year,
        },
      },
    });

    if (!balance) {
      return;
    }

    const updateData: any = { last_calculated_at: new Date() };

    switch (leave.leave_type) {
      case LeaveType.ANNUAL:
        updateData.annual_used = balance.annual_used + leave.days_count;
        updateData.annual_remaining = balance.annual_remaining - leave.days_count;
        break;
      case LeaveType.SICK:
        updateData.sick_used = balance.sick_used + leave.days_count;
        updateData.sick_remaining = balance.sick_remaining - leave.days_count;
        break;
      case LeaveType.COMPENSATORY:
        updateData.compensatory_used = balance.compensatory_used + leave.days_count;
        updateData.compensatory_remaining = balance.compensatory_remaining - leave.days_count;
        break;
    }

    await this.prisma.adminLeaveBalance.update({
      where: {
        admin_id_year: {
          admin_id: leave.admin_id,
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
        admin_id_year: {
          admin_id: leave.admin_id,
          year,
        },
      },
    });

    if (!balance) {
      return;
    }

    const updateData: any = { last_calculated_at: new Date() };

    switch (leave.leave_type) {
      case LeaveType.ANNUAL:
        updateData.annual_used = balance.annual_used - leave.days_count;
        updateData.annual_remaining = balance.annual_remaining + leave.days_count;
        break;
      case LeaveType.SICK:
        updateData.sick_used = balance.sick_used - leave.days_count;
        updateData.sick_remaining = balance.sick_remaining + leave.days_count;
        break;
      case LeaveType.COMPENSATORY:
        updateData.compensatory_used = balance.compensatory_used - leave.days_count;
        updateData.compensatory_remaining = balance.compensatory_remaining + leave.days_count;
        break;
    }

    await this.prisma.adminLeaveBalance.update({
      where: {
        admin_id_year: {
          admin_id: leave.admin_id,
          year,
        },
      },
      data: updateData,
    });
  }

  private mapToResponse(leave: any): LeaveResponseDto {
    return {
      id: leave.id,
      adminId: leave.admin_id,
      leaveType: leave.leave_type as LeaveType,
      startDate: leave.start_date,
      endDate: leave.end_date,
      startHalf: leave.start_half,
      endHalf: leave.end_half,
      daysCount: parseFloat(leave.days_count || '0'),
      status: leave.status as LeaveStatus,
      requestedAt: leave.requested_at,
      submittedAt: leave.submitted_at,
      firstApproverId: leave.first_approver_id,
      firstApprovedAt: leave.first_approved_at,
      firstApprovalStatus: leave.first_approval_status,
      secondApproverId: leave.second_approver_id,
      secondApprovedAt: leave.second_approved_at,
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
