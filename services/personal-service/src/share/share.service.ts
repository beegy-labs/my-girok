import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ResumeService } from '../resume/resume.service';
import { CreateShareLinkDto, UpdateShareLinkDto, ShareDuration } from './dto';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class ShareService {
  constructor(
    private prisma: PrismaService,
    private resumeService: ResumeService,
  ) {}

  private calculateExpiration(duration: ShareDuration, customDate?: string): Date | null {
    const now = new Date();

    switch (duration) {
      case ShareDuration.ONE_WEEK:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case ShareDuration.ONE_MONTH:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case ShareDuration.THREE_MONTHS:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case ShareDuration.CUSTOM:
        return customDate ? new Date(customDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case ShareDuration.PERMANENT:
        return null;
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  async createForResume(userId: string, resumeId: string, dto: CreateShareLinkDto) {
    // Check if resume exists and belongs to user
    const resume = await this.resumeService.findByIdAndUserId(resumeId, userId);

    const expiresAt = this.calculateExpiration(dto.duration, dto.customExpiresAt);

    const shareLink = await this.prisma.shareLink.create({
      data: {
        token: createId(),
        resourceType: 'RESUME',
        resourceId: resume.id,
        userId,
        expiresAt,
        isActive: true,
      },
    });

    return {
      ...shareLink,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareLink.token}`,
    };
  }

  async findAllByUser(userId: string) {
    const shareLinks = await this.prisma.shareLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return shareLinks.map(link => ({
      ...link,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resume/${link.token}`,
    }));
  }

  async findOne(id: string, userId: string) {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { id },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    if (shareLink.userId !== userId) {
      throw new ForbiddenException('Not your share link');
    }

    return {
      ...shareLink,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareLink.token}`,
    };
  }

  async update(id: string, userId: string, dto: UpdateShareLinkDto) {
    await this.findOne(id, userId);

    const updateData: any = {};

    if (dto.duration !== undefined) {
      updateData.expiresAt = this.calculateExpiration(dto.duration, dto.customExpiresAt);
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.shareLink.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resume/${updated.token}`,
    };
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.shareLink.delete({
      where: { id },
    });

    return { message: 'Share link deleted successfully' };
  }

  // Public access (no auth)
  async getPublicResume(token: string) {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      throw new NotFoundException('Invalid share link');
    }

    if (!shareLink.isActive) {
      throw new ForbiddenException('Share link is deactivated');
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new ForbiddenException('Share link has expired');
    }

    // Increment view count
    await this.prisma.shareLink.update({
      where: { id: shareLink.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    // Get resume (only visible sections)
    const resume = await this.resumeService.findById(shareLink.resourceId);

    return resume;
  }
}
