import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountDeletionController } from './account-deletion.controller';
import { AccountDeletionService } from './account-deletion.service';
import { DeleteAccountDto, AccountDeletionResponseDto } from './dto/account-deletion.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AccountDeletionController', () => {
  let controller: AccountDeletionController;
  let deletionService: jest.Mocked<AccountDeletionService>;

  const mockDeletedAt = new Date();
  const mockScheduledDate = new Date();
  mockScheduledDate.setDate(mockScheduledDate.getDate() + 30);

  const mockDeletionResponse: AccountDeletionResponseDto = {
    success: true,
    accountId: '123e4567-e89b-12d3-a456-426614174000',
    status: 'COMPLETED',
    deletedAt: mockDeletedAt,
  };

  const mockScheduledResponse: AccountDeletionResponseDto = {
    success: true,
    accountId: '123e4567-e89b-12d3-a456-426614174000',
    status: 'SCHEDULED',
    scheduledDeletionDate: mockScheduledDate,
    deletedAt: mockScheduledDate,
  };

  const mockRequest = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: {},
  } as unknown as Request;

  beforeEach(async () => {
    const mockDeletionService = {
      deleteAccount: jest.fn(),
      scheduleAccountDeletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountDeletionController],
      providers: [{ provide: AccountDeletionService, useValue: mockDeletionService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountDeletionController>(AccountDeletionController);
    deletionService = module.get(AccountDeletionService);
  });

  describe('deleteImmediate', () => {
    it('should delete account immediately with success', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'User requested account deletion',
        legalBasis: 'GDPR_ARTICLE_17',
      };

      deletionService.deleteAccount.mockResolvedValue(mockDeletionResponse);

      const result = await controller.deleteImmediate(dto, mockRequest);

      expect(result).toEqual(mockDeletionResponse);
      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(deletionService.deleteAccount).toHaveBeenCalledWith(dto, '127.0.0.1');
    });

    it('should use request.ip when available', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const requestWithIp = { ...mockRequest, ip: '192.168.1.100' } as unknown as Request;

      deletionService.deleteAccount.mockResolvedValue(mockDeletionResponse);

      await controller.deleteImmediate(dto, requestWithIp);

      expect(deletionService.deleteAccount).toHaveBeenCalledWith(dto, '192.168.1.100');
    });

    it('should fall back to socket.remoteAddress when ip is not available', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const requestWithoutIp = {
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' },
        headers: {},
      } as unknown as Request;

      deletionService.deleteAccount.mockResolvedValue(mockDeletionResponse);

      await controller.deleteImmediate(dto, requestWithoutIp);

      expect(deletionService.deleteAccount).toHaveBeenCalledWith(dto, '10.0.0.1');
    });

    it('should handle undefined IP addresses', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const requestWithoutIp = {
        ip: undefined,
        socket: undefined,
        headers: {},
      } as unknown as Request;

      deletionService.deleteAccount.mockResolvedValue(mockDeletionResponse);

      await controller.deleteImmediate(dto, requestWithoutIp);

      expect(deletionService.deleteAccount).toHaveBeenCalledWith(dto, undefined);
    });

    it('should throw NotFoundException when account not found', async () => {
      const dto: DeleteAccountDto = {
        accountId: 'nonexistent-account-id',
      };

      deletionService.deleteAccount.mockRejectedValue(
        new NotFoundException('Account not found: nonexistent-account-id'),
      );

      await expect(controller.deleteImmediate(dto, mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should delete account with only accountId', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };

      deletionService.deleteAccount.mockResolvedValue(mockDeletionResponse);

      const result = await controller.deleteImmediate(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(deletionService.deleteAccount).toHaveBeenCalledWith(dto, '127.0.0.1');
    });

    it('should propagate service errors', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };

      deletionService.deleteAccount.mockRejectedValue(new Error('Account deletion failed'));

      await expect(controller.deleteImmediate(dto, mockRequest)).rejects.toThrow(
        'Account deletion failed',
      );
    });
  });

  describe('scheduleDelete', () => {
    it('should schedule account deletion with 30-day grace period', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'User requested account deletion',
      };

      deletionService.scheduleAccountDeletion.mockResolvedValue(mockScheduledResponse);

      const result = await controller.scheduleDelete(dto);

      expect(result).toEqual(mockScheduledResponse);
      expect(result.success).toBe(true);
      expect(result.status).toBe('SCHEDULED');
      expect(result.scheduledDeletionDate).toBeDefined();
      expect(deletionService.scheduleAccountDeletion).toHaveBeenCalledWith(dto, 30);
    });

    it('should schedule deletion with reason provided', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'No longer using the service',
        legalBasis: 'USER_REQUEST',
      };

      deletionService.scheduleAccountDeletion.mockResolvedValue(mockScheduledResponse);

      const result = await controller.scheduleDelete(dto);

      expect(result.success).toBe(true);
      expect(deletionService.scheduleAccountDeletion).toHaveBeenCalledWith(dto, 30);
    });

    it('should throw NotFoundException when account not found', async () => {
      const dto: DeleteAccountDto = {
        accountId: 'nonexistent-account-id',
      };

      deletionService.scheduleAccountDeletion.mockRejectedValue(
        new NotFoundException('Account not found: nonexistent-account-id'),
      );

      await expect(controller.scheduleDelete(dto)).rejects.toThrow(NotFoundException);
    });

    it('should schedule deletion with only accountId', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };

      deletionService.scheduleAccountDeletion.mockResolvedValue(mockScheduledResponse);

      const result = await controller.scheduleDelete(dto);

      expect(result.success).toBe(true);
      expect(result.status).toBe('SCHEDULED');
    });

    it('should propagate service errors', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };

      deletionService.scheduleAccountDeletion.mockRejectedValue(
        new Error('Failed to schedule deletion'),
      );

      await expect(controller.scheduleDelete(dto)).rejects.toThrow('Failed to schedule deletion');
    });

    it('should always use 30-day grace period', async () => {
      const dto: DeleteAccountDto = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
      };

      deletionService.scheduleAccountDeletion.mockResolvedValue(mockScheduledResponse);

      await controller.scheduleDelete(dto);

      // Verify the second argument is always 30
      expect(deletionService.scheduleAccountDeletion).toHaveBeenCalledWith(expect.any(Object), 30);
    });
  });
});
