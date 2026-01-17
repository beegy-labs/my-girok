import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
        adminId: dto.adminId,
        year: dto.year,
        annualEntitled: dto.annualEntitled,
        annualUsed: 0,
        annualPending: 0,
        annualRemaining: dto.annualEntitled,
        sickEntitled: dto.sickEntitled,
        sickUsed: 0,
        sickRemaining: dto.sickEntitled,
        compensatoryEntitled: dto.compensatoryEntitled,
        compensatoryUsed: 0,
        compensatoryRemaining: dto.compensatoryEntitled,
        specialEntitled: dto.specialEntitled,
        specialUsed: 0,
        specialRemaining: dto.specialEntitled,
        carryoverFromPrevious: dto.carryoverFromPrevious,
      },
    });

    return this.mapToResponse(balance);
  }

  async getBalance(adminId: string, year: number): Promise<LeaveBalanceResponseDto> {
    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        adminId_year: {
          adminId: adminId,
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
        adminId_year: {
          adminId: adminId,
          year,
        },
      },
      data: {
        annualEntitled: newAnnualEntitled,
        annualRemaining: newAnnualRemaining,
        adjustment: dto.adjustment,
        adjustmentReason: dto.adjustmentReason,
        adjustedBy: adjustedBy,
        lastCalculatedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  async recalculate(adminId: string, year: number): Promise<LeaveBalanceResponseDto> {
    // Get all approved leaves for the year
    const leaves = await this.prisma.adminLeave.findMany({
      where: {
        adminId: adminId,
        status: 'APPROVED',
        startDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const balance = await this.prisma.adminLeaveBalance.findUnique({
      where: {
        adminId_year: {
          adminId: adminId,
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
      const days = parseFloat(leave.daysCount?.toString() || '0');
      switch (leave.leaveType) {
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
        adminId_year: {
          adminId: adminId,
          year,
        },
      },
      data: {
        annualUsed: annualUsed,
        annualRemaining: parseFloat(balance.annualEntitled.toString()) - annualUsed,
        sickUsed: sickUsed,
        sickRemaining: parseFloat(balance.sickEntitled.toString()) - sickUsed,
        compensatoryUsed: compensatoryUsed,
        compensatoryRemaining:
          parseFloat(balance.compensatoryEntitled.toString()) - compensatoryUsed,
        lastCalculatedAt: new Date(),
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
        adminId_year: {
          adminId: adminId,
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
      const previousRemaining = parseFloat(previousBalance.annualRemaining.toString());
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
      adminId: balance.adminId,
      year: balance.year,
      annualEntitled: parseFloat(balance.annualEntitled || '0'),
      annualUsed: parseFloat(balance.annualUsed || '0'),
      annualPending: parseFloat(balance.annual_pending || '0'),
      annualRemaining: parseFloat(balance.annualRemaining || '0'),
      sickEntitled: parseFloat(balance.sickEntitled || '0'),
      sickUsed: parseFloat(balance.sickUsed || '0'),
      sickRemaining: parseFloat(balance.sickRemaining || '0'),
      compensatoryEntitled: parseFloat(balance.compensatoryEntitled || '0'),
      compensatoryUsed: parseFloat(balance.compensatoryUsed || '0'),
      compensatoryRemaining: parseFloat(balance.compensatoryRemaining || '0'),
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
