import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import { ResumeService } from '../../src/resume/resume.service';
import { PrismaService } from '../../src/database/prisma.service';
import { StorageService } from '../../src/storage/storage.service';
import { FileCopyService } from '../../src/queue/services/file-copy.service';
import { CopyStatus } from '../../node_modules/.prisma/personal-client';

describe('ResumeService', () => {
  let service: ResumeService;
  let prisma: {
    resume: any;
    resumeSection: any;
    resumeAttachment: any;
    skill: any;
    experience: any;
    education: any;
    certificate: any;
    projectAchievement: any;
    $transaction: MockInstance;
  };
  let httpService: {
    get: MockInstance;
  };
  let _configService: {
    get: MockInstance;
  };
  let storageService: {
    uploadFile: MockInstance;
    moveFromTemp: MockInstance;
    deleteFile: MockInstance;
    copyFile: MockInstance;
  };
  let fileCopyService: {
    queueAttachmentCopy: MockInstance;
    getJobStatus: MockInstance;
  };
  let cache: {
    get: MockInstance;
    set: MockInstance;
    del: MockInstance;
  };

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    description: 'My resume',
    isDefault: true,
    paperSize: 'A4',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    github: 'https://github.com/johndoe',
    blog: 'https://blog.johndoe.com',
    linkedin: 'https://linkedin.com/in/johndoe',
    portfolio: 'https://johndoe.com',
    summary: 'Experienced software engineer',
    keyAchievements: ['Led team of 5', 'Built scalable systems'],
    profileImage: 'https://example.com/image.jpg',
    birthDate: '1990-01-01',
    gender: 'MALE',
    militaryService: true,
    militaryDischarge: true,
    militaryRank: 'Sergeant',
    militaryDischargeType: 'HONORABLE',
    militaryServiceStartDate: '2010-01-01',
    militaryServiceEndDate: '2012-01-01',
    coverLetter: 'Cover letter',
    applicationReason: 'Reason',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [],
    skills: [],
    experiences: [],
    educations: [],
    certificates: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeService,
        {
          provide: PrismaService,
          useValue: {
            resume: {
              findMany: vi.fn(),
              findFirst: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
              delete: vi.fn(),
            },
            resumeSection: {
              createMany: vi.fn(),
              update: vi.fn(),
            },
            resumeAttachment: {
              findMany: vi.fn(),
              findFirst: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
              delete: vi.fn(),
            },
            skill: {
              deleteMany: vi.fn(),
              create: vi.fn(),
              createMany: vi.fn(),
            },
            experience: {
              deleteMany: vi.fn(),
              create: vi.fn(),
            },
            education: {
              deleteMany: vi.fn(),
              createMany: vi.fn(),
            },
            certificate: {
              deleteMany: vi.fn(),
              createMany: vi.fn(),
            },
            projectAchievement: {
              create: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'AUTH_SERVICE_URL') return 'http://auth-service:4001';
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: vi.fn(),
            moveFromTemp: vi.fn(),
            deleteFile: vi.fn(),
            copyFile: vi.fn(),
          },
        },
        {
          provide: FileCopyService,
          useValue: {
            queueAttachmentCopy: vi.fn(),
            getJobStatus: vi.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
    prisma = module.get(PrismaService);
    httpService = module.get(HttpService);
    _configService = module.get(ConfigService);
    storageService = module.get(StorageService);
    fileCopyService = module.get(FileCopyService);
    cache = module.get(CACHE_MANAGER);
  });

  describe('create', () => {
    it('should create resume successfully', async () => {
      const createDto = {
        title: 'Software Engineer Resume',
        description: 'My resume',
        isDefault: true,
        paperSize: 'A4',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        skills: [{ category: 'Programming', items: ['JavaScript', 'TypeScript'], order: 0 }],
        experiences: [
          {
            company: 'Tech Corp',
            startDate: '2020-01-01',
            endDate: '2023-01-01',
            finalPosition: 'Senior Engineer',
            jobTitle: 'Software Engineer',
            order: 0,
          },
        ],
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            create: vi.fn().mockResolvedValue(mockResume),
            findUnique: vi.fn().mockResolvedValue(mockResume),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      const result = await service.create('user-123', createDto);

      expect(result).toEqual(mockResume);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should unset other default resumes when creating default resume', async () => {
      const createDto = {
        title: 'Resume',
        isDefault: true,
        name: 'John',
        email: 'john@example.com',
      };

      const updateManySpy = vi.fn().mockResolvedValue({ count: 1 });

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            create: vi.fn().mockResolvedValue(mockResume),
            findUnique: vi.fn().mockResolvedValue(mockResume),
            updateMany: updateManySpy,
          },
        });
      });

      await service.create('user-123', createDto);

      expect(updateManySpy).toHaveBeenCalledWith({
        where: { userId: 'user-123', isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should handle profileImageTempKey during creation', async () => {
      const createDto = {
        title: 'Resume',
        name: 'John',
        email: 'john@example.com',
        profileImageTempKey: 'tmp/user-123/image-123.jpg',
      };

      storageService.moveFromTemp.mockResolvedValue({
        fileKey: 'resumes/user-123/resume-123/image.jpg',
        fileUrl: 'https://storage.example.com/image.jpg',
      });

      const updateSpy = vi.fn().mockResolvedValue(mockResume);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            create: vi.fn().mockResolvedValue(mockResume),
            findUnique: vi.fn().mockResolvedValue(mockResume),
            update: updateSpy,
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      await service.create('user-123', createDto);

      expect(storageService.moveFromTemp).toHaveBeenCalledWith(
        'tmp/user-123/image-123.jpg',
        'user-123',
        'resume-123',
      );
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('findAllByUserId', () => {
    it('should return all resumes for user excluding soft-deleted', async () => {
      const resumes = [mockResume, { ...mockResume, id: 'resume-456' }];
      prisma.resume.findMany.mockResolvedValue(resumes);

      const result = await service.findAllByUserId('user-123');

      expect(result).toHaveLength(2);
      expect(prisma.resume.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', deletedAt: null },
        include: expect.any(Object),
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should sanitize salary info when showSalary is false', async () => {
      const resumeWithSalary = {
        ...mockResume,
        experiences: [
          {
            id: 'exp-1',
            company: 'Tech Corp',
            showSalary: false,
            salary: 100000,
            salaryUnit: 'USD',
          },
        ],
      };
      prisma.resume.findMany.mockResolvedValue([resumeWithSalary]);

      const result = await service.findAllByUserId('user-123');

      expect(result[0].experiences[0]).not.toHaveProperty('salary');
      expect(result[0].experiences[0]).not.toHaveProperty('salaryUnit');
      expect(result[0].experiences[0]).not.toHaveProperty('showSalary');
    });
  });

  describe('getDefaultResume', () => {
    it('should return default resume', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      const result = await service.getDefaultResume('user-123');

      expect(result).toEqual(mockResume);
      expect(prisma.resume.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123', deletedAt: null },
        include: expect.any(Object),
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should throw NotFoundException when no resume found', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.getDefaultResume('user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return resume by id and userId', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      const result = await service.findByIdAndUserId('resume-123', 'user-123');

      expect(result).toEqual(mockResume);
      expect(prisma.resume.findFirst).toHaveBeenCalledWith({
        where: { id: 'resume-123', userId: 'user-123', deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when resume not found', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.findByIdAndUserId('resume-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update resume successfully', async () => {
      const updateDto = {
        title: 'Updated Resume',
        description: 'Updated description',
      };

      prisma.resume.findFirst.mockResolvedValue(mockResume);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            update: vi.fn().mockResolvedValue({ ...mockResume, ...updateDto }),
            findUnique: vi.fn().mockResolvedValue({ ...mockResume, ...updateDto }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          skill: { deleteMany: vi.fn() },
          experience: { deleteMany: vi.fn() },
          education: { deleteMany: vi.fn() },
          certificate: { deleteMany: vi.fn() },
        });
      });

      const result = await service.update('resume-123', 'user-123', updateDto);

      expect(result.title).toBe('Updated Resume');
    });

    it('should throw NotFoundException when resume not found', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.update('resume-123', 'user-123', { title: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle errors and throw InternalServerErrorException', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(service.update('resume-123', 'user-123', { title: 'Updated' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete resume', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resume.update.mockResolvedValue({ ...mockResume, deletedAt: new Date() });

      const result = await service.delete('resume-123', 'user-123');

      expect(result).toEqual({ message: 'Resume deleted successfully' });
      expect(prisma.resume.update).toHaveBeenCalledWith({
        where: { id: 'resume-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when resume not found', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.delete('resume-123', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('copyResume', () => {
    it('should copy resume successfully without attachments', async () => {
      const originalResume = {
        ...mockResume,
        attachments: [],
      };

      prisma.resume.findUnique.mockResolvedValue(originalResume);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            create: vi.fn().mockResolvedValue({ ...mockResume, id: 'resume-456' }),
          },
          resumeSection: { createMany: vi.fn() },
          skill: { create: vi.fn() },
          experience: { create: vi.fn() },
          education: { createMany: vi.fn() },
          certificate: { createMany: vi.fn() },
        });
      });

      prisma.resume.findUnique
        .mockResolvedValueOnce(originalResume)
        .mockResolvedValueOnce({ ...mockResume, id: 'resume-456' });

      const result = await service.copyResume('resume-123', 'user-123');

      expect(result.id).toBe('resume-456');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should copy resume with attachments and queue file copy job', async () => {
      const originalResume = {
        ...mockResume,
        attachments: [
          {
            id: 'att-1',
            type: 'PROFILE_PHOTO',
            fileName: 'photo.jpg',
            fileKey: 'resumes/user-123/resume-123/photo.jpg',
            fileSize: 1024,
            mimeType: 'image/jpeg',
            isProcessed: true,
            originalUrl: null,
            title: 'Photo',
            description: 'Profile photo',
            order: 0,
            visible: true,
          },
        ],
      };

      prisma.resume.findUnique.mockResolvedValue(originalResume);
      fileCopyService.queueAttachmentCopy.mockResolvedValue('job-123');

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            create: vi.fn().mockResolvedValue({
              ...mockResume,
              id: 'resume-456',
              copyStatus: CopyStatus.PENDING,
            }),
          },
          resumeSection: { createMany: vi.fn() },
          skill: { create: vi.fn() },
          experience: { create: vi.fn() },
          education: { createMany: vi.fn() },
          certificate: { createMany: vi.fn() },
        });
      });

      prisma.resume.findUnique
        .mockResolvedValueOnce(originalResume)
        .mockResolvedValueOnce({ ...mockResume, id: 'resume-456' });

      prisma.resume.update.mockResolvedValue({
        ...mockResume,
        id: 'resume-456',
        copyJobId: 'job-123',
      });

      await service.copyResume('resume-123', 'user-123');

      expect(fileCopyService.queueAttachmentCopy).toHaveBeenCalled();
      expect(prisma.resume.update).toHaveBeenCalledWith({
        where: { id: 'resume-456' },
        data: { copyJobId: 'job-123' },
      });
    });

    it('should throw NotFoundException when resume not found', async () => {
      prisma.resume.findUnique.mockResolvedValue(null);

      await expect(service.copyResume('resume-123', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefaultResume', () => {
    it('should set resume as default', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resume: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({ ...mockResume, isDefault: true }),
          },
        });
      });

      const result = await service.setDefaultResume('resume-123', 'user-123');

      expect(result.isDefault).toBe(true);
    });
  });

  describe('getPublicResumeByUsername', () => {
    it('should return public resume by username from cache', async () => {
      cache.get.mockResolvedValue('user-123');
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      const result = await service.getPublicResumeByUsername('johndoe');

      expect(result).toEqual(mockResume);
      expect(cache.get).toHaveBeenCalled();
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should fetch userId from auth-service when not in cache', async () => {
      cache.get.mockResolvedValue(null);
      httpService.get.mockReturnValue(of({ data: { id: 'user-123' } }));
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      const result = await service.getPublicResumeByUsername('johndoe');

      expect(result).toEqual(mockResume);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://auth-service:4001/v1/users/by-username/johndoe',
      );
      expect(cache.set).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid username format', async () => {
      await expect(service.getPublicResumeByUsername('ab')).rejects.toThrow(BadRequestException);
      await expect(service.getPublicResumeByUsername('user@invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when user not found in auth-service', async () => {
      cache.get.mockResolvedValue(null);
      httpService.get.mockReturnValue(throwError(() => new Error('User not found')));

      await expect(service.getPublicResumeByUsername('johndoe')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no resume found', async () => {
      cache.get.mockResolvedValue('user-123');
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.getPublicResumeByUsername('johndoe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAttachment', () => {
    it('should upload attachment successfully', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      storageService.uploadFile.mockResolvedValue({
        fileKey: 'resumes/user-123/resume-123/document.pdf',
        fileUrl: 'https://storage.example.com/document.pdf',
      });

      const mockAttachment = {
        id: 'att-1',
        resumeId: 'resume-123',
        type: 'DOCUMENT',
        fileName: 'document.pdf',
        fileKey: 'resumes/user-123/resume-123/document.pdf',
        fileUrl: 'https://storage.example.com/document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          resumeAttachment: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockAttachment),
          },
        });
      });

      const result = await service.uploadAttachment('resume-123', 'user-123', mockFile, 'DOCUMENT');

      expect(result).toEqual(mockAttachment);
      expect(storageService.uploadFile).toHaveBeenCalledWith(mockFile, 'user-123', 'resume-123');
    });

    it('should cleanup file on database failure', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      storageService.uploadFile.mockResolvedValue({
        fileKey: 'resumes/user-123/resume-123/document.pdf',
        fileUrl: 'https://storage.example.com/document.pdf',
      });

      prisma.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(
        service.uploadAttachment('resume-123', 'user-123', mockFile, 'DOCUMENT'),
      ).rejects.toThrow();

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'resumes/user-123/resume-123/document.pdf',
      );
    });

    it('should handle cleanup failure gracefully', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      storageService.uploadFile.mockResolvedValue({
        fileKey: 'resumes/user-123/resume-123/document.pdf',
        fileUrl: 'https://storage.example.com/document.pdf',
      });

      prisma.$transaction.mockRejectedValue(new Error('Database error'));
      storageService.deleteFile.mockRejectedValue(new Error('Cleanup failed'));

      // Should still throw the original error even if cleanup fails
      await expect(
        service.uploadAttachment('resume-123', 'user-123', mockFile, 'DOCUMENT'),
      ).rejects.toThrow('Database error');

      expect(storageService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('getAttachments', () => {
    it('should get all attachments for a resume', async () => {
      const mockAttachments = [
        {
          id: 'att-1',
          resumeId: 'resume-123',
          type: 'PHOTO',
          fileName: 'photo.jpg',
          order: 0,
        },
        {
          id: 'att-2',
          resumeId: 'resume-123',
          type: 'DOCUMENT',
          fileName: 'document.pdf',
          order: 0,
        },
      ];

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findMany.mockResolvedValue(mockAttachments);

      const result = await service.getAttachments('resume-123', 'user-123');

      expect(result).toEqual(mockAttachments);
      expect(prisma.resumeAttachment.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-123' },
        orderBy: [{ type: 'asc' }, { order: 'asc' }],
      });
    });

    it('should verify resume ownership before getting attachments', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.getAttachments('resume-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.resumeAttachment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getAttachmentsByType', () => {
    it('should get attachments by type', async () => {
      const mockAttachments = [
        {
          id: 'att-1',
          resumeId: 'resume-123',
          type: 'PHOTO',
          fileName: 'photo1.jpg',
          order: 0,
        },
        {
          id: 'att-2',
          resumeId: 'resume-123',
          type: 'PHOTO',
          fileName: 'photo2.jpg',
          order: 1,
        },
      ];

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findMany.mockResolvedValue(mockAttachments);

      const result = await service.getAttachmentsByType('resume-123', 'user-123', 'PHOTO');

      expect(result).toEqual(mockAttachments);
      expect(prisma.resumeAttachment.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-123', type: 'PHOTO' },
        orderBy: [{ order: 'asc' }],
      });
    });

    it('should verify resume ownership before getting attachments by type', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.getAttachmentsByType('resume-123', 'user-123', 'PHOTO')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.resumeAttachment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const mockAttachment = {
        id: 'att-1',
        resumeId: 'resume-123',
        fileKey: 'resumes/user-123/resume-123/document.pdf',
        originalUrl: null,
      };

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(mockAttachment);
      prisma.resumeAttachment.delete.mockResolvedValue(mockAttachment);

      const result = await service.deleteAttachment('att-1', 'resume-123', 'user-123');

      expect(result).toEqual({ message: 'Attachment deleted successfully' });
      expect(prisma.resumeAttachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'resumes/user-123/resume-123/document.pdf',
      );
    });

    it('should throw NotFoundException when attachment not found', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(null);

      await expect(service.deleteAttachment('att-1', 'resume-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle storage deletion failure gracefully', async () => {
      const mockAttachment = {
        id: 'att-1',
        resumeId: 'resume-123',
        fileKey: 'resumes/user-123/resume-123/document.pdf',
        originalUrl: null,
      };

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(mockAttachment);
      prisma.resumeAttachment.delete.mockResolvedValue(mockAttachment);
      storageService.deleteFile.mockRejectedValue(new Error('Storage error'));

      // Should still succeed even if storage deletion fails
      const result = await service.deleteAttachment('att-1', 'resume-123', 'user-123');

      expect(result).toEqual({ message: 'Attachment deleted successfully' });
      expect(prisma.resumeAttachment.delete).toHaveBeenCalled();
    });

    it('should delete both main and original files for grayscale photos', async () => {
      const mockAttachment = {
        id: 'att-1',
        resumeId: 'resume-123',
        fileKey: 'resumes/user-123/resume-123/photo-grayscale.jpg',
        originalUrl:
          'http://storage/my-girok-resumes/resumes/user-123/resume-123/photo-original.jpg',
      };

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(mockAttachment);
      prisma.resumeAttachment.delete.mockResolvedValue(mockAttachment);
      storageService.deleteFile.mockResolvedValue(undefined);

      await service.deleteAttachment('att-1', 'resume-123', 'user-123');

      expect(storageService.deleteFile).toHaveBeenCalledTimes(2);
      expect(storageService.deleteFile).toHaveBeenNthCalledWith(
        1,
        'resumes/user-123/resume-123/photo-grayscale.jpg',
      );
      expect(storageService.deleteFile).toHaveBeenNthCalledWith(
        2,
        'resumes/user-123/resume-123/photo-original.jpg',
      );
    });

    it('should handle original file deletion failure gracefully', async () => {
      const mockAttachment = {
        id: 'att-1',
        resumeId: 'resume-123',
        fileKey: 'resumes/user-123/resume-123/photo-grayscale.jpg',
        originalUrl:
          'http://storage/my-girok-resumes/resumes/user-123/resume-123/photo-original.jpg',
      };

      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(mockAttachment);
      prisma.resumeAttachment.delete.mockResolvedValue(mockAttachment);
      storageService.deleteFile
        .mockResolvedValueOnce(undefined) // Main file succeeds
        .mockRejectedValueOnce(new Error('Original file deletion failed')); // Original fails

      // Should still succeed even if original file deletion fails
      const result = await service.deleteAttachment('att-1', 'resume-123', 'user-123');

      expect(result).toEqual({ message: 'Attachment deleted successfully' });
      expect(storageService.deleteFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateSectionOrder', () => {
    it('should update section order successfully', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeSection.update.mockResolvedValue({});

      await service.updateSectionOrder('resume-123', 'user-123', { type: 'SKILLS', order: 1 });

      expect(prisma.resumeSection.update).toHaveBeenCalledWith({
        where: { resumeId_type: { resumeId: 'resume-123', type: 'SKILLS' } },
        data: { order: 1 },
      });
    });
  });

  describe('toggleSectionVisibility', () => {
    it('should toggle section visibility successfully', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeSection.update.mockResolvedValue({});

      await service.toggleSectionVisibility('resume-123', 'user-123', {
        type: 'SKILLS',
        visible: false,
      });

      expect(prisma.resumeSection.update).toHaveBeenCalledWith({
        where: { resumeId_type: { resumeId: 'resume-123', type: 'SKILLS' } },
        data: { visible: false },
      });
    });
  });

  describe('updateAttachment', () => {
    const mockAttachment = {
      id: 'att-1',
      resumeId: 'resume-123',
      type: 'PHOTO',
      fileName: 'photo.jpg',
      fileKey: 'resumes/user-123/resume-123/photo.jpg',
      fileUrl: 'http://storage/photo.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      isProcessed: true,
      originalUrl: null,
      title: 'My Photo',
      description: 'Profile photo',
      order: 0,
      visible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update attachment metadata successfully', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(mockAttachment);
      prisma.resumeAttachment.update.mockResolvedValue({
        ...mockAttachment,
        title: 'Updated Title',
        description: 'Updated Description',
      });

      const result = await service.updateAttachment(
        'att-1',
        'resume-123',
        'user-123',
        'Updated Title',
        'Updated Description',
        true,
      );

      expect(result).toBeDefined();
      expect(prisma.resumeAttachment.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          title: 'Updated Title',
          description: 'Updated Description',
          visible: true,
        },
      });
    });

    it('should throw NotFoundException when attachment not found', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAttachment('att-1', 'resume-123', 'user-123', 'New Title'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);
      prisma.resumeAttachment.findFirst.mockResolvedValue(mockAttachment);
      prisma.resumeAttachment.update.mockResolvedValue({
        ...mockAttachment,
        title: 'Updated Title',
      });

      await service.updateAttachment(
        'att-1',
        'resume-123',
        'user-123',
        'Updated Title',
        undefined,
        undefined,
      );

      expect(prisma.resumeAttachment.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          title: 'Updated Title',
          description: mockAttachment.description,
          visible: mockAttachment.visible,
        },
      });
    });

    it('should verify resume ownership before updating attachment', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAttachment('att-1', 'resume-123', 'user-123', 'New Title'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.resumeAttachment.update).not.toHaveBeenCalled();
    });
  });

  describe('reorderAttachments', () => {
    it('should reorder attachments successfully', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          resumeAttachment: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return await callback(tx);
      });
      prisma.$transaction.mockImplementation(mockTransaction);

      const result = await service.reorderAttachments('resume-123', 'user-123', 'PHOTO', [
        'att-1',
        'att-2',
        'att-3',
      ]);

      expect(result).toEqual({ message: 'Attachments reordered successfully' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should verify resume ownership before reordering', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderAttachments('resume-123', 'user-123', 'PHOTO', ['att-1', 'att-2']),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should update order for each attachment in transaction', async () => {
      prisma.resume.findFirst.mockResolvedValue(mockResume);

      const mockUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          resumeAttachment: {
            updateMany: mockUpdateMany,
          },
        };
        return await callback(tx);
      });
      prisma.$transaction.mockImplementation(mockTransaction);

      const attachmentIds = ['att-1', 'att-2', 'att-3'];
      await service.reorderAttachments('resume-123', 'user-123', 'PHOTO', attachmentIds);

      expect(mockUpdateMany).toHaveBeenCalledTimes(3);
      expect(mockUpdateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'att-1', resumeId: 'resume-123', type: 'PHOTO' },
        data: { order: 0 },
      });
      expect(mockUpdateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'att-2', resumeId: 'resume-123', type: 'PHOTO' },
        data: { order: 1 },
      });
      expect(mockUpdateMany).toHaveBeenNthCalledWith(3, {
        where: { id: 'att-3', resumeId: 'resume-123', type: 'PHOTO' },
        data: { order: 2 },
      });
    });
  });
});
