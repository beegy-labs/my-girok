import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { resetTestCounter } from '../utils/test-factory';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    findById: Mock;
    findByUsername: Mock;
    updateProfile: Mock;
    changePassword: Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';

  // New user structure after gRPC migration (no name, avatar, role - those are in Profile)
  const mockUser = {
    id: userId,
    email: 'test@example.com',
    username: 'testuser',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockUsersService = {
      findById: vi.fn(),
      findByUsername: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserByUsername', () => {
    it('should return user by username', async () => {
      // Arrange
      mockUsersService.findByUsername.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getUserByUsername('testuser');

      // Assert
      expect(result.username).toBe('testuser');
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      // Arrange
      const currentUser = { id: userId };
      mockUsersService.findById.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getProfile(currentUser);

      // Assert
      expect(result.id).toBe(userId);
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfile', () => {
    it('should call updateProfile with correct params', async () => {
      // Arrange
      const currentUser = { id: userId };
      const data = { name: 'Updated Name' };
      // Note: Profile fields like name/avatar are now in identity-service Profile model
      // The updateProfile returns account data, not profile data
      mockUsersService.updateProfile.mockResolvedValue(mockUser);

      // Act
      const result = await controller.updateProfile(currentUser, data);

      // Assert
      expect(result.id).toBe(userId);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should handle avatar update request', async () => {
      // Arrange
      const currentUser = { id: userId };
      const data = { avatar: 'https://example.com/avatar.jpg' };
      mockUsersService.updateProfile.mockResolvedValue(mockUser);

      // Act
      const result = await controller.updateProfile(currentUser, data);

      // Assert
      expect(result.id).toBe(userId);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(userId, data);
    });
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException as password change goes through identity-service', async () => {
      // Arrange
      const currentUser = { id: userId };
      const dto = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
      };
      // Password change is now handled by identity-service, so this throws
      mockUsersService.changePassword.mockRejectedValue(
        new UnauthorizedException('Password change must be performed through identity-service'),
      );

      // Act & Assert
      await expect(controller.changePassword(currentUser, dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        userId,
        dto.currentPassword,
        dto.newPassword,
      );
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      // Arrange
      const currentUser = { id: userId };
      const dto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword456!',
      };
      mockUsersService.changePassword.mockRejectedValue(
        new UnauthorizedException('Current password is incorrect'),
      );

      // Act & Assert
      await expect(controller.changePassword(currentUser, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
