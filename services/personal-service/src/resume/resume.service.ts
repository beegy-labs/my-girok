import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateResumeDto, UpdateResumeDto, UpdateSectionOrderDto, ToggleSectionVisibilityDto } from './dto';

@Injectable()
export class ResumeService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateResumeDto) {
    // Use Prisma transaction for multi-step DB operations (CLAUDE.md policy)
    return await this.prisma.$transaction(async (tx) => {
      // If this resume is set as default, unset all other default resumes
      if (dto.isDefault) {
        await tx.resume.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Create resume with all nested data
      const resume = await tx.resume.create({
        data: {
          userId,
          title: dto.title,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          github: dto.github,
          blog: dto.blog,
          linkedin: dto.linkedin,
          portfolio: dto.portfolio,
          summary: dto.summary,
          profileImage: dto.profileImage,
        skills: dto.skills ? {
          create: dto.skills,
        } : undefined,
        experiences: dto.experiences ? {
          create: dto.experiences,
        } : undefined,
        projects: dto.projects ? {
          create: dto.projects,
        } : undefined,
        educations: dto.educations ? {
          create: dto.educations,
        } : undefined,
        certificates: dto.certificates ? {
          create: dto.certificates,
        } : undefined,
          sections: {
            create: [
              { type: 'SKILLS', order: 0, visible: true },
              { type: 'EXPERIENCE', order: 1, visible: true },
              { type: 'PROJECT', order: 2, visible: true },
              { type: 'EDUCATION', order: 3, visible: true },
              { type: 'CERTIFICATE', order: 4, visible: true },
            ],
          },
        },
        include: {
          sections: { orderBy: { order: 'asc' } },
          skills: { orderBy: { order: 'asc' } },
          experiences: { orderBy: { order: 'asc' } },
          projects: { orderBy: { order: 'asc' } },
          educations: { orderBy: { order: 'asc' } },
          certificates: { orderBy: { order: 'asc' } },
        },
      });

      return resume;
    });
  }

  // Get all resumes for a user
  async findAllByUserId(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        educations: { orderBy: { order: 'asc' } },
        certificates: { orderBy: { order: 'asc' } },
      },
      orderBy: [
        { isDefault: 'desc' }, // Default resume first
        { createdAt: 'desc' }, // Then by creation date
      ],
    });

    return resumes;
  }

  // Get default resume or first resume for a user
  async getDefaultResume(userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { userId },
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        educations: { orderBy: { order: 'asc' } },
        certificates: { orderBy: { order: 'asc' } },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (!resume) {
      throw new NotFoundException('No resume found for user');
    }

    return resume;
  }

  // Get specific resume by ID (with ownership check)
  async findByIdAndUserId(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        educations: { orderBy: { order: 'asc' } },
        certificates: { orderBy: { order: 'asc' } },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  // Use Prisma transaction for multi-step DB operations (CLAUDE.md policy)
  async update(resumeId: string, userId: string, dto: UpdateResumeDto) {
    const resume = await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.$transaction(async (tx) => {
      // If setting as default, unset all other default resumes
      if (dto.isDefault) {
        await tx.resume.updateMany({
          where: { userId, isDefault: true, id: { not: resume.id } },
          data: { isDefault: false },
        });
      }

      // Update basic info
      await tx.resume.update({
        where: { id: resume.id },
        data: {
          title: dto.title,
          description: dto.description,
          isDefault: dto.isDefault,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          github: dto.github,
          blog: dto.blog,
          linkedin: dto.linkedin,
          portfolio: dto.portfolio,
          summary: dto.summary,
          profileImage: dto.profileImage,
        },
      });

      // Update nested data if provided
      if (dto.skills) {
        await tx.skill.deleteMany({ where: { resumeId: resume.id } });
        await tx.skill.createMany({
          data: dto.skills.map(skill => ({ ...skill, resumeId: resume.id })),
        });
      }

      if (dto.experiences) {
        await tx.experience.deleteMany({ where: { resumeId: resume.id } });
        await tx.experience.createMany({
          data: dto.experiences.map(exp => ({ ...exp, resumeId: resume.id })),
        });
      }

      if (dto.projects) {
        await tx.project.deleteMany({ where: { resumeId: resume.id } });
        await tx.project.createMany({
          data: dto.projects.map(proj => ({ ...proj, resumeId: resume.id })),
        });
      }

      if (dto.educations) {
        await tx.education.deleteMany({ where: { resumeId: resume.id } });
        await tx.education.createMany({
          data: dto.educations.map(edu => ({ ...edu, resumeId: resume.id })),
        });
      }

      if (dto.certificates) {
        await tx.certificate.deleteMany({ where: { resumeId: resume.id } });
        await tx.certificate.createMany({
          data: dto.certificates.map(cert => ({ ...cert, resumeId: resume.id })),
        });
      }

      // Return updated resume
      return await tx.resume.findUnique({
        where: { id: resume.id },
        include: {
          sections: { orderBy: { order: 'asc' } },
          skills: { orderBy: { order: 'asc' } },
          experiences: { orderBy: { order: 'asc' } },
          projects: { orderBy: { order: 'asc' } },
          educations: { orderBy: { order: 'asc' } },
          certificates: { orderBy: { order: 'asc' } },
        },
      });
    });
  }

  async delete(resumeId: string, userId: string) {
    const resume = await this.findByIdAndUserId(resumeId, userId);

    await this.prisma.resume.delete({
      where: { id: resume.id },
    });

    return { message: 'Resume deleted successfully' };
  }

  async setDefaultResume(resumeId: string, userId: string) {
    const resume = await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.$transaction(async (tx) => {
      // Unset all other default resumes
      await tx.resume.updateMany({
        where: { userId, isDefault: true, id: { not: resumeId } },
        data: { isDefault: false },
      });

      // Set this resume as default
      return await tx.resume.update({
        where: { id: resumeId },
        data: { isDefault: true },
        include: {
          sections: { orderBy: { order: 'asc' } },
          skills: { orderBy: { order: 'asc' } },
          experiences: { orderBy: { order: 'asc' } },
          projects: { orderBy: { order: 'asc' } },
          educations: { orderBy: { order: 'asc' } },
          certificates: { orderBy: { order: 'asc' } },
        },
      });
    });
  }

  async updateSectionOrder(resumeId: string, userId: string, dto: UpdateSectionOrderDto) {
    const resume = await this.findByIdAndUserId(resumeId, userId);

    await this.prisma.resumeSection.update({
      where: {
        resumeId_type: {
          resumeId: resume.id,
          type: dto.type,
        },
      },
      data: {
        order: dto.order,
      },
    });

    return this.findByIdAndUserId(resumeId, userId);
  }

  async toggleSectionVisibility(resumeId: string, userId: string, dto: ToggleSectionVisibilityDto) {
    const resume = await this.findByIdAndUserId(resumeId, userId);

    await this.prisma.resumeSection.update({
      where: {
        resumeId_type: {
          resumeId: resume.id,
          type: dto.type,
        },
      },
      data: {
        visible: dto.visible,
      },
    });

    return this.findByIdAndUserId(resumeId, userId);
  }

  // For public access (no auth required)
  async findById(id: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: {
        sections: {
          where: { visible: true },
          orderBy: { order: 'asc' },
        },
        skills: {
          where: { visible: true },
          orderBy: { order: 'asc' },
        },
        experiences: {
          where: { visible: true },
          orderBy: { order: 'asc' },
        },
        projects: {
          where: { visible: true },
          orderBy: { order: 'asc' },
        },
        educations: {
          where: { visible: true },
          orderBy: { order: 'asc' },
        },
        certificates: {
          where: { visible: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }
}
