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

  /**
   * Shared Prisma include pattern for hierarchical achievements (4 levels deep)
   * Used across all resume query operations to maintain consistency
   */
  private readonly ACHIEVEMENT_INCLUDE = {
    where: { parentId: null },
    orderBy: [{ order: 'asc' as const }],
    include: {
      children: {
        orderBy: [{ order: 'asc' as const }],
        include: {
          children: {
            orderBy: [{ order: 'asc' as const }],
            include: {
              children: {
                orderBy: [{ order: 'asc' as const }],
              },
            },
          },
        },
      },
    },
  };

  /**
   * Full resume include pattern with all nested relations
   * Used for complete resume queries (create, update, findOne, etc.)
   */
  private readonly RESUME_FULL_INCLUDE = {
    sections: { orderBy: [{ order: 'asc' as const }] },
    skills: { orderBy: [{ order: 'asc' as const }] },
    experiences: {
      orderBy: [{ order: 'asc' as const }],
      include: {
        projects: {
          orderBy: [{ order: 'asc' as const }],
          include: {
            achievements: this.ACHIEVEMENT_INCLUDE,
          },
        },
      },
    },
    educations: { orderBy: [{ order: 'asc' as const }] },
    certificates: { orderBy: [{ order: 'asc' as const }] },
  };

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.authServiceUrl = this.configService.get('AUTH_SERVICE_URL') || 'http://auth-service:4001';
  }

  /**
   * Sanitize salary information from resume experiences if showSalary is false.
   * This ensures sensitive salary data is not exposed through the API.
   * @param resume - Resume object to sanitize
   * @returns Resume with salary info removed from experiences where showSalary is false
   */
  private sanitizeSalaryInfo(resume: any): any {
    if (!resume) return resume;

    // Sanitize salary info in each experience
    if (resume.experiences && Array.isArray(resume.experiences)) {
      resume.experiences = resume.experiences.map((exp: any) => {
        if (!exp.showSalary) {
          const { salary: _salary, salaryUnit: _salaryUnit, showSalary: _showSalary, ...rest } = exp;
          return rest;
        }
        return exp;
      });
    }

    return resume;
  }

  /**
   * Recursively create achievements with proper parent-child relationships.
   * Prisma doesn't support nested creates for self-referencing relations,
   * so we create them level by level using the parentId field.
   */
  private async createAchievements(
    achievements: any[],
    projectId: string,
    parentId: string | null,
    tx: any,
  ): Promise<void> {
    for (const achievement of achievements) {
      const created = await tx.projectAchievement.create({
        data: {
          projectId,
          content: achievement.content,
          depth: achievement.depth,
          order: achievement.order ?? 0,
          parentId,
        },
      });

      // Recursively create children with this achievement as parent
      if (achievement.children && achievement.children.length > 0) {
        await this.createAchievements(
          achievement.children,
          projectId,
          created.id, // Use created achievement's ID as parentId
          tx,
        );
      }
    }
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

      // Store project achievements to create after projects are created
      const projectAchievementsMap = new Map<number, any[]>();

      // Create resume with all nested data (except achievements)
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
          keyAchievements: dto.keyAchievements ?? [],
          profileImage: dto.profileImage,
          birthYear: dto.birthYear,
          birthDate: dto.birthDate,
          gender: dto.gender,
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
          create: dto.experiences.map((exp, expIdx) => {
            const expData: any = {
              company: exp.company,
              startDate: exp.startDate,
              endDate: exp.endDate || null,
              isCurrentlyWorking: exp.isCurrentlyWorking ?? false,
              finalPosition: exp.finalPosition,
              jobTitle: exp.jobTitle,
              salary: exp.salary,
              salaryUnit: exp.salaryUnit,
              showSalary: exp.showSalary ?? false,
              order: exp.order ?? 0,
              visible: exp.visible ?? true,
            };

            // Only add projects if they exist (without achievements)
            if (exp.projects && exp.projects.length > 0) {
              expData.projects = {
                create: exp.projects.map((project, projIdx) => {
                  // Store achievements for later creation
                  if (project.achievements && project.achievements.length > 0) {
                    const key = expIdx * 1000 + projIdx; // Create unique key
                    projectAchievementsMap.set(key, project.achievements);
                  }

                  // Create project without achievements
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
                  };
                }),
              };
            }

            return expData;
          }),
        } : undefined,
        // NOTE: Projects are now handled within experiences (ExperienceProject model)
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
          experiences: {
            orderBy: [{ order: 'asc' }],
            include: {
              projects: {
                orderBy: [{ order: 'asc' }],
              },
            },
          },
        },
      });

      // Create achievements for each project
      if (dto.experiences) {
        for (let expIdx = 0; expIdx < dto.experiences.length; expIdx++) {
          const exp = dto.experiences[expIdx];
          if (exp.projects) {
            for (let projIdx = 0; projIdx < exp.projects.length; projIdx++) {
              const key = expIdx * 1000 + projIdx;
              const achievements = projectAchievementsMap.get(key);
              if (achievements) {
                const projectId = resume.experiences[expIdx].projects[projIdx].id;
                await this.createAchievements(achievements, projectId, null, tx);
              }
            }
          }
        }
      }

      // Return with full nested structure including hierarchical achievements
      return await tx.resume.findUnique({
        where: { id: resume.id },
        include: this.RESUME_FULL_INCLUDE,
      });
    });
  }

  // Get all resumes for a user
  async findAllByUserId(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId: userId },
      include: this.RESUME_FULL_INCLUDE,
      orderBy: [
        { isDefault: 'desc' }, // Default resume first
        { createdAt: 'desc' }, // Then by creation date
      ],
    });

    // Sanitize salary info for all resumes (remove salary fields where showSalary is false)
    return resumes.map(resume => this.sanitizeSalaryInfo(resume));
  }

  // Get default resume or first resume for a user
  async getDefaultResume(userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { userId: userId },
      include: this.RESUME_FULL_INCLUDE,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (!resume) {
      throw new NotFoundException('No resume found for user');
    }

    // Sanitize salary info before returning
    return this.sanitizeSalaryInfo(resume);
  }

  // Get specific resume by ID (with ownership check)
  async findByIdAndUserId(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: userId },
      include: this.RESUME_FULL_INCLUDE,
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
          keyAchievements: dto.keyAchievements,
          profileImage: dto.profileImage,
          birthYear: dto.birthYear,
          birthDate: dto.birthDate,
          gender: dto.gender,
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

          const experienceData: any = {
            resumeId: resume.id,
            company: exp.company,
            startDate: exp.startDate,
            endDate: exp.endDate || null,
            isCurrentlyWorking: exp.isCurrentlyWorking ?? false,
            finalPosition: exp.finalPosition,
            jobTitle: exp.jobTitle,
            salary: exp.salary,
            salaryUnit: exp.salaryUnit,
            showSalary: exp.showSalary ?? false,
            order: exp.order ?? 0,
            visible: exp.visible ?? true,
          };

          // Store project achievements for later creation
          const projectAchievements: Array<{ projectIdx: number; achievements: any[] }> = [];

          // Only add projects if they exist (without achievements)
          if (exp.projects && exp.projects.length > 0) {
            experienceData.projects = {
              create: exp.projects.map((project, projIdx) => {
                // Log each project
                this.logger.debug(`Creating project in experience: ${JSON.stringify({
                  name: project.name,
                  startDate: project.startDate,
                  endDate: project.endDate,
                  achievementsCount: project.achievements?.length || 0,
                })}`);

                // Store achievements for later
                if (project.achievements && project.achievements.length > 0) {
                  projectAchievements.push({
                    projectIdx: projIdx,
                    achievements: project.achievements,
                  });
                }

                // Create project without achievements
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
                };
              }),
            };
          }

          this.logger.debug(`Full experience data: ${JSON.stringify(experienceData, null, 2)}`);

          // Create experience with projects
          const createdExperience = await tx.experience.create({
            data: experienceData,
            include: { projects: { orderBy: [{ order: 'asc' }] } },
          });

          // Create achievements for each project
          for (const { projectIdx, achievements } of projectAchievements) {
            const projectId = createdExperience.projects[projectIdx].id;
            await this.createAchievements(achievements, projectId, null, tx);
          }
        }
      }

      // NOTE: Projects are now handled within experiences (ExperienceProject model)
      // Independent Project model is no longer used for resume projects

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
        include: this.RESUME_FULL_INCLUDE,
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
                achievements: this.ACHIEVEMENT_INCLUDE,
              },
            },
          },
        },
        educations: true,
        certificates: true,
        attachments: {
          orderBy: [{ type: 'asc' }, { order: 'asc' }],
        },
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
          const expData: any = {
            resumeId: copy.id,
            company: exp.company,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrentlyWorking: exp.isCurrentlyWorking,
            finalPosition: exp.finalPosition,
            jobTitle: exp.jobTitle,
            salary: exp.salary,
            salaryUnit: exp.salaryUnit,
            showSalary: exp.showSalary,
            order: exp.order,
            visible: exp.visible,
          };

          // Only add projects if they exist (without achievements)
          if (exp.projects && exp.projects.length > 0) {
            expData.projects = {
              create: exp.projects.map(project => ({
                name: project.name,
                startDate: project.startDate,
                endDate: project.endDate,
                description: project.description,
                role: project.role,
                techStack: project.techStack,
                url: project.url,
                githubUrl: project.githubUrl,
                order: project.order,
              })),
            };
          }

          // Create experience with projects
          const createdExperience = await tx.experience.create({
            data: expData,
            include: { projects: { orderBy: [{ order: 'asc' }] } },
          });

          // Copy achievements for each project using the same method as create()
          if (exp.projects && exp.projects.length > 0) {
            for (let i = 0; i < exp.projects.length; i++) {
              const project = exp.projects[i];
              if (project.achievements && project.achievements.length > 0) {
                const projectId = createdExperience.projects[i].id;
                await this.createAchievements(project.achievements, projectId, null, tx);
              }
            }
          }
        }
      }

      // NOTE: Independent projects are no longer used.
      // All projects are now handled within experiences (ExperienceProject model)

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

      // Copy attachments (profile photos, portfolios, certificates, etc.)
      if (original.attachments && original.attachments.length > 0) {
        for (const attachment of original.attachments) {
          try {
            // Copy file in MinIO storage
            const { fileKey: newFileKey, fileUrl: newFileUrl } = await this.storageService.copyFile(
              attachment.fileKey,
              userId,
              copy.id,
            );

            // Copy original file if it exists (for grayscale photos)
            let newOriginalUrl: string | null = null;
            if (attachment.originalUrl) {
              const originalKey = attachment.originalUrl.split('/').slice(-4).join('/');
              const { fileUrl } = await this.storageService.copyFile(originalKey, userId, copy.id);
              newOriginalUrl = fileUrl;
            }

            // Create attachment record for copied resume
            await tx.resumeAttachment.create({
              data: {
                resumeId: copy.id,
                type: attachment.type,
                fileName: attachment.fileName,
                fileKey: newFileKey,
                fileUrl: newFileUrl,
                fileSize: attachment.fileSize,
                mimeType: attachment.mimeType,
                isProcessed: attachment.isProcessed,
                originalUrl: newOriginalUrl,
                title: attachment.title,
                description: attachment.description,
                order: attachment.order,
                visible: attachment.visible,
              },
            });
          } catch (error: any) {
            this.logger.error(`Failed to copy attachment ${attachment.id}: ${error.message}`);
            // Continue copying other attachments even if one fails
          }
        }
      }

      // Return the copied resume with all relations
      return await tx.resume.findUnique({
        where: { id: copy.id },
        include: this.RESUME_FULL_INCLUDE,
      });
    });
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
          sections: { orderBy: [{ order: 'asc' }] },
          skills: { orderBy: [{ order: 'asc' }] },
          experiences: {
            orderBy: [{ order: 'asc' }],
            include: {
              projects: {
                orderBy: [{ order: 'asc' }],
                include: {
                  achievements: {
                    orderBy: [{ order: 'asc' }],
                  },
                },
              },
            },
          },
          // NOTE: Independent projects field removed - projects are now only handled as ExperienceProject within experiences
          educations: { orderBy: [{ order: 'asc' }] },
          certificates: { orderBy: [{ order: 'asc' }] },
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
          orderBy: [{ order: 'asc' }],
        },
        skills: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
        },
        experiences: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
          include: {
            projects: {
              orderBy: [{ order: 'asc' }],
              include: {
                achievements: this.ACHIEVEMENT_INCLUDE,
              },
            },
          },
        },
        educations: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
        },
        certificates: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
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
        sections: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
        },
        skills: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
        },
        experiences: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
          include: {
            projects: {
              orderBy: [{ order: 'asc' }],
              include: {
                achievements: this.ACHIEVEMENT_INCLUDE,
              },
            },
          },
        },
        educations: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
        },
        certificates: {
          where: { visible: true },
          orderBy: [{ order: 'asc' }],
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('No resume found for this user');
    }

    // Sanitize salary info for public access
    return this.sanitizeSalaryInfo(resume);
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
        orderBy: [{ order: 'desc' }],
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
      orderBy: [{ order: 'asc' }],
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
