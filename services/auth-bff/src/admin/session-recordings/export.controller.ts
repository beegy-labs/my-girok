/**
 * Session Recording Export Controller
 *
 * Handles export and sharing of session recordings
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SessionRecordingsService } from './session-recordings.service';
import { randomBytes } from 'crypto';

interface ExportSessionDto {
  format: 'json' | 'video' | 'pdf';
  includeMetadata?: boolean;
  includeEvents?: boolean;
}

interface ShareSessionDto {
  expiresIn: '1h' | '24h' | '7d' | '30d' | 'never';
}

interface ShareLink {
  token: string;
  sessionId: string;
  expiresAt: Date | null;
  createdAt: Date;
}

@Controller('admin/session-recordings')
@UseGuards(JwtAuthGuard)
export class SessionRecordingsExportController {
  // In-memory store for share links (in production, use Redis or database)
  private shareLinks = new Map<string, ShareLink>();

  constructor(private readonly sessionRecordingsService: SessionRecordingsService) {}

  /**
   * Export session recording in specified format
   */
  @Post('export/:sessionId')
  async exportSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: ExportSessionDto,
    @Res() res: Response,
  ) {
    const session = await this.sessionRecordingsService.getSessionById(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    switch (dto.format) {
      case 'json':
        return this.exportAsJson(session, dto, res);
      case 'video':
        return this.exportAsVideo(session, res);
      case 'pdf':
        return this.exportAsPdf(session, res);
      default:
        throw new BadRequestException(`Unsupported format: ${dto.format}`);
    }
  }

  /**
   * Generate shareable link for session
   */
  @Post('share/:sessionId')
  async shareSession(@Param('sessionId') sessionId: string, @Body() dto: ShareSessionDto) {
    const session = await this.sessionRecordingsService.getSessionById(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (dto.expiresIn !== 'never') {
      expiresAt = new Date();
      switch (dto.expiresIn) {
        case '1h':
          expiresAt.setHours(expiresAt.getHours() + 1);
          break;
        case '24h':
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case '7d':
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        case '30d':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
      }
    }

    // Store share link
    const shareLink: ShareLink = {
      token,
      sessionId,
      expiresAt,
      createdAt: new Date(),
    };

    this.shareLinks.set(token, shareLink);

    // Generate share URL
    const baseUrl = process.env.AUTH_BFF_URL || 'https://auth-dev.girok.dev';
    const shareUrl = `${baseUrl}/admin/session-recordings/shared/${token}`;

    return {
      shareUrl,
      token,
      expiresAt,
    };
  }

  /**
   * Access shared session
   */
  @Get('shared/:token')
  async getSharedSession(@Param('token') token: string) {
    const shareLink = this.shareLinks.get(token);

    if (!shareLink) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      this.shareLinks.delete(token);
      throw new NotFoundException('Share link expired');
    }

    // Get session
    const session = await this.sessionRecordingsService.getSessionById(shareLink.sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      session,
      sharedAt: shareLink.createdAt,
      expiresAt: shareLink.expiresAt,
    };
  }

  /**
   * Export session as JSON
   */
  private exportAsJson(session: any, dto: ExportSessionDto, res: Response) {
    const exportData: any = {};

    if (dto.includeMetadata !== false) {
      exportData.metadata = session.metadata;
    }

    if (dto.includeEvents !== false) {
      exportData.events = session.events;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="session-${session.sessionId}.json"`,
    );

    return res.json(exportData);
  }

  /**
   * Export session as MP4 video
   * (Placeholder - actual implementation requires video rendering)
   */
  private async exportAsVideo(session: any, res: Response) {
    // In production, this would render the session replay as video
    // using a headless browser and ffmpeg

    throw new BadRequestException('Video export not yet implemented');

    // Example implementation:
    // const videoBuffer = await this.renderSessionAsVideo(session);
    // res.setHeader('Content-Type', 'video/mp4');
    // res.setHeader('Content-Disposition', `attachment; filename="session-${session.sessionId}.mp4"`);
    // return res.send(videoBuffer);
  }

  /**
   * Export session as PDF report
   * (Placeholder - actual implementation requires PDF generation)
   */
  private async exportAsPdf(session: any, res: Response) {
    // In production, this would generate a PDF report with:
    // - Session summary
    // - Screenshots of key moments
    // - Event timeline
    // - User journey analysis

    throw new BadRequestException('PDF export not yet implemented');

    // Example implementation:
    // const pdfBuffer = await this.generateSessionReport(session);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename="session-${session.sessionId}.pdf"`);
    // return res.send(pdfBuffer);
  }

  /**
   * Cleanup expired share links periodically
   */
  private cleanupExpiredLinks() {
    const now = new Date();
    for (const [token, link] of this.shareLinks.entries()) {
      if (link.expiresAt && link.expiresAt < now) {
        this.shareLinks.delete(token);
      }
    }
  }
}
