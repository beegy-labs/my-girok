import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLeaveBalanceDto,
  AdjustBalanceDto,
  LeaveBalanceResponseDto,
} from '../dto/leave-balance.dto';

@Injectable()
export class LeaveBalanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalanceResponseDto> {
    const balance = await this.prisma.adminLeaveBalance.create({
      data: {
        admin_id: dto.adminId,
        year: dto.year,
        annual_entitled: dto.annualEntitled,
        annual_used: 0,
        annual_pending: 0,
        annual_remaining: dto.annualEntitled,
        sick_entitled: dto.sickEntitled,
        sick_used: 0,
        sick_remaining: dto.sickEntitled,
        compensatory_entitled: dto.compensatoryEntitled,
        compensatory_used: 0,
        compensatory_remaining: dto.compensatoryEntitled,
        special_entitled: dto.specialEntitled,
        special_used: 0,
        special_remaining: dto.specialEntitled,
        carryover_from_previous: dto.carryoverFromPrevious,
      },
    });

    return this.mapToResponse(balance);
  }

  async getBalance(adminId: string, year: number): Promise<LeaveBalanceResponseDto> {
    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        admin_id_year: {
          admin_id: adminId,
          year,
        },
      },
    });

    if (!balance) {
      throw new NotFoundException(`Leave balance for admin ${adminId} and year ${year} not found`);
    }

    return this.mapToResponse(balance);
  }

  async getCurrentBalance(adminId: string): Promise<LeaveBalanceResponseDto> {
    const currentYear = new Date().getFullYear();
    return this.getBalance(adminId, currentYear);
  }

  async adjust(
    adminId: string,
    year: number,
    adjustedBy: string,
    dto: AdjustBalanceDto,
  ): Promise<LeaveBalanceResponseDto> {
    const balance = await this.getBalance(adminId, year);

    const newAnnualEntitled = parseFloat(balance.annualEntitled.toString()) + dto.adjustment;
    const newAnnualRemaining = parseFloat(balance.annualRemaining.toString()) + dto.adjustment;

    const updated = await this.prisma.adminLeaveBalance.update({
      where: {
        admin_id_year: {
          admin_id: adminId,
          year,
        },
      },
      data: {
        annual_entitled: newAnnualEntitled,
        annual_remaining: newAnnualRemaining,
        adjustment: dto.adjustment,
        adjustment_reason: dto.adjustmentReason,
        adjusted_by: adjustedBy,
        last_calculated_at: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  async recalculate(adminId: string, year: number): Promise<LeaveBalanceResponseDto> {
    // Get all approved leaves for the year
    const leaves = await this.prisma.adminLeave.findMany({
      where: {
        admin_id: adminId,
        status: 'APPROVED',
        start_date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        admin_id_year: {
          admin_id: adminId,
          year,
        },
      },
    });

    if (!balance) {
      throw new NotFoundException(`Leave balance for admin ${adminId} and year ${year} not found`);
    }

    // Calculate totals
    let annualUsed = 0;
    let sickUsed = 0;
    let compensatoryUsed = 0;

    for (const leave of leaves) {
      const days = parseFloat(leave.days_count || '0');
      switch (leave.leave_type) {
        case 'ANNUAL':
          annualUsed += days;
          break;
        case 'SICK':
          sickUsed += days;
          break;
        case 'COMPENSATORY':
          compensatoryUsed += days;
          break;
      }
    }

    const updated = await this.prisma.adminLeaveBalance.update({
      where: {
        admin_id_year: {
          admin_id: adminId,
          year,
        },
      },
      data: {
        annual_used: annualUsed,
        annual_remaining: parseFloat(balance.annual_entitled.toString()) - annualUsed,
        sick_used: sickUsed,
        sick_remaining: parseFloat(balance.sick_entitled.toString()) - sickUsed,
        compensatory_used: compensatoryUsed,
        compensatory_remaining:
          parseFloat(balance.compensatory_entitled.toString()) - compensatoryUsed,
        last_calculated_at: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  async initializeForNewYear(
    adminId: string,
    year: number,
    tenureYears: number,
  ): Promise<LeaveBalanceResponseDto> {
    // Get previous year balance for carryover
    const previousBalance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        admin_id_year: {
          admin_id: adminId,
          year: year - 1,
        },
      },
    });

    let annualEntitled = 15; // Base annual leave
    let carryover = 0;

    // Tenure bonus (simplified logic)
    if (tenureYears >= 10) {
      annualEntitled += 3;
    } else if (tenureYears >= 5) {
      annualEntitled += 2;
    } else if (tenureYears >= 3) {
      annualEntitled += 1;
    }

    // Carryover from previous year (max 5 days)
    if (previousBalance) {
      const previousRemaining = parseFloat(previousBalance.annual_remaining.toString());
      carryover = Math.min(previousRemaining, 5);
    }

    return this.create({
      adminId,
      year,
      annualEntitled,
      sickEntitled: 10,
      compensatoryEntitled: 0,
      specialEntitled: 0,
      carryoverFromPrevious: carryover,
    });
  }

  private mapToResponse(balance: any): LeaveBalanceResponseDto {
    return {
      id: balance.id,
      adminId: balance.admin_id,
      year: balance.year,
      annualEntitled: parseFloat(balance.annual_entitled || '0'),
      annualUsed: parseFloat(balance.annual_used || '0'),
      annualPending: parseFloat(balance.annual_pending || '0'),
      annualRemaining: parseFloat(balance.annual_remaining || '0'),
      sickEntitled: parseFloat(balance.sick_entitled || '0'),
      sickUsed: parseFloat(balance.sick_used || '0'),
      sickRemaining: parseFloat(balance.sick_remaining || '0'),
      compensatoryEntitled: parseFloat(balance.compensatory_entitled || '0'),
      compensatoryUsed: parseFloat(balance.compensatory_used || '0'),
      compensatoryRemaining: parseFloat(balance.compensatory_remaining || '0'),
      compensatoryExpiryDate: balance.compensatory_expiry_date,
      specialEntitled: parseFloat(balance.special_entitled || '0'),
      specialUsed: parseFloat(balance.special_used || '0'),
      specialRemaining: parseFloat(balance.special_remaining || '0'),
      carryoverFromPrevious: parseFloat(balance.carryover_from_previous || '0'),
      carryoverExpiryDate: balance.carryover_expiry_date,
      adjustment: parseFloat(balance.adjustment || '0'),
      adjustmentReason: balance.adjustment_reason,
      adjustedBy: balance.adjusted_by,
      lastCalculatedAt: balance.last_calculated_at,
      createdAt: balance.created_at,
      updatedAt: balance.updated_at,
    };
  }
}
