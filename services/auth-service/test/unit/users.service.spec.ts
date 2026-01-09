import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';

import { UsersService } from '../../src/users/users.service';
import { IdentityGrpcClient } from '@my-girok/nest-common';
import { resetTestCounter } from '../utils/test-factory';

describe('UsersService', () => {
  let service: UsersService;
  let mockIdentityClient: {
    getAccount: Mock;
    getAccountByEmail: Mock;
    getAccountByUsername: Mock;
    updateAccount: Mock;
    validatePassword: Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';

  const mockAccount = {
    id: userId,
    email: 'test@example.com',
    username: 'testuser',
    status: 1, // ACTIVE
    email_verified: true,
    created_at: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
    updated_at: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
  };

  beforeEach(async () => {
    resetTestCounter();

    mockIdentityClient = {
      getAccount: vi.fn(),
      getAccountByEmail: vi.fn(),
      getAccountByUsername: vi.fn(),
      updateAccount: vi.fn(),
      validatePassword: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user without password', async () => {
      // Arrange
      mockIdentityClient.getAccount.mockResolvedValue({ account: mockAccount });

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.emailVerified).toBe(true);
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockIdentityClient.getAccount.mockResolvedValue({ account: null });

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when gRPC returns NOT_FOUND', async () => {
      // Arrange
      const grpcError = Object.assign(new Error('Not found'), { code: GrpcStatus.NOT_FOUND });
      mockIdentityClient.getAccount.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      mockIdentityClient.getAccountByEmail.mockResolvedValue({ account: mockAccount });

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result.email).toBe('test@example.com');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockIdentityClient.getAccountByEmail.mockResolvedValue({ account: null });

      // Act & Assert
      await expect(service.findByEmail('unknown@example.com')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when gRPC returns NOT_FOUND', async () => {
      // Arrange
      const grpcError = Object.assign(new Error('Not found'), { code: GrpcStatus.NOT_FOUND });
      mockIdentityClient.getAccountByEmail.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.findByEmail('unknown@example.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should return user by username', async () => {
      // Arrange
      mockIdentityClient.getAccountByUsername.mockResolvedValue({ account: mockAccount });

      // Act
      const result = await service.findByUsername('testuser');

      // Assert
      expect(result.username).toBe('testuser');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockIdentityClient.getAccountByUsername.mockResolvedValue({ account: null });

      // Act & Assert
      await expect(service.findByUsername('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when gRPC returns NOT_FOUND', async () => {
      // Arrange
      const grpcError = Object.assign(new Error('Not found'), { code: GrpcStatus.NOT_FOUND });
      mockIdentityClient.getAccountByUsername.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.findByUsername('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile via gRPC', async () => {
      // Arrange
      mockIdentityClient.updateAccount.mockResolvedValue({ account: mockAccount });

      // Act
      const result = await service.updateProfile(userId, { name: 'Updated Name' });

      // Assert
      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found during update', async () => {
      // Arrange
      mockIdentityClient.updateAccount.mockResolvedValue({ account: null });

      // Act & Assert
      await expect(service.updateProfile(userId, { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when gRPC returns NOT_FOUND', async () => {
      // Arrange
      const grpcError = Object.assign(new Error('Not found'), { code: GrpcStatus.NOT_FOUND });
      mockIdentityClient.updateAccount.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(
        service.updateProfile(userId, { avatar: 'https://example.com/avatar.jpg' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException when password change is requested', async () => {
      // Arrange - Password validation passes but change is not supported
      mockIdentityClient.validatePassword.mockResolvedValue({ valid: true });

      // Act & Assert - Password change must go through identity-service
      await expect(
        service.changePassword(userId, 'current-password', 'new-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      // Arrange
      mockIdentityClient.validatePassword.mockResolvedValue({ valid: false });

      // Act & Assert
      await expect(
        service.changePassword(userId, 'wrong-password', 'new-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when user not found during password validation', async () => {
      // Arrange
      const grpcError = Object.assign(new Error('Not found'), { code: GrpcStatus.NOT_FOUND });
      mockIdentityClient.validatePassword.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.changePassword(userId, 'current', 'new')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('mapAccountToUser', () => {
    it('should correctly map account timestamps', async () => {
      // Arrange
      const accountWithTimestamps = {
        ...mockAccount,
        created_at: { seconds: 1704067200, nanos: 0 }, // 2024-01-01 00:00:00 UTC
        updated_at: { seconds: 1704153600, nanos: 0 }, // 2024-01-02 00:00:00 UTC
      };
      mockIdentityClient.getAccount.mockResolvedValue({ account: accountWithTimestamps });

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle missing timestamps', async () => {
      // Arrange
      const accountWithoutTimestamps = {
        ...mockAccount,
        created_at: undefined,
        updated_at: undefined,
      };
      mockIdentityClient.getAccount.mockResolvedValue({ account: accountWithoutTimestamps });

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });
});
