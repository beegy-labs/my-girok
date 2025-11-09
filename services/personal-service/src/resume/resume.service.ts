import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateResumeDto, UpdateResumeDto, UpdateSectionOrderDto, ToggleSectionVisibilityDto } from './dto';

@Injectable()
export class ResumeService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateResumeDto) {
    // Check if user already has a resume
    const existing = await this.prisma.resume.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has a resume. Use update instead.');
    }

    // Create resume with all nested data
    const resume = await this.prisma.resume.create({
      data: {
        userId,
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
  }

  async findByUserId(userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { userId },
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

  async update(userId: string, dto: UpdateResumeDto) {
    const resume = await this.findByUserId(userId);

    // Update basic info
    const updated = await this.prisma.resume.update({
      where: { id: resume.id },
      data: {
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
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        educations: { orderBy: { order: 'asc' } },
        certificates: { orderBy: { order: 'asc' } },
      },
    });

    // Update nested data if provided
    if (dto.skills) {
      await this.prisma.skill.deleteMany({ where: { resumeId: resume.id } });
      await this.prisma.skill.createMany({
        data: dto.skills.map(skill => ({ ...skill, resumeId: resume.id })),
      });
    }

    if (dto.experiences) {
      await this.prisma.experience.deleteMany({ where: { resumeId: resume.id } });
      await this.prisma.experience.createMany({
        data: dto.experiences.map(exp => ({ ...exp, resumeId: resume.id })),
      });
    }

    if (dto.projects) {
      await this.prisma.project.deleteMany({ where: { resumeId: resume.id } });
      await this.prisma.project.createMany({
        data: dto.projects.map(proj => ({ ...proj, resumeId: resume.id })),
      });
    }

    if (dto.educations) {
      await this.prisma.education.deleteMany({ where: { resumeId: resume.id } });
      await this.prisma.education.createMany({
        data: dto.educations.map(edu => ({ ...edu, resumeId: resume.id })),
      });
    }

    if (dto.certificates) {
      await this.prisma.certificate.deleteMany({ where: { resumeId: resume.id } });
      await this.prisma.certificate.createMany({
        data: dto.certificates.map(cert => ({ ...cert, resumeId: resume.id })),
      });
    }

    return this.findByUserId(userId);
  }

  async delete(userId: string) {
    const resume = await this.findByUserId(userId);

    await this.prisma.resume.delete({
      where: { id: resume.id },
    });

    return { message: 'Resume deleted successfully' };
  }

  async updateSectionOrder(userId: string, dto: UpdateSectionOrderDto) {
    const resume = await this.findByUserId(userId);

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

    return this.findByUserId(userId);
  }

  async toggleSectionVisibility(userId: string, dto: ToggleSectionVisibilityDto) {
    const resume = await this.findByUserId(userId);

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

    return this.findByUserId(userId);
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
