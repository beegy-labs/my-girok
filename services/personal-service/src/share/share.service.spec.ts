import { Test, TestingModule } from '@nestjs/testing';
import { ShareService } from './share.service';
import { PrismaService } from '../database/prisma.service';
import { ResumeService } from '../resume/resume.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('ShareService', () => {
  let service: ShareService;

  const mockPrismaService = {
    shareLink: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockResumeService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ResumeService, useValue: mockResumeService },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createResumeShare', () => {
    it('should create a share link with expiration', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceId = 'resume-123';
      const createDto = {
        duration: '1week' as const,
      };

      const mockShareLink = {
        id: 'share-123',
        token: 'unique-token-xyz',
        resourceType: 'RESUME',
        resourceId,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.shareLink.create.mockResolvedValue(mockShareLink);

      // Act
      const result = await service.createResumeShare(
        userId,
        resourceId,
        createDto,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.token).toBe('unique-token-xyz');
      expect(result.expiresAt).toBeDefined();
      expect(mockPrismaService.shareLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceType: 'RESUME',
          resourceId,
          userId,
          isActive: true,
        }),
      });
    });

    it('should create permanent share link when duration is permanent', async () => {
      // Arrange
      const userId = 'user-456';
      const resourceId = 'resume-456';
      const createDto = {
        duration: 'permanent' as const,
      };

      const mockShareLink = {
        id: 'share-456',
        token: 'permanent-token',
        resourceType: 'RESUME',
        resourceId,
        userId,
        expiresAt: null,
        isActive: true,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.shareLink.create.mockResolvedValue(mockShareLink);

      // Act
      const result = await service.createResumeShare(
        userId,
        resourceId,
        createDto,
      );

      // Assert
      expect(result.expiresAt).toBeNull();
      expect(mockPrismaService.shareLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: null,
        }),
      });
    });

    it('should throw BadRequestException if active share link already exists', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceId = 'resume-123';
      const createDto = {
        duration: '1week' as const,
      };

      const existingShareLink = {
        id: 'existing-share',
        token: 'existing-token',
        resourceType: 'RESUME',
        resourceId,
        userId,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.shareLink.findFirst.mockResolvedValue(
        existingShareLink,
      );

      // Act & Assert
      await expect(
        service.createResumeShare(userId, resourceId, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createResumeShare(userId, resourceId, createDto),
      ).rejects.toThrow('Active share link already exists');
    });
  });

  describe('getPublicResume', () => {
    it('should return resume for valid active token', async () => {
      // Arrange
      const token = 'valid-token-xyz';
      const mockShareLink = {
        id: 'share-123',
        token,
        resourceType: 'RESUME',
        resourceId: 'resume-123',
        userId: 'user-123',
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        viewCount: 5,
        lastViewedAt: new Date(),
      };

      const mockResume = {
        id: 'resume-123',
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        sections: [
          { type: 'SKILLS', visible: true, order: 0 },
          { type: 'EXPERIENCE', visible: false, order: 1 },
        ],
        skills: [{ name: 'TypeScript', category: 'LANGUAGE' }],
        experiences: [],
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(mockShareLink);
      mockResumeService.findById.mockResolvedValue(mockResume);
      mockPrismaService.shareLink.update.mockResolvedValue({
        ...mockShareLink,
        viewCount: 6,
      });

      // Act
      const result = await service.getPublicResume(token);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('resume-123');
      expect(result.sections).toHaveLength(1); // Only visible sections
      expect(result.sections[0].type).toBe('SKILLS');
      expect(mockPrismaService.shareLink.update).toHaveBeenCalledWith({
        where: { id: mockShareLink.id },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException for non-existent token', async () => {
      // Arrange
      const token = 'nonexistent-token';
      mockPrismaService.shareLink.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPublicResume(token)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPublicResume(token)).rejects.toThrow(
        'Share link not found',
      );
    });

    it('should throw ForbiddenException for inactive share link', async () => {
      // Arrange
      const token = 'inactive-token';
      const mockShareLink = {
        id: 'share-123',
        token,
        resourceType: 'RESUME',
        resourceId: 'resume-123',
        userId: 'user-123',
        isActive: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(mockShareLink);

      // Act & Assert
      await expect(service.getPublicResume(token)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getPublicResume(token)).rejects.toThrow(
        'Share link is deactivated',
      );
    });

    it('should throw ForbiddenException for expired share link', async () => {
      // Arrange
      const token = 'expired-token';
      const mockShareLink = {
        id: 'share-123',
        token,
        resourceType: 'RESUME',
        resourceId: 'resume-123',
        userId: 'user-123',
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(mockShareLink);

      // Act & Assert
      await expect(service.getPublicResume(token)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getPublicResume(token)).rejects.toThrow(
        'Share link has expired',
      );
    });

    it('should allow access to permanent share links without expiration', async () => {
      // Arrange
      const token = 'permanent-token';
      const mockShareLink = {
        id: 'share-456',
        token,
        resourceType: 'RESUME',
        resourceId: 'resume-456',
        userId: 'user-456',
        isActive: true,
        expiresAt: null,
        viewCount: 100,
      };

      const mockResume = {
        id: 'resume-456',
        userId: 'user-456',
        name: 'Jane Doe',
        sections: [],
        skills: [],
        experiences: [],
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(mockShareLink);
      mockResumeService.findById.mockResolvedValue(mockResume);
      mockPrismaService.shareLink.update.mockResolvedValue({
        ...mockShareLink,
        viewCount: 101,
      });

      // Act
      const result = await service.getPublicResume(token);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('resume-456');
    });
  });

  describe('getUserShareLinks', () => {
    it('should return all share links for user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockShareLinks = [
        {
          id: 'share-1',
          token: 'token-1',
          resourceType: 'RESUME',
          resourceId: 'resume-123',
          userId,
          isActive: true,
          viewCount: 10,
          createdAt: new Date(),
        },
        {
          id: 'share-2',
          token: 'token-2',
          resourceType: 'RESUME',
          resourceId: 'resume-456',
          userId,
          isActive: false,
          viewCount: 5,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.shareLink.findMany.mockResolvedValue(mockShareLinks);

      // Act
      const result = await service.getUserShareLinks(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].token).toBe('token-1');
      expect(mockPrismaService.shareLink.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateShareLink', () => {
    it('should update share link activation status', async () => {
      // Arrange
      const userId = 'user-123';
      const shareLinkId = 'share-123';
      const updateDto = {
        isActive: false,
      };

      const existingShareLink = {
        id: shareLinkId,
        token: 'token-xyz',
        userId,
        isActive: true,
      };

      const updatedShareLink = {
        ...existingShareLink,
        isActive: false,
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(
        existingShareLink,
      );
      mockPrismaService.shareLink.update.mockResolvedValue(updatedShareLink);

      // Act
      const result = await service.updateShareLink(
        userId,
        shareLinkId,
        updateDto,
      );

      // Assert
      expect(result.isActive).toBe(false);
      expect(mockPrismaService.shareLink.update).toHaveBeenCalledWith({
        where: { id: shareLinkId },
        data: updateDto,
      });
    });

    it('should throw ForbiddenException when updating another user share link', async () => {
      // Arrange
      const userId = 'user-123';
      const shareLinkId = 'share-456';
      const updateDto = {
        isActive: true,
      };

      const existingShareLink = {
        id: shareLinkId,
        token: 'token-xyz',
        userId: 'different-user-789',
        isActive: false,
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(
        existingShareLink,
      );

      // Act & Assert
      await expect(
        service.updateShareLink(userId, shareLinkId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteShareLink', () => {
    it('should delete share link for owner', async () => {
      // Arrange
      const userId = 'user-123';
      const shareLinkId = 'share-123';

      const existingShareLink = {
        id: shareLinkId,
        token: 'token-xyz',
        userId,
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(
        existingShareLink,
      );
      mockPrismaService.shareLink.delete.mockResolvedValue(existingShareLink);

      // Act
      await service.deleteShareLink(userId, shareLinkId);

      // Assert
      expect(mockPrismaService.shareLink.delete).toHaveBeenCalledWith({
        where: { id: shareLinkId },
      });
    });

    it('should throw ForbiddenException when deleting another user share link', async () => {
      // Arrange
      const userId = 'user-123';
      const shareLinkId = 'share-456';

      const existingShareLink = {
        id: shareLinkId,
        token: 'token-xyz',
        userId: 'different-user-789',
      };

      mockPrismaService.shareLink.findUnique.mockResolvedValue(
        existingShareLink,
      );

      // Act & Assert
      await expect(
        service.deleteShareLink(userId, shareLinkId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
