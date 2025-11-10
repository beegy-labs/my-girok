import { Test, TestingModule } from '@nestjs/testing';
import { ResumeService } from './resume.service';
import { PrismaService } from '../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { NotFoundException } from '@nestjs/common';
import { SectionType } from './dto/update-section-order.dto';
import { of } from 'rxjs';

describe('ResumeService', () => {
  let service: ResumeService;

  const mockHttpService = {
    get: jest.fn(() => of({ data: { id: 'user-123' } })),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'AUTH_SERVICE_URL') return 'http://auth-service:4001';
      return null;
    }),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    uploadWithGrayscale: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockPrismaService = {
    resume: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    resumeSection: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    skill: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    experience: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    experienceRole: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    experienceTask: {
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
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StorageService, useValue: mockStorageService },
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
        title: '대기업용 이력서',
        description: '네이버, 카카오 지원용',
        isDefault: false,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '010-1234-5678',
        summary: 'Experienced developer',
        skills: [{ category: 'Language', items: ['TypeScript'], order: 0, visible: true }],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      const mockResume = {
        id: 'resume-123',
        userId,
        title: createDto.title,
        description: createDto.description,
        isDefault: createDto.isDefault,
        name: createDto.name,
        email: createDto.email,
        phone: createDto.phone,
        summary: createDto.summary,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [],
        skills: [{ id: 'skill-1', resumeId: 'resume-123', ...createDto.skills[0] }],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
        militaryService: null,
        militaryDischarge: null,
        coverLetter: null,
        careerGoals: null,
        paperSize: 'A4',
        github: null,
        blog: null,
        linkedin: null,
        portfolio: null,
        profileImage: null,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.resume.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.resume.create.mockResolvedValue(mockResume);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.title).toBe(createDto.title);
      expect(result.name).toBe(createDto.name);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should unset other default resumes when creating new default resume', async () => {
      // Arrange
      const userId = 'user-456';
      const createDto = {
        title: '스타트업용',
        isDefault: true,
        name: 'Jane Doe',
        email: 'jane@example.com',
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
      mockPrismaService.resume.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.resume.create.mockResolvedValue(mockResume);

      // Act
      await service.create(userId, createDto);

      // Assert
      expect(mockPrismaService.resume.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('findAllByUserId', () => {
    it('should return all resumes for valid user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResumes = [
        {
          id: 'resume-1',
          userId,
          title: '대기업용',
          isDefault: true,
          name: 'Test User',
          email: 'test@example.com',
          sections: [],
          skills: [],
          experiences: [],
          projects: [],
          educations: [],
          certificates: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'resume-2',
          userId,
          title: '스타트업용',
          isDefault: false,
          name: 'Test User',
          email: 'test@example.com',
          sections: [],
          skills: [],
          experiences: [],
          projects: [],
          educations: [],
          certificates: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.resume.findMany.mockResolvedValue(mockResumes);

      // Act
      const result = await service.findAllByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
      expect(mockPrismaService.resume.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return specific resume for valid user', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'resume-123';
      const mockResume = {
        id: resumeId,
        userId,
        title: '대기업용',
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
      const result = await service.findByIdAndUserId(resumeId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(resumeId);
      expect(result.userId).toBe(userId);
    });

    it('should throw NotFoundException when resume does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'nonexistent';
      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByIdAndUserId(resumeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update resume with transaction', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'resume-123';
      const updateDto = {
        title: 'Updated Title',
        name: 'Updated Name',
        email: 'updated@example.com',
        skills: [{ category: 'Framework', items: ['React'], order: 0, visible: true }],
      };

      const existingResume = {
        id: resumeId,
        userId,
        title: 'Old Title',
        name: 'Old Name',
        email: 'old@example.com',
      };

      const updatedResume = {
        id: resumeId,
        userId,
        title: updateDto.title,
        name: updateDto.name,
        email: updateDto.email,
        sections: [],
        skills: [{ id: 'skill-1', resumeId, ...updateDto.skills[0] }],
        experiences: [],
        projects: [],
        educations: [],
        certificates: [],
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(existingResume);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.resume.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.resume.update.mockResolvedValue(updatedResume);
      mockPrismaService.resume.findUnique.mockResolvedValue(updatedResume);
      mockPrismaService.skill.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.skill.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await service.update(resumeId, userId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(result?.title).toBe(updateDto.title);
      expect(result?.name).toBe(updateDto.name);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent resume', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'nonexistent';
      const updateDto = {
        name: 'Test',
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(resumeId, userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete resume for valid user', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'resume-123';
      const mockResume = {
        id: resumeId,
        userId,
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(mockResume);
      mockPrismaService.resume.delete.mockResolvedValue(mockResume);

      // Act
      await service.delete(resumeId, userId);

      // Assert
      expect(mockPrismaService.resume.delete).toHaveBeenCalledWith({
        where: { id: resumeId },
      });
    });

    it('should throw NotFoundException when deleting non-existent resume', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'nonexistent';
      mockPrismaService.resume.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(resumeId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSectionOrder', () => {
    it('should update section order', async () => {
      // Arrange
      const userId = 'user-123';
      const resumeId = 'resume-123';
      const dto = { type: SectionType.SKILLS, order: 2 };

      const mockResume = {
        id: resumeId,
        userId,
      };

      mockPrismaService.resume.findFirst.mockResolvedValue(mockResume);
      mockPrismaService.resumeSection.update.mockResolvedValue({ id: 'section-1', ...dto });

      // Act
      await service.updateSectionOrder(resumeId, userId, dto);

      // Assert
      expect(mockPrismaService.resumeSection.update).toHaveBeenCalledWith({
        where: {
          resumeId_type: {
            resumeId,
            type: dto.type,
          },
        },
        data: {
          order: dto.order,
        },
      });
    });
  });
});
