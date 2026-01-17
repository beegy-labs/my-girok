import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import { LeaveService } from '../../src/leave/services/leave.service';
import { LeaveBalanceService } from '../../src/leave/services/leave-balance.service';
import { LeaveController } from '../../src/leave/controllers/leave.controller';
import { LeaveBalanceController } from '../../src/leave/controllers/leave-balance.controller';
import { LeaveType, LeaveStatus } from '@my-girok/types';

/**
 * Integration Tests: Leave Management
 *
 * Tests the full leave management flow:
 * - Leave request creation and submission
 * - Multi-level approval workflow
 * - Leave balance management
 * - Carryover and tenure bonus calculation
 * - Overlap detection
 * - Leave cancellation and balance restoration
 *
 * IMPORTANT: These tests require a running PostgreSQL database.
 * They are skipped in CI/CD pipelines and should be run manually
 * in a development environment with a test database.
 *
 * To run: Remove .skip and ensure DATABASE_URL is set to a test database.
 */
describe.skip('Leave Management Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let leaveService: LeaveService;
  let leaveBalanceService: LeaveBalanceService;
  let _leaveController: LeaveController;
  let _leaveBalanceController: LeaveBalanceController;
  const testAdminId = 'test-admin-leave-001';
  const firstApproverId = 'test-approver-001';
  const secondApproverId = 'test-approver-002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LeaveController, LeaveBalanceController],
      providers: [LeaveService, LeaveBalanceService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    leaveService = moduleFixture.get<LeaveService>(LeaveService);
    leaveBalanceService = moduleFixture.get<LeaveBalanceService>(LeaveBalanceService);
    _leaveController = moduleFixture.get<LeaveController>(LeaveController);
    _leaveBalanceController = moduleFixture.get<LeaveBalanceController>(LeaveBalanceController);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.adminLeave.deleteMany({
      where: {
        admin_id: testAdminId,
      },
    });
    await prisma.adminLeaveBalance.deleteMany({
      where: {
        admin_id: testAdminId,
      },
    });
  });

  describe('Leave Request Creation and Submission', () => {
    beforeEach(async () => {
      // Create initial leave balance
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });
    });

    it('should create a leave request in draft status', async () => {
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-12'),
        daysCount: 3,
        reason: 'Personal vacation',
      };

      const result = await leaveService.create(testAdminId, createDto);

      expect(result.adminId).toBe(testAdminId);
      expect(result.leaveType).toBe(LeaveType.ANNUAL);
      expect(result.status).toBe(LeaveStatus.DRAFT);
      expect(result.daysCount).toBe(3);
      expect(result.reason).toBe('Personal vacation');
    });

    it('should submit leave request for approval', async () => {
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-03'),
        daysCount: 3,
        reason: 'Family trip',
      };

      const draft = await leaveService.create(testAdminId, createDto);

      const submitDto = {
        firstApproverId,
      };

      const result = await leaveService.submit(draft.id, testAdminId, submitDto);

      expect(result.status).toBe(LeaveStatus.PENDING);
      expect(result.firstApproverId).toBe(firstApproverId);
      expect(result.submittedAt).toBeDefined();
    });

    it('should detect overlapping leave requests', async () => {
      // Create first leave
      const firstLeave = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-05-10'),
        endDate: new Date('2026-05-15'),
        daysCount: 6,
        reason: 'Vacation',
      };

      const first = await leaveService.create(testAdminId, firstLeave);
      await leaveService.submit(first.id, testAdminId, { firstApproverId });

      // Try to create overlapping leave
      const overlapping = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-05-12'),
        endDate: new Date('2026-05-18'),
        daysCount: 7,
        reason: 'Another vacation',
      };

      const second = await leaveService.create(testAdminId, overlapping);

      await expect(
        leaveService.submit(second.id, testAdminId, { firstApproverId }),
      ).rejects.toThrow(/overlapping/i);
    });

    it('should create half-day leave request', async () => {
      const halfDayDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-01'),
        startHalf: 'AM',
        daysCount: 0.5,
        reason: 'Medical appointment',
      };

      const result = await leaveService.create(testAdminId, halfDayDto);

      expect(result.daysCount).toBe(0.5);
      expect(result.startHalf).toBe('AM');
    });
  });

  describe('Multi-level Approval Workflow', () => {
    beforeEach(async () => {
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });
    });

    it('should approve leave with first approver only', async () => {
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-03'),
        daysCount: 3,
        reason: 'Summer vacation',
      };

      const draft = await leaveService.create(testAdminId, createDto);
      const submitted = await leaveService.submit(draft.id, testAdminId, { firstApproverId });

      const approveDto = {
        approvalStatus: 'APPROVED',
      };

      const result = await leaveService.approve(submitted.id, firstApproverId, approveDto);

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.firstApprovalStatus).toBe('APPROVED');
      expect(result.firstApprovedAt).toBeDefined();
      expect(result.finalApprovedBy).toBe(firstApproverId);
    });

    it('should handle multi-level approval workflow', async () => {
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        daysCount: 5,
        reason: 'Extended vacation',
      };

      const draft = await leaveService.create(testAdminId, createDto);
      const submitted = await leaveService.submit(draft.id, testAdminId, {
        firstApproverId,
        secondApproverId,
      });

      // First approver approves
      const firstApproval = await leaveService.approve(submitted.id, firstApproverId, {
        approvalStatus: 'APPROVED',
      });

      expect(firstApproval.status).toBe(LeaveStatus.PENDING);
      expect(firstApproval.firstApprovalStatus).toBe('APPROVED');

      // Second approver approves
      const finalApproval = await leaveService.approve(firstApproval.id, secondApproverId, {
        approvalStatus: 'APPROVED',
      });

      expect(finalApproval.status).toBe(LeaveStatus.APPROVED);
      expect(finalApproval.secondApprovalStatus).toBe('APPROVED');
      expect(finalApproval.finalApprovedBy).toBe(secondApproverId);
    });

    it('should reject leave request', async () => {
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-02'),
        daysCount: 2,
        reason: 'Personal',
      };

      const draft = await leaveService.create(testAdminId, createDto);
      const submitted = await leaveService.submit(draft.id, testAdminId, { firstApproverId });

      const rejectDto = {
        approvalStatus: 'REJECTED',
        rejectionReason: 'Insufficient staffing during this period',
      };

      const result = await leaveService.approve(submitted.id, firstApproverId, rejectDto);

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.rejectedBy).toBe(firstApproverId);
      expect(result.rejectionReason).toBe('Insufficient staffing during this period');
    });
  });

  describe('Leave Balance Management', () => {
    it('should create leave balance for admin', async () => {
      const createDto = {
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
        sickEntitled: 10,
      };

      const result = await leaveBalanceService.create(createDto);

      expect(result.adminId).toBe(testAdminId);
      expect(result.year).toBe(2026);
      expect(result.annualEntitled).toBe(15);
      expect(result.annualRemaining).toBe(15);
      expect(result.sickEntitled).toBe(10);
    });

    it('should deduct balance when leave is approved', async () => {
      // Create balance
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });

      // Create and approve leave
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-03'),
        daysCount: 3,
        reason: 'Vacation',
      };

      const draft = await leaveService.create(testAdminId, createDto);
      const submitted = await leaveService.submit(draft.id, testAdminId, { firstApproverId });
      await leaveService.approve(submitted.id, firstApproverId, { approvalStatus: 'APPROVED' });

      // Check balance
      const _balance = await leaveBalanceService.getBalance(testAdminId, 2026);

      expect(balance.annualUsed).toBe(3);
      expect(balance.annualRemaining).toBe(12);
    });

    it('should restore balance when leave is cancelled', async () => {
      // Create balance
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });

      // Create, submit, and approve leave
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        daysCount: 5,
        reason: 'Vacation',
      };

      const draft = await leaveService.create(testAdminId, createDto);
      const submitted = await leaveService.submit(draft.id, testAdminId, { firstApproverId });
      const approved = await leaveService.approve(submitted.id, firstApproverId, {
        approvalStatus: 'APPROVED',
      });

      // Verify balance deducted
      let balance = await leaveBalanceService.getBalance(testAdminId, 2026);
      expect(balance.annualUsed).toBe(5);

      // Cancel leave
      await leaveService.cancel(approved.id, testAdminId, {
        cancellationReason: 'Plans changed',
      });

      // Verify balance restored
      balance = await leaveBalanceService.getBalance(testAdminId, 2026);
      expect(balance.annualUsed).toBe(0);
      expect(balance.annualRemaining).toBe(15);
    });

    it('should adjust leave balance manually', async () => {
      const _balance = await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });

      const adjustDto = {
        adjustment: 2,
        adjustmentReason: 'Bonus for excellent performance',
      };

      const result = await leaveBalanceService.adjust(testAdminId, 2026, 'hr-admin-001', adjustDto);

      expect(result.adjustment).toBe(2);
      expect(result.adjustmentReason).toBe('Bonus for excellent performance');
      expect(result.adjustedBy).toBe('hr-admin-001');
    });

    it('should recalculate leave balance based on approved leaves', async () => {
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });

      // Create multiple approved leaves
      for (let i = 1; i <= 3; i++) {
        const dto = {
          leaveType: LeaveType.ANNUAL,
          startDate: new Date(`2026-0${i}-10`),
          endDate: new Date(`2026-0${i}-12`),
          daysCount: 3,
          reason: `Leave ${i}`,
        };

        const draft = await leaveService.create(testAdminId, dto);
        const submitted = await leaveService.submit(draft.id, testAdminId, { firstApproverId });
        await leaveService.approve(submitted.id, firstApproverId, { approvalStatus: 'APPROVED' });
      }

      const result = await leaveBalanceService.recalculate(testAdminId, 2026);

      expect(result.annualUsed).toBe(9);
      expect(result.annualRemaining).toBe(6);
    });
  });

  describe('Tenure Bonus Calculation', () => {
    it('should initialize balance with tenure bonus', async () => {
      // 5 years tenure gets 2 bonus days (based on default policy)
      const result = await leaveBalanceService.initializeForNewYear(testAdminId, 2026, 5);

      expect(result.annualEntitled).toBe(17); // 15 base + 2 bonus
    });

    it('should apply maximum tenure bonus', async () => {
      // 10+ years tenure gets 3 bonus days
      const result = await leaveBalanceService.initializeForNewYear(testAdminId, 2026, 10);

      expect(result.annualEntitled).toBe(18); // 15 base + 3 bonus
    });

    it('should not apply bonus for low tenure', async () => {
      // Less than 3 years gets no bonus
      const result = await leaveBalanceService.initializeForNewYear(testAdminId, 2026, 2);

      expect(result.annualEntitled).toBe(15); // 15 base only
    });
  });

  describe('Carryover Management', () => {
    it('should initialize new year with carryover from previous year', async () => {
      // Create 2025 balance with remaining days
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2025,
        annualEntitled: 15,
        annualUsed: 10,
        annualRemaining: 5,
      });

      // Initialize 2026 with carryover (max 5 days)
      const result = await leaveBalanceService.initializeForNewYear(testAdminId, 2026, 3);

      expect(result.carryoverFromPrevious).toBe(5);
      expect(result.annualEntitled).toBeGreaterThan(15); // base + carryover
    });

    it('should cap carryover at maximum (5 days)', async () => {
      // Create 2025 balance with more than max carryover
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2025,
        annualEntitled: 15,
        annualUsed: 5,
        annualRemaining: 10,
      });

      const result = await leaveBalanceService.initializeForNewYear(testAdminId, 2026, 3);

      expect(result.carryoverFromPrevious).toBe(5); // capped at 5
    });
  });

  describe('Leave Query and Filtering', () => {
    beforeEach(async () => {
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
      });
    });

    it('should list leaves with pagination', async () => {
      // Create multiple leaves
      for (let i = 1; i <= 5; i++) {
        await leaveService.create(testAdminId, {
          leaveType: LeaveType.ANNUAL,
          startDate: new Date(`2026-01-${10 + i}`),
          endDate: new Date(`2026-01-${10 + i}`),
          daysCount: 1,
          reason: `Leave ${i}`,
        });
      }

      const result = await leaveService.list({
        adminId: testAdminId,
        page: 1,
        limit: 3,
      });

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(5);
    });

    it('should filter leaves by status', async () => {
      // Create draft leave
      await leaveService.create(testAdminId, {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-02'),
        daysCount: 2,
        reason: 'Draft leave',
      });

      // Create and submit pending leave
      const draft = await leaveService.create(testAdminId, {
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2026-12-10'),
        endDate: new Date('2026-12-11'),
        daysCount: 2,
        reason: 'Pending leave',
      });
      await leaveService.submit(draft.id, testAdminId, { firstApproverId });

      const result = await leaveService.list({
        adminId: testAdminId,
        status: LeaveStatus.PENDING,
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(LeaveStatus.PENDING);
    });

    it('should get pending approvals for approver', async () => {
      // Create multiple leaves for approval
      for (let i = 1; i <= 3; i++) {
        const draft = await leaveService.create(testAdminId, {
          leaveType: LeaveType.ANNUAL,
          startDate: new Date(`2026-12-${10 + i}`),
          endDate: new Date(`2026-12-${10 + i}`),
          daysCount: 1,
          reason: `Approval ${i}`,
        });
        await leaveService.submit(draft.id, testAdminId, { firstApproverId });
      }

      const pending = await leaveService.getPendingApprovals(firstApproverId);

      expect(pending.length).toBe(3);
      expect(pending.every((leave) => leave.firstApproverId === firstApproverId)).toBe(true);
    });
  });

  describe('Leave Types', () => {
    beforeEach(async () => {
      await leaveBalanceService.create({
        adminId: testAdminId,
        year: 2026,
        annualEntitled: 15,
        sickEntitled: 10,
      });
    });

    it('should create sick leave', async () => {
      const sickLeave = {
        leaveType: LeaveType.SICK,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-02'),
        daysCount: 2,
        reason: 'Medical issue',
      };

      const result = await leaveService.create(testAdminId, sickLeave);

      expect(result.leaveType).toBe(LeaveType.SICK);
    });

    it('should create parental leave', async () => {
      const parentalLeave = {
        leaveType: LeaveType.PARENTAL,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-30'),
        daysCount: 30,
        reason: 'Newborn care',
      };

      const result = await leaveService.create(testAdminId, parentalLeave);

      expect(result.leaveType).toBe(LeaveType.PARENTAL);
      expect(result.daysCount).toBe(30);
    });

    it('should create compensatory leave', async () => {
      const compensatoryLeave = {
        leaveType: LeaveType.COMPENSATORY,
        startDate: new Date('2026-04-15'),
        endDate: new Date('2026-04-15'),
        daysCount: 1,
        reason: 'Overtime compensation',
      };

      const result = await leaveService.create(testAdminId, compensatoryLeave);

      expect(result.leaveType).toBe(LeaveType.COMPENSATORY);
    });
  });
});
