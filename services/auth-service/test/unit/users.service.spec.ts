import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../../src/users/users.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { resetTestCounter } from '../utils/test-factory';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: MockPrismaService;

  const userId = '00000000-0000-7000-0000-000000000001';

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed-password',
    name: 'Test User',
    avatar: null,
    role: 'USER',
    provider: 'LOCAL',
    providerId: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalId: 'ext-123',
    accountMode: 'SERVICE',
    countryCode: 'KR',
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user without password', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result.email).toBe('test@example.com');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByEmail('unknown@example.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should return user by username', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByUsername('testuser');

      // Assert
      expect(result.username).toBe('testuser');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByUsername('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateProfile(userId, { name: 'Updated Name' });

      // Assert
      expect(result.name).toBe('Updated Name');
      expect((result as any).password).toBeUndefined();
    });

    it('should update user avatar', async () => {
      // Arrange
      const updatedUser = { ...mockUser, avatar: 'https://example.com/avatar.jpg' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateProfile(userId, {
        avatar: 'https://example.com/avatar.jpg',
      });

      // Assert
      expect(result.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should update both name and avatar', async () => {
      // Arrange
      const updatedUser = {
        ...mockUser,
        name: 'New Name',
        avatar: 'https://example.com/new-avatar.jpg',
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateProfile(userId, {
        name: 'New Name',
        avatar: 'https://example.com/new-avatar.jpg',
      });

      // Assert
      expect(result.name).toBe('New Name');
      expect(result.avatar).toBe('https://example.com/new-avatar.jpg');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, password: 'new-hashed-password' });

      // Act
      const result = await service.changePassword(userId, 'current-password', 'new-password');

      // Assert
      expect(result.message).toBe('Password changed successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'new-hashed-password' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.changePassword(userId, 'current', 'new')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException for OAuth users', async () => {
      // Arrange
      const oauthUser = { ...mockUser, password: null, provider: 'GOOGLE' };
      mockPrisma.user.findUnique.mockResolvedValue(oauthUser);

      // Act & Assert
      await expect(service.changePassword(userId, 'current', 'new')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword(userId, 'wrong-password', 'new-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
