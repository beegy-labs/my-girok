import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AccountsController } from '../../src/identity/accounts/accounts.controller';
import { AccountsService } from '../../src/identity/accounts/accounts.service';
import { AuthProvider } from '../../src/identity/accounts/dto/create-account.dto';
import { AccountStatus } from '../../src/identity/accounts/dto/update-account.dto';
import { ApiKeyGuard } from '../../src/common/guards/api-key.guard';

describe('AccountsController', () => {
  let controller: AccountsController;
  let service: jest.Mocked<AccountsService>;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    externalId: 'ACC_abc123',
    email: 'test@example.com',
    username: 'testuser',
    provider: 'LOCAL',
    status: 'ACTIVE',
    mode: 'SERVICE',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    mfaEnabled: false,
    region: null,
    locale: 'en',
    timezone: 'UTC',
    countryCode: 'US',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockAccount],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByExternalId: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      changePassword: jest.fn(),
      delete: jest.fn(),
      verifyEmail: jest.fn(),
      enableMfa: jest.fn(),
      verifyAndCompleteMfaSetup: jest.fn(),
      disableMfa: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        { provide: AccountsService, useValue: mockService },
        { provide: ConfigService, useValue: mockConfigService },
        Reflector,
        ApiKeyGuard,
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    service = module.get(AccountsService);
  });

  describe('create', () => {
    it('should create a new account', async () => {
      service.create.mockResolvedValue(mockAccount as never);

      const result = await controller.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      });

      expect(result).toEqual(mockAccount);
      expect(service.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      service.create.mockRejectedValue(new ConflictException('Email already registered'));

      await expect(
        controller.create({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated accounts', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      const result = await controller.findAll(1, 20);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        email: undefined,
        username: undefined,
        status: undefined,
        provider: undefined,
        emailVerified: undefined,
        sort: undefined,
        order: undefined,
      });
    });

    it('should filter by status', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(1, 20, undefined, undefined, AccountStatus.ACTIVE);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AccountStatus.ACTIVE,
        }),
      );
    });

    it('should filter by provider', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(1, 20, undefined, undefined, undefined, AuthProvider.GOOGLE);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: AuthProvider.GOOGLE,
        }),
      );
    });

    it('should filter by email verified', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(1, 20, undefined, undefined, undefined, undefined, true);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true,
        }),
      );
    });

    it('should sort by specified field', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'email',
        'asc',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'email',
          order: 'asc',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return account by ID', async () => {
      service.findById.mockResolvedValue(mockAccount as never);

      const result = await controller.findById(mockAccount.id);

      expect(result).toEqual(mockAccount);
      expect(service.findById).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should throw NotFoundException when account not found', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(controller.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByExternalId', () => {
    it('should return account by external ID', async () => {
      service.findByExternalId.mockResolvedValue(mockAccount as never);

      const result = await controller.findByExternalId('ACC_abc123');

      expect(result).toEqual(mockAccount);
      expect(service.findByExternalId).toHaveBeenCalledWith('ACC_abc123');
    });

    it('should throw NotFoundException when account not found', async () => {
      service.findByExternalId.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(controller.findByExternalId('ACC_unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return account by email', async () => {
      service.findByEmail.mockResolvedValue(mockAccount as never);

      const result = await controller.findByEmail('test@example.com');

      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      service.findByEmail.mockResolvedValue(null);

      const result = await controller.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return account by username', async () => {
      service.findByUsername.mockResolvedValue(mockAccount as never);

      const result = await controller.findByUsername('testuser');

      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      service.findByUsername.mockResolvedValue(null);

      const result = await controller.findByUsername('unknownuser');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update account', async () => {
      const updatedAccount = { ...mockAccount, locale: 'ko' };
      service.update.mockResolvedValue(updatedAccount as never);

      const result = await controller.update(mockAccount.id, { locale: 'ko' });

      expect(result.locale).toBe('ko');
      expect(service.update).toHaveBeenCalledWith(mockAccount.id, { locale: 'ko' });
    });

    it('should throw ConflictException for duplicate email', async () => {
      service.update.mockRejectedValue(new ConflictException('Email already registered'));

      await expect(
        controller.update(mockAccount.id, { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      service.changePassword.mockResolvedValue(undefined);

      await expect(
        controller.changePassword(mockAccount.id, {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).resolves.not.toThrow();

      expect(service.changePassword).toHaveBeenCalledWith(mockAccount.id, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      service.changePassword.mockRejectedValue(
        new BadRequestException('Current password is incorrect'),
      );

      await expect(
        controller.changePassword(mockAccount.id, {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete account', async () => {
      service.delete.mockResolvedValue(undefined);

      await expect(controller.delete(mockAccount.id)).resolves.not.toThrow();
      expect(service.delete).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should throw NotFoundException when account not found', async () => {
      service.delete.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(controller.delete('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      service.verifyEmail.mockResolvedValue(undefined);

      await expect(controller.verifyEmail(mockAccount.id)).resolves.not.toThrow();
      expect(service.verifyEmail).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should throw NotFoundException when account not found', async () => {
      service.verifyEmail.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(controller.verifyEmail('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('MFA operations', () => {
    describe('enableMfa', () => {
      it('should return MFA setup data', async () => {
        const mfaSetup = {
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'otpauth://totp/...',
          backupCodes: ['ABC123', 'DEF456'],
        };
        service.enableMfa.mockResolvedValue(mfaSetup);

        const result = await controller.enableMfa(mockAccount.id, {});

        expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
        expect(result.backupCodes).toHaveLength(2);
      });

      it('should throw ConflictException if MFA already enabled', async () => {
        service.enableMfa.mockRejectedValue(new ConflictException('MFA is already enabled'));

        await expect(controller.enableMfa(mockAccount.id, {})).rejects.toThrow(ConflictException);
      });
    });

    describe('verifyMfa', () => {
      it('should verify MFA code', async () => {
        service.verifyAndCompleteMfaSetup.mockResolvedValue(undefined);

        await expect(
          controller.verifyMfa(mockAccount.id, { code: '123456' }),
        ).resolves.not.toThrow();

        expect(service.verifyAndCompleteMfaSetup).toHaveBeenCalledWith(mockAccount.id, '123456');
      });

      it('should throw BadRequestException for invalid code', async () => {
        service.verifyAndCompleteMfaSetup.mockRejectedValue(
          new BadRequestException('Invalid verification code'),
        );

        await expect(controller.verifyMfa(mockAccount.id, { code: '000000' })).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('disableMfa', () => {
      it('should disable MFA', async () => {
        service.disableMfa.mockResolvedValue(undefined);

        await expect(controller.disableMfa(mockAccount.id)).resolves.not.toThrow();
        expect(service.disableMfa).toHaveBeenCalledWith(mockAccount.id);
      });

      it('should throw BadRequestException if MFA not enabled', async () => {
        service.disableMfa.mockRejectedValue(new BadRequestException('MFA is not enabled'));

        await expect(controller.disableMfa(mockAccount.id)).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('updateStatus', () => {
    it('should update account status', async () => {
      const updatedAccount = { ...mockAccount, status: 'SUSPENDED' };
      service.updateStatus.mockResolvedValue(updatedAccount as never);

      const result = await controller.updateStatus(mockAccount.id, AccountStatus.SUSPENDED);

      expect(result.status).toBe('SUSPENDED');
      expect(service.updateStatus).toHaveBeenCalledWith(mockAccount.id, AccountStatus.SUSPENDED);
    });

    it('should throw NotFoundException when account not found', async () => {
      service.updateStatus.mockRejectedValue(new NotFoundException('Account not found'));

      await expect(controller.updateStatus('nonexistent-id', AccountStatus.ACTIVE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
