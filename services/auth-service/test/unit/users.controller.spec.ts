import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { resetTestCounter } from '../utils/test-factory';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    findById: jest.Mock;
    findByUsername: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatar: null,
    role: 'USER',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockUsersService = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    it('should update user name', async () => {
      // Arrange
      const currentUser = { id: userId };
      const data = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.updateProfile(currentUser, data);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should update user avatar', async () => {
      // Arrange
      const currentUser = { id: userId };
      const data = { avatar: 'https://example.com/avatar.jpg' };
      const updatedUser = { ...mockUser, avatar: data.avatar };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.updateProfile(currentUser, data);

      // Assert
      expect(result.avatar).toBe(data.avatar);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      const currentUser = { id: userId };
      const dto = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
      };
      mockUsersService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      });

      // Act
      const result = await controller.changePassword(currentUser, dto);

      // Assert
      expect(result.message).toBe('Password changed successfully');
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        userId,
        dto.currentPassword,
        dto.newPassword,
      );
    });
  });
});
