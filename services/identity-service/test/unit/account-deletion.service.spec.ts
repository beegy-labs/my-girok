import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AccountDeletionService } from '../../src/composition/account-deletion/account-deletion.service';
import { AccountsService } from '../../src/identity/accounts/accounts.service';
import { SessionsService } from '../../src/identity/sessions/sessions.service';
import { DevicesService } from '../../src/identity/devices/devices.service';
import { ProfilesService } from '../../src/identity/profiles/profiles.service';
import { SagaOrchestratorService } from '../../src/common/saga/saga-orchestrator.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { SagaStatus, SagaStepStatus } from '../../src/common/saga/saga.types';

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let accountsService: Mocked<AccountsService>;
  let sagaOrchestrator: Mocked<SagaOrchestratorService>;
  let outboxService: Mocked<OutboxService>;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
  };

  const mockOutboxEvent = {
    id: '323e4567-e89b-12d3-a456-426614174002',
    aggregateType: 'Account',
    aggregateId: mockAccount.id,
    eventType: 'ACCOUNT_DELETED',
    payload: {},
    status: 'PENDING',
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockAccountsService = {
      findById: vi.fn(),
      delete: vi.fn(),
    };

    const mockSessionsService = {
      revokeAllForAccount: vi.fn(),
    };

    const mockDevicesService = {
      findAll: vi.fn(),
      remove: vi.fn(),
    };

    const mockProfilesService = {
      delete: vi.fn(),
    };

    const mockSagaOrchestrator = {
      execute: vi.fn(),
    };

    const mockOutboxService = {
      publishEvent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountDeletionService,
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: DevicesService, useValue: mockDevicesService },
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: SagaOrchestratorService, useValue: mockSagaOrchestrator },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<AccountDeletionService>(AccountDeletionService);
    accountsService = module.get(AccountsService);
    sagaOrchestrator = module.get(SagaOrchestratorService);
    outboxService = module.get(OutboxService);
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
          sessionsRevoked: true,
          devicesRemoved: true,
          profileDeleted: true,
          accountDeleted: true,
        },
        steps: [],
      });
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      const result = await service.deleteAccount(
        { accountId: mockAccount.id, reason: 'User requested' },
        '192.168.1.1',
      );

      expect(result.success).toBe(true);
      expect(result.accountId).toBe(mockAccount.id);
      expect(result.status).toBe('COMPLETED');
      expect(result.deletedAt).toBeDefined();
    });

    it('should throw NotFoundException if account not found', async () => {
      accountsService.findById.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(service.deleteAccount({ accountId: 'nonexistent-id' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when saga fails', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.FAILED,
        context: {},
        error: 'Session revocation failed',
        steps: [],
      });

      await expect(service.deleteAccount({ accountId: mockAccount.id })).rejects.toThrow(
        'Session revocation failed',
      );
    });

    it('should include legal basis in deletion event', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: { accountId: mockAccount.id },
        steps: [],
      });
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      await service.deleteAccount({
        accountId: mockAccount.id,
        reason: 'GDPR request',
        legalBasis: 'GDPR Article 17',
      });

      expect(outboxService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_DELETED',
          payload: expect.objectContaining({
            legalBasis: 'GDPR Article 17',
          }),
        }),
      );
    });
  });

  describe('scheduleAccountDeletion', () => {
    it('should schedule deletion with default grace period', async () => {
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      const result = await service.scheduleAccountDeletion({
        accountId: mockAccount.id,
        reason: 'User requested',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('SCHEDULED');
      expect(result.scheduledDeletionDate).toBeDefined();

      // Should be scheduled for 30 days from now (default)
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);
      expect(result.scheduledDeletionDate?.getDate()).toBe(expectedDate.getDate());
    });

    it('should schedule deletion with custom grace period', async () => {
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      const result = await service.scheduleAccountDeletion(
        { accountId: mockAccount.id, reason: 'User requested' },
        7,
      );

      expect(result.success).toBe(true);

      // Should be scheduled for 7 days from now
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      expect(result.scheduledDeletionDate?.getDate()).toBe(expectedDate.getDate());
    });

    it('should publish scheduled deletion event', async () => {
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      await service.scheduleAccountDeletion(
        { accountId: mockAccount.id, reason: 'User requested' },
        14,
      );

      expect(outboxService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_DELETION_SCHEDULED',
          payload: expect.objectContaining({
            accountId: mockAccount.id,
            gracePeriodDays: 14,
          }),
        }),
      );
    });
  });

  describe('saga execution', () => {
    it('should execute saga with correct step order', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: { accountId: mockAccount.id },
        steps: [],
      });

      await service.deleteAccount({ accountId: mockAccount.id });

      expect(sagaOrchestrator.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AccountDeletion',
          steps: expect.arrayContaining([
            expect.objectContaining({ name: 'RevokeSessions' }),
            expect.objectContaining({ name: 'RemoveDevices' }),
            expect.objectContaining({ name: 'DeleteProfile' }),
            expect.objectContaining({ name: 'DeleteAccount' }),
          ]),
        }),
        expect.objectContaining({
          accountId: mockAccount.id,
        }),
      );
    });

    it('should handle saga with compensation on failure', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.COMPENSATED,
        context: { accountId: mockAccount.id },
        error: 'Device removal failed',
        steps: [
          { name: 'RevokeSessions', status: SagaStepStatus.COMPLETED, retryCount: 0 },
          { name: 'RemoveDevices', status: SagaStepStatus.FAILED, retryCount: 0 },
        ],
      });

      await expect(service.deleteAccount({ accountId: mockAccount.id })).rejects.toThrow(
        'Device removal failed',
      );
    });
  });

  describe('GDPR compliance', () => {
    it('should delete all personal data', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
          sessionsRevoked: true,
          devicesRemoved: true,
          profileDeleted: true,
          accountDeleted: true,
        },
        steps: [],
      });

      const result = await service.deleteAccount({
        accountId: mockAccount.id,
        legalBasis: 'GDPR Article 17 - Right to Erasure',
      });

      expect(result.success).toBe(true);
    });

    it('should log deletion event for audit trail', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: { accountId: mockAccount.id },
        steps: [],
      });
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      await service.deleteAccount({
        accountId: mockAccount.id,
        reason: 'GDPR request',
      });

      expect(outboxService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Account',
          aggregateId: mockAccount.id,
          eventType: 'ACCOUNT_DELETED',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing account gracefully', async () => {
      accountsService.findById.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(service.deleteAccount({ accountId: 'missing-id' })).rejects.toThrow(
        NotFoundException,
      );

      expect(sagaOrchestrator.execute).not.toHaveBeenCalled();
    });

    it('should propagate saga errors', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.FAILED,
        context: {},
        error: 'Internal error during deletion',
        steps: [],
      });

      await expect(service.deleteAccount({ accountId: mockAccount.id })).rejects.toThrow(
        'Internal error during deletion',
      );
    });

    it('should use default error message when saga fails without error', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.FAILED,
        context: {},
        steps: [],
      });

      await expect(service.deleteAccount({ accountId: mockAccount.id })).rejects.toThrow(
        'Account deletion failed',
      );
    });
  });
});
