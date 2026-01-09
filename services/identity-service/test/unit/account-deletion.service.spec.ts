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
    const DEFAULT_GRACE_PERIOD_DAYS = 30;
    const CUSTOM_GRACE_PERIOD_DAYS = 7;
    const ANOTHER_CUSTOM_GRACE_PERIOD_DAYS = 14;

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
      expectedDate.setDate(expectedDate.getDate() + DEFAULT_GRACE_PERIOD_DAYS);
      expect(result.scheduledDeletionDate?.getDate()).toBe(expectedDate.getDate());
    });

    it('should schedule deletion with custom grace period', async () => {
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      const result = await service.scheduleAccountDeletion(
        { accountId: mockAccount.id, reason: 'User requested' },
        CUSTOM_GRACE_PERIOD_DAYS,
      );

      expect(result.success).toBe(true);

      // Should be scheduled for 7 days from now
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + CUSTOM_GRACE_PERIOD_DAYS);
      expect(result.scheduledDeletionDate?.getDate()).toBe(expectedDate.getDate());
    });

    it('should publish scheduled deletion event', async () => {
      outboxService.publishEvent.mockResolvedValue(mockOutboxEvent as never);

      await service.scheduleAccountDeletion(
        { accountId: mockAccount.id, reason: 'User requested' },
        ANOTHER_CUSTOM_GRACE_PERIOD_DAYS,
      );

      expect(outboxService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_DELETION_SCHEDULED',
          payload: expect.objectContaining({
            accountId: mockAccount.id,
            gracePeriodDays: ANOTHER_CUSTOM_GRACE_PERIOD_DAYS,
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

  describe('saga step execution', () => {
    let sessionsService: { revokeAllForAccount: Mock };
    let devicesService: { findAll: Mock; remove: Mock };
    let profilesService: { delete: Mock };
    let capturedSagaDefinition: {
      steps: Array<{
        name: string;
        execute: (ctx: unknown) => Promise<unknown>;
        compensate: (ctx: unknown) => Promise<void>;
      }>;
    };

    beforeEach(async () => {
      sessionsService = { revokeAllForAccount: vi.fn() };
      devicesService = { findAll: vi.fn(), remove: vi.fn() };
      profilesService = { delete: vi.fn() };

      const mockAccountsServiceNew = { findById: vi.fn(), delete: vi.fn() };
      const mockOutboxServiceNew = { publishEvent: vi.fn() };
      const mockSagaOrchestratorNew = {
        execute: vi.fn().mockImplementation((definition) => {
          capturedSagaDefinition = definition;
          return {
            success: true,
            sagaId: 'saga-123',
            status: SagaStatus.COMPLETED,
            context: { accountId: mockAccount.id },
            steps: [],
          };
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AccountDeletionService,
          { provide: AccountsService, useValue: mockAccountsServiceNew },
          { provide: SessionsService, useValue: sessionsService },
          { provide: DevicesService, useValue: devicesService },
          { provide: ProfilesService, useValue: profilesService },
          { provide: SagaOrchestratorService, useValue: mockSagaOrchestratorNew },
          { provide: OutboxService, useValue: mockOutboxServiceNew },
        ],
      }).compile();

      const newService = module.get<AccountDeletionService>(AccountDeletionService);
      const newAccountsService = module.get(AccountsService) as { findById: Mock };
      const newOutboxService = module.get(OutboxService) as { publishEvent: Mock };

      newAccountsService.findById.mockResolvedValue(mockAccount);
      newOutboxService.publishEvent.mockResolvedValue({});

      await newService.deleteAccount({ accountId: mockAccount.id });
    });

    describe('RevokeSessions step', () => {
      it('should revoke all sessions for account', async () => {
        sessionsService.revokeAllForAccount.mockResolvedValue(undefined);
        const step = capturedSagaDefinition.steps.find((s) => s.name === 'RevokeSessions');
        const result = await step!.execute({ accountId: mockAccount.id });

        expect(sessionsService.revokeAllForAccount).toHaveBeenCalledWith(mockAccount.id);
        expect(result).toEqual({ accountId: mockAccount.id, sessionsRevoked: true });
      });

      it('should skip compensation for sessions', async () => {
        const step = capturedSagaDefinition.steps.find((s) => s.name === 'RevokeSessions');
        await expect(step!.compensate({ accountId: mockAccount.id })).resolves.not.toThrow();
      });
    });

    describe('RemoveDevices step', () => {
      it('should remove all devices for account', async () => {
        const mockDevices = [{ id: 'device-1' }, { id: 'device-2' }];
        devicesService.findAll.mockResolvedValue({ data: mockDevices });
        devicesService.remove.mockResolvedValue(undefined);

        const step = capturedSagaDefinition.steps.find((s) => s.name === 'RemoveDevices');
        const result = await step!.execute({ accountId: mockAccount.id });

        expect(devicesService.findAll).toHaveBeenCalledWith({ accountId: mockAccount.id });
        expect(devicesService.remove).toHaveBeenCalledTimes(2);
        expect(devicesService.remove).toHaveBeenCalledWith('device-1');
        expect(devicesService.remove).toHaveBeenCalledWith('device-2');
        expect(result).toEqual({ accountId: mockAccount.id, devicesRemoved: true });
      });

      it('should handle no devices', async () => {
        devicesService.findAll.mockResolvedValue({ data: [] });

        const step = capturedSagaDefinition.steps.find((s) => s.name === 'RemoveDevices');
        const result = await step!.execute({ accountId: mockAccount.id });

        expect(devicesService.remove).not.toHaveBeenCalled();
        expect(result).toEqual({ accountId: mockAccount.id, devicesRemoved: true });
      });

      it('should skip compensation for devices', async () => {
        const step = capturedSagaDefinition.steps.find((s) => s.name === 'RemoveDevices');
        await expect(step!.compensate({ accountId: mockAccount.id })).resolves.not.toThrow();
      });
    });

    describe('DeleteProfile step', () => {
      it('should delete profile for account', async () => {
        profilesService.delete.mockResolvedValue(undefined);

        const step = capturedSagaDefinition.steps.find((s) => s.name === 'DeleteProfile');
        const result = await step!.execute({ accountId: mockAccount.id });

        expect(profilesService.delete).toHaveBeenCalledWith(mockAccount.id);
        expect(result).toEqual({ accountId: mockAccount.id, profileDeleted: true });
      });

      it('should handle profile not found', async () => {
        profilesService.delete.mockRejectedValue(new NotFoundException('Profile not found'));

        const step = capturedSagaDefinition.steps.find((s) => s.name === 'DeleteProfile');
        const result = await step!.execute({ accountId: mockAccount.id });

        // Should not throw, should continue
        expect(result).toEqual({ accountId: mockAccount.id, profileDeleted: true });
      });

      it('should skip compensation for profile deletion', async () => {
        const step = capturedSagaDefinition.steps.find((s) => s.name === 'DeleteProfile');
        await expect(step!.compensate({ accountId: mockAccount.id })).resolves.not.toThrow();
      });
    });

    describe('DeleteAccount step', () => {
      it('should soft delete account', async () => {
        const module = await Test.createTestingModule({
          providers: [
            AccountDeletionService,
            {
              provide: AccountsService,
              useValue: { findById: vi.fn().mockResolvedValue(mockAccount), delete: vi.fn() },
            },
            { provide: SessionsService, useValue: { revokeAllForAccount: vi.fn() } },
            {
              provide: DevicesService,
              useValue: { findAll: vi.fn().mockResolvedValue({ data: [] }), remove: vi.fn() },
            },
            { provide: ProfilesService, useValue: { delete: vi.fn() } },
            {
              provide: SagaOrchestratorService,
              useValue: {
                execute: vi.fn().mockImplementation((def) => {
                  capturedSagaDefinition = def;
                  return {
                    success: true,
                    sagaId: 'test',
                    status: SagaStatus.COMPLETED,
                    context: {},
                    steps: [],
                  };
                }),
              },
            },
            { provide: OutboxService, useValue: { publishEvent: vi.fn().mockResolvedValue({}) } },
          ],
        }).compile();

        const svc = module.get<AccountDeletionService>(AccountDeletionService);
        const accSvc = module.get(AccountsService) as { delete: Mock };
        await svc.deleteAccount({ accountId: mockAccount.id });

        const step = capturedSagaDefinition.steps.find((s) => s.name === 'DeleteAccount');
        await step!.execute({ accountId: mockAccount.id });

        expect(accSvc.delete).toHaveBeenCalledWith(mockAccount.id);
      });

      it('should skip compensation for account deletion', async () => {
        const step = capturedSagaDefinition.steps.find((s) => s.name === 'DeleteAccount');
        await expect(step!.compensate({ accountId: mockAccount.id })).resolves.not.toThrow();
      });
    });
  });
});
