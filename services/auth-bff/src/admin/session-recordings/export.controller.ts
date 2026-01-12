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
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
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
  private readonly shareLinkPrefix: string;
  private readonly shareLinkMaxTtl: number;

  constructor(
    private readonly sessionRecordingsService: SessionRecordingsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    // Load configuration from ConfigService
    this.shareLinkPrefix = this.configService.get<string>(
      'sessionRecordings.shareLink.prefix',
      'session_share_link',
    );
    this.shareLinkMaxTtl = this.configService.get<number>(
      'sessionRecordings.shareLink.maxTtl',
      2592000000,
    ); // 30 days
  }

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

    // Store share link in Redis/Valkey
    const shareLink: ShareLink = {
      token,
      sessionId,
      expiresAt,
      createdAt: new Date(),
    };

    // Calculate TTL for Redis (in milliseconds)
    const ttl = expiresAt ? expiresAt.getTime() - Date.now() : this.shareLinkMaxTtl;
    const cacheKey = `${this.shareLinkPrefix}:${token}`;

    await this.cacheManager.set(cacheKey, shareLink, ttl);

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
    const cacheKey = `${this.shareLinkPrefix}:${token}`;
    const shareLink = await this.cacheManager.get<ShareLink>(cacheKey);

    if (!shareLink) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Check expiration (Redis TTL should handle this, but double-check)
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      await this.cacheManager.del(cacheKey);
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
   * Note: Cleanup of expired share links is automatically handled by Redis/Valkey TTL.
   * No manual cleanup is required as expired keys are automatically removed.
   */
}
