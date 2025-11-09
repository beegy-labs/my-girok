import { Test, TestingModule } from '@nestjs/testing';
import { ResumeService } from './resume.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ResumeService', () => {
  let service: ResumeService;

  const mockPrismaService = {
    resume: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    resumeSection: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    skill: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    experience: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    project: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    education: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    certificate: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new resume with all sections', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '010-1234-5678',
        address: 'Seoul, Korea',
        summary: 'Experienced developer',
        skills: [{ name: 'TypeScript', category: 'LANGUAGE' as const }],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      const mockResume = {
        id: 'resume-123',
        userId,
        name: createDto.name,
        email: createDto.email,
        phone: createDto.phone,
        address: createDto.address,
        summary: createDto.summary,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [],
        skills: [{ id: 'skill-1', resumeId: 'resume-123', ...createDto.skills[0] }],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.resume.create.mockResolvedValue(mockResume);
      mockPrismaService.resumeSection.createMany.mockResolvedValue({ count: 5 });
      mockPrismaService.skill.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.name).toBe(createDto.name);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          name: createDto.name,
          email: createDto.email,
        }),
        include: expect.any(Object),
      });
    });

    it('should create resume with empty sections array when no sections provided', async () => {
      // Arrange
      const userId = 'user-456';
      const createDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        address: null,
        summary: null,
        skills: [],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      const mockResume = {
        id: 'resume-456',
        userId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.resume.create.mockResolvedValue(mockResume);
      mockPrismaService.resumeSection.createMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(mockPrismaService.resumeSection.createMany).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should return resume for valid user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResume = {
        id: 'resume-123',
        userId,
        name: 'Test User',
        email: 'test@example.com',
        sections: [],
        skills: [],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(mockResume);

      // Act
      const result = await service.findByUserId(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(mockPrismaService.resume.findFirst).toHaveBeenCalledWith({
        where: { userId },
        include: expect.objectContaining({
          sections: expect.any(Object),
          skills: true,
          experiences: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when resume does not exist', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByUserId(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByUserId(userId)).rejects.toThrow(
        'Resume not found',
      );
    });
  });

  describe('update', () => {
    it('should update resume with transaction', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
        skills: [{ name: 'React', category: 'FRAMEWORK' as const }],
      };

      const existingResume = {
        id: 'resume-123',
        userId,
        name: 'Old Name',
        email: 'old@example.com',
      };

      const updatedResume = {
        id: 'resume-123',
        userId,
        name: updateDto.name,
        email: updateDto.email,
        sections: [],
        skills: [{ id: 'skill-1', resumeId: 'resume-123', ...updateDto.skills[0] }],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(existingResume);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.resume.update.mockResolvedValue(updatedResume);
      mockPrismaService.skill.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.skill.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await service.update(userId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.resume.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent resume', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      const updateDto = {
        name: 'Test',
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete resume for valid user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResume = {
        id: 'resume-123',
        userId,
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(mockResume);
      mockPrismaService.resume.delete.mockResolvedValue(mockResume);

      // Act
      await service.delete(userId);

      // Assert
      expect(mockPrismaService.resume.delete).toHaveBeenCalledWith({
        where: { id: mockResume.id },
      });
    });

    it('should throw NotFoundException when deleting non-existent resume', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSectionOrder', () => {
    it('should update section visibility and order', async () => {
      // Arrange
      const userId = 'user-123';
      const sections = [
        { type: 'SKILLS' as const, visible: true, order: 0 },
        { type: 'EXPERIENCE' as const, visible: false, order: 1 },
      ];

      const mockResume = {
        id: 'resume-123',
        userId,
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(mockResume);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.resumeSection.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.resumeSection.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.updateSectionOrder(userId, sections);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.resumeSection.deleteMany).toHaveBeenCalledWith({
        where: { resumeId: mockResume.id },
      });
      expect(mockPrismaService.resumeSection.createMany).toHaveBeenCalledWith({
        data: sections.map((s) => ({
          resumeId: mockResume.id,
          type: s.type,
          visible: s.visible,
          order: s.order,
        })),
      });
    });
  });
});
