import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateResumeDto, UpdateResumeDto, UpdateSectionOrderDto, ToggleSectionVisibilityDto } from './dto';
import { AttachmentType } from '../storage/dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private readonly authServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.authServiceUrl = this.configService.get('AUTH_SERVICE_URL') || 'http://auth-service:4001';
  }

  /**
   * Recursively transform achievement DTOs to Prisma nested create format
   */
  private transformAchievements(achievements: any[]): any[] {
    return achievements.map(achievement => ({
      content: achievement.content,
      depth: achievement.depth,
      order: achievement.order,
      children: achievement.children && achievement.children.length > 0
        ? { create: this.transformAchievements(achievement.children) }
        : undefined,
    }));
  }

  async create(userId: string, dto: CreateResumeDto) {
    // Use Prisma transaction for multi-step DB operations (CLAUDE.md policy)
    return await this.prisma.$transaction(async (tx) => {
      // If this resume is set as default, unset all other default resumes
      if (dto.isDefault) {
        await tx.resume.updateMany({
          where: { userId: userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Create resume with all nested data
      const resume = await tx.resume.create({
        data: {
          userId: userId,
          title: dto.title,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          paperSize: dto.paperSize,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          github: dto.github,
          blog: dto.blog,
          linkedin: dto.linkedin,
          portfolio: dto.portfolio,
          summary: dto.summary,
          profileImage: dto.profileImage,
          militaryService: dto.militaryService,
          militaryDischarge: dto.militaryDischarge,
          militaryRank: dto.militaryRank,
          militaryDischargeType: dto.militaryDischargeType,
          militaryServiceStartDate: dto.militaryServiceStartDate,
          militaryServiceEndDate: dto.militaryServiceEndDate,
          coverLetter: dto.coverLetter,
          applicationReason: dto.applicationReason,
        skills: dto.skills ? {
          create: dto.skills.map(skill => ({
            ...skill,
            items: skill.items as any, // Cast to any for Prisma Json type
          })),
        } : undefined,
        experiences: dto.experiences ? {
          create: dto.experiences.map(exp => ({
            company: exp.company,
            startDate: exp.startDate,
            endDate: exp.endDate || null,
            isCurrentlyWorking: exp.isCurrentlyWorking ?? false,
            finalPosition: exp.finalPosition,
            jobTitle: exp.jobTitle,
            order: exp.order ?? 0,
            visible: exp.visible ?? true,
            projects: {
              create: exp.projects?.map(project => ({
                name: project.name,
                startDate: project.startDate,
                endDate: project.endDate || null,
                description: project.description,
                role: project.role,
                techStack: project.techStack,
                url: project.url,
                githubUrl: project.githubUrl,
                order: project.order ?? 0,
                achievements: project.achievements && project.achievements.length > 0
                  ? { create: this.transformAchievements(project.achievements) }
                  : undefined,
              })) || [],
            },
          })),
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
          experiences: {
            orderBy: { order: 'asc' },
            include: {
              projects: {
                orderBy: { order: 'asc' },
                include: {
                  achievements: {
                    where: { parentId: null },
                    orderBy: { order: 'asc' },
                    include: {
                      children: {
                        orderBy: { order: 'asc' },
                        include: {
                          children: {
                            orderBy: { order: 'asc' },
                            include: {
                              children: {
                                orderBy: { order: 'asc' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
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
      where: { userId: userId },
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: {
          orderBy: { order: 'asc' },
          include: {
            projects: {
              orderBy: { order: 'asc' },
              include: {
                achievements: {
                  where: { parentId: null },
                  orderBy: { order: 'asc' },
                  include: {
                    children: {
                      orderBy: { order: 'asc' },
                      include: {
                        children: {
                          orderBy: { order: 'asc' },
                          include: {
                            children: {
                              orderBy: { order: 'asc' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
      where: { userId: userId },
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: {
          orderBy: { order: 'asc' },
          include: {
            projects: {
              orderBy: { order: 'asc' },
              include: {
                achievements: {
                  where: { parentId: null },
                  orderBy: { order: 'asc' },
                  include: {
                    children: {
                      orderBy: { order: 'asc' },
                      include: {
                        children: {
                          orderBy: { order: 'asc' },
                          include: {
                            children: {
                              orderBy: { order: 'asc' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
      where: { id: resumeId, userId: userId },
      include: {
        sections: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        experiences: {
          orderBy: { order: 'asc' },
          include: {
            projects: {
              orderBy: { order: 'asc' },
              include: {
                achievements: {
                  where: { parentId: null },
                  orderBy: { order: 'asc' },
                  include: {
                    children: {
                      orderBy: { order: 'asc' },
                      include: {
                        children: {
                          orderBy: { order: 'asc' },
                          include: {
                            children: {
                              orderBy: { order: 'asc' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
    try {
      this.logger.log(`Updating resume ${resumeId} for user ${userId}`);
      const resume = await this.findByIdAndUserId(resumeId, userId);

      return await this.prisma.$transaction(async (tx) => {
      // If setting as default, unset all other default resumes
      if (dto.isDefault) {
        await tx.resume.updateMany({
          where: { userId: userId, isDefault: true, id: { not: resume.id } },
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
          paperSize: dto.paperSize,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          github: dto.github,
          blog: dto.blog,
          linkedin: dto.linkedin,
          portfolio: dto.portfolio,
          summary: dto.summary,
          profileImage: dto.profileImage,
          militaryService: dto.militaryService,
          militaryDischarge: dto.militaryDischarge,
          militaryRank: dto.militaryRank,
          militaryDischargeType: dto.militaryDischargeType,
          militaryServiceStartDate: dto.militaryServiceStartDate,
          militaryServiceEndDate: dto.militaryServiceEndDate,
          coverLetter: dto.coverLetter,
          applicationReason: dto.applicationReason,
        },
      });

      // Update nested data if provided
      if (dto.skills) {
        await tx.skill.deleteMany({ where: { resumeId: resume.id } });
        // Use individual creates instead of createMany for proper JSON serialization
        for (const skill of dto.skills) {
          await tx.skill.create({
            data: {
              resumeId: resume.id,
              category: skill.category,
              items: skill.items as any, // Cast to any for Prisma Json type
              order: skill.order ?? 0,
              visible: skill.visible ?? true,
            },
          });
        }
      }

      if (dto.experiences) {
        await tx.experience.deleteMany({ where: { resumeId: resume.id } });
        for (const exp of dto.experiences) {
          // Log experience data before creating
          this.logger.debug(`Creating experience: ${JSON.stringify({
            company: exp.company,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrentlyWorking: exp.isCurrentlyWorking,
            finalPosition: exp.finalPosition,
            jobTitle: exp.jobTitle,
            projectsCount: exp.projects?.length || 0,
          })}`);

          const experienceData = {
            resumeId: resume.id,
            company: exp.company,
            startDate: exp.startDate,
            endDate: exp.endDate || null,
            isCurrentlyWorking: exp.isCurrentlyWorking ?? false,
            finalPosition: exp.finalPosition,
            jobTitle: exp.jobTitle,
            order: exp.order ?? 0,
            visible: exp.visible ?? true,
            projects: {
              create: exp.projects?.map(project => {
                // Log each project
                this.logger.debug(`Creating project in experience: ${JSON.stringify({
                  name: project.name,
                  startDate: project.startDate,
                  endDate: project.endDate,
                  achievementsCount: project.achievements?.length || 0,
                })}`);

                return {
                  name: project.name,
                  startDate: project.startDate,
                  endDate: project.endDate || null,
                  description: project.description,
                  role: project.role,
                  techStack: project.techStack,
                  url: project.url,
                  githubUrl: project.githubUrl,
                  order: project.order ?? 0,
                  achievements: project.achievements && project.achievements.length > 0
                    ? { create: this.transformAchievements(project.achievements) }
                    : undefined,
                };
              }) || [],
            },
          };

          this.logger.debug(`Full experience data: ${JSON.stringify(experienceData, null, 2)}`);

          await tx.experience.create({ data: experienceData });
        }
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

      // Return updated resume with hierarchical achievements
      return await tx.resume.findUnique({
        where: { id: resume.id },
        include: {
          sections: { orderBy: { order: 'asc' } },
          skills: { orderBy: { order: 'asc' } },
          experiences: {
            orderBy: { order: 'asc' },
            include: {
              projects: {
                orderBy: { order: 'asc' },
                include: {
                  achievements: {
                    where: { parentId: null },
                    orderBy: { order: 'asc' },
                    include: {
                      children: {
                        orderBy: { order: 'asc' },
                        include: {
                          children: {
                            orderBy: { order: 'asc' },
                            include: {
                              children: {
                                orderBy: { order: 'asc' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          projects: { orderBy: { order: 'asc' } },
          educations: { orderBy: { order: 'asc' } },
          certificates: { orderBy: { order: 'asc' } },
        },
      });
    });
    } catch (error) {
      // Re-throw NotFoundException and other HTTP exceptions as-is
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Log complete error details
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : String(error);

      // Log the complete error object for debugging
      this.logger.error(`Failed to update resume ${resumeId}: ${errorMessage}`);
      this.logger.error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
      this.logger.error(`Stack trace: ${errorStack}`);

      throw new InternalServerErrorException(`Failed to update resume: ${errorMessage}`);
    }
  }

  async delete(resumeId: string, userId: string) {
    const resume = await this.findByIdAndUserId(resumeId, userId);

    await this.prisma.resume.delete({
      where: { id: resume.id },
    });

    return { message: 'Resume deleted successfully' };
  }

  /**
   * Copy/duplicate a resume with all its nested data
   */
  async copyResume(resumeId: string, userId: string) {
    // Get the original resume with all relations
    const original = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        sections: true,
        skills: true,
        experiences: {
          include: {
            projects: {
              include: {
                achievements: {
                  include: {
                    children: {
                      include: {
                        children: {
                          include: {
                            children: true, // Up to 4 levels
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        projects: true,
        educations: true,
        certificates: true,
      },
    });

    if (!original || original.userId !== userId) {
      throw new NotFoundException('Resume not found');
    }

    // Create a copy
    return await this.prisma.$transaction(async (tx) => {
      const copy = await tx.resume.create({
        data: {
          userId,
          title: `${original.title} (Copy)`,
          description: original.description,
          isDefault: false, // Copies are never default
          paperSize: original.paperSize,
          name: original.name,
          email: original.email,
          phone: original.phone,
          address: original.address,
          github: original.github,
          blog: original.blog,
          linkedin: original.linkedin,
          portfolio: original.portfolio,
          summary: original.summary,
          profileImage: original.profileImage,
          militaryService: original.militaryService,
          militaryDischarge: original.militaryDischarge,
          militaryRank: original.militaryRank,
          militaryDischargeType: original.militaryDischargeType,
          militaryServiceStartDate: original.militaryServiceStartDate,
          militaryServiceEndDate: original.militaryServiceEndDate,
          coverLetter: original.coverLetter,
          applicationReason: original.applicationReason,
        },
      });

      // Copy sections
      if (original.sections && original.sections.length > 0) {
        await tx.resumeSection.createMany({
          data: original.sections.map(section => ({
            resumeId: copy.id,
            type: section.type,
            order: section.order,
            visible: section.visible,
          })),
        });
      }

      // Copy skills (need to use individual create for JSON fields)
      if (original.skills && original.skills.length > 0) {
        for (const skill of original.skills) {
          await tx.skill.create({
            data: {
              resumeId: copy.id,
              category: skill.category,
              items: skill.items as any, // Prisma JSON type
              order: skill.order,
              visible: skill.visible,
            },
          });
        }
      }

      // Copy experiences with projects and achievements
      if (original.experiences && original.experiences.length > 0) {
        for (const exp of original.experiences) {
          await tx.experience.create({
            data: {
              resumeId: copy.id,
              company: exp.company,
              startDate: exp.startDate,
              endDate: exp.endDate,
              isCurrentlyWorking: exp.isCurrentlyWorking,
              finalPosition: exp.finalPosition,
              jobTitle: exp.jobTitle,
              order: exp.order,
              visible: exp.visible,
              projects: {
                create: exp.projects?.map(project => ({
                  name: project.name,
                  startDate: project.startDate,
                  endDate: project.endDate,
                  description: project.description,
                  role: project.role,
                  techStack: project.techStack,
                  url: project.url,
                  githubUrl: project.githubUrl,
                  order: project.order,
                  achievements: project.achievements && project.achievements.length > 0
                    ? { create: this.copyAchievements(project.achievements) }
                    : undefined,
                })) || [],
              },
            },
          });
        }
      }

      // Copy projects (standalone)
      if (original.projects && original.projects.length > 0) {
        await tx.project.createMany({
          data: original.projects.map(project => ({
            resumeId: copy.id,
            name: project.name,
            startDate: project.startDate,
            endDate: project.endDate,
            description: project.description,
            role: project.role,
            achievements: project.achievements,
            techStack: project.techStack,
            url: project.url,
            githubUrl: project.githubUrl,
            order: project.order,
            visible: project.visible,
          })),
        });
      }

      // Copy educations
      if (original.educations && original.educations.length > 0) {
        await tx.education.createMany({
          data: original.educations.map(edu => ({
            resumeId: copy.id,
            school: edu.school,
            major: edu.major,
            degree: edu.degree,
            startDate: edu.startDate,
            endDate: edu.endDate,
            gpa: edu.gpa,
            gpaFormat: edu.gpaFormat,
            order: edu.order,
            visible: edu.visible,
          })),
        });
      }

      // Copy certificates
      if (original.certificates && original.certificates.length > 0) {
        await tx.certificate.createMany({
          data: original.certificates.map(cert => ({
            resumeId: copy.id,
            name: cert.name,
            issuer: cert.issuer,
            issueDate: cert.issueDate,
            expiryDate: cert.expiryDate,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl,
            order: cert.order,
            visible: cert.visible,
          })),
        });
      }

      // Return the copied resume with all relations
      return await tx.resume.findUnique({
        where: { id: copy.id },
        include: {
          sections: { orderBy: { order: 'asc' } },
          skills: { orderBy: { order: 'asc' } },
          experiences: {
            orderBy: { order: 'asc' },
            include: {
              projects: {
                orderBy: { order: 'asc' },
                include: {
                  achievements: {
                    where: { parentId: null },
                    orderBy: { order: 'asc' },
                    include: {
                      children: {
                        orderBy: { order: 'asc' },
                        include: {
                          children: {
                            orderBy: { order: 'asc' },
                            include: {
                              children: {
                                orderBy: { order: 'asc' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          projects: { orderBy: { order: 'asc' } },
          educations: { orderBy: { order: 'asc' } },
          certificates: { orderBy: { order: 'asc' } },
        },
      });
    });
  }

  /**
   * Recursively copy achievements with their children
   */
  private copyAchievements(achievements: any[]): any[] {
    return achievements.map(achievement => ({
      content: achievement.content,
      depth: achievement.depth,
      order: achievement.order,
      children: achievement.children && achievement.children.length > 0
        ? { create: this.copyAchievements(achievement.children) }
        : undefined,
    }));
  }

  async setDefaultResume(resumeId: string, userId: string) {
    await this.findByIdAndUserId(resumeId, userId);

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
          experiences: {
            orderBy: { order: 'asc' },
            include: {
              projects: {
                orderBy: { order: 'asc' },
                include: {
                  achievements: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
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

  // Get user's default resume by username (public access)
  async getPublicResumeByUsername(username: string) {
    // First, get user ID from auth-service using username
    let userId: string;
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ id: string }>(`${this.authServiceUrl}/v1/users/by-username/${username}`)
      );
      userId = response.data.id;
    } catch (_error) {
      throw new NotFoundException('User not found');
    }

    // Then get the default resume (or first resume if no default)
    const resume = await this.prisma.resume.findFirst({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // Default resume first
        { createdAt: 'desc' },  // Otherwise, most recent
      ],
      include: {
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
      throw new NotFoundException('No resume found for this user');
    }

    return resume;
  }

  // ========== File Attachment Methods ==========

  /**
   * Upload file attachment to resume
   * For PROFILE_PHOTO type, automatically converts to grayscale
   * @Transactional decorator ensures DB consistency
   */
  async uploadAttachment(
    resumeId: string,
    userId: string,
    file: Express.Multer.File,
    type: AttachmentType,
    title?: string,
    description?: string,
  ) {
    // Verify resume ownership
    await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.$transaction(async (tx) => {
      let fileUrl: string;
      let fileKey: string;
      let originalUrl: string | null = null;
      let isProcessed = false;

      // Upload all files normally (no grayscale conversion)
      const result = await this.storageService.uploadFile(file, userId, resumeId);
      fileUrl = result.fileUrl;
      fileKey = result.fileKey;

      // Get current max order for this type
      const maxOrder = await tx.resumeAttachment.findFirst({
        where: { resumeId, type },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      // Create attachment record
      const attachment = await tx.resumeAttachment.create({
        data: {
          resumeId,
          type,
          fileName: file.originalname,
          fileKey,
          fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
          isProcessed,
          originalUrl,
          title,
          description,
          order: (maxOrder?.order ?? -1) + 1,
          visible: true,
        },
      });

      return attachment;
    });
  }

  /**
   * Get all attachments for a resume
   */
  async getAttachments(resumeId: string, userId: string) {
    await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.resumeAttachment.findMany({
      where: { resumeId },
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Get attachments by type
   */
  async getAttachmentsByType(resumeId: string, userId: string, type: AttachmentType) {
    await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.resumeAttachment.findMany({
      where: { resumeId, type },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Delete attachment
   * @Transactional ensures both file and DB record are deleted atomically
   */
  async deleteAttachment(attachmentId: string, resumeId: string, userId: string) {
    await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.$transaction(async (tx) => {
      const attachment = await tx.resumeAttachment.findFirst({
        where: { id: attachmentId, resumeId },
      });

      if (!attachment) {
        throw new NotFoundException('Attachment not found');
      }

      // Delete from storage
      await this.storageService.deleteFile(attachment.fileKey);

      // If there's an original file (for grayscale photos), delete it too
      if (attachment.originalUrl) {
        const originalKey = attachment.originalUrl.split('/').slice(-4).join('/');
        await this.storageService.deleteFile(originalKey);
      }

      // Delete from database
      await tx.resumeAttachment.delete({
        where: { id: attachmentId },
      });

      return { message: 'Attachment deleted successfully' };
    });
  }

  /**
   * Update attachment metadata
   */
  async updateAttachment(
    attachmentId: string,
    resumeId: string,
    userId: string,
    title?: string,
    description?: string,
    visible?: boolean,
  ) {
    await this.findByIdAndUserId(resumeId, userId);

    const attachment = await this.prisma.resumeAttachment.findFirst({
      where: { id: attachmentId, resumeId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return await this.prisma.resumeAttachment.update({
      where: { id: attachmentId },
      data: {
        title: title !== undefined ? title : attachment.title,
        description: description !== undefined ? description : attachment.description,
        visible: visible !== undefined ? visible : attachment.visible,
      },
    });
  }

  /**
   * Reorder attachments
   */
  async reorderAttachments(resumeId: string, userId: string, type: AttachmentType, attachmentIds: string[]) {
    await this.findByIdAndUserId(resumeId, userId);

    return await this.prisma.$transaction(async (tx) => {
      // Update order for each attachment
      const updates = attachmentIds.map((id, index) =>
        tx.resumeAttachment.updateMany({
          where: { id, resumeId, type },
          data: { order: index },
        }),
      );

      await Promise.all(updates);

      return { message: 'Attachments reordered successfully' };
    });
  }
}
