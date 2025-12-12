import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AttachmentType, CopyStatus } from '../../../node_modules/.prisma/personal-client';

import { QUEUE_NAMES } from '../queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

/**
 * Job data for copying resume attachments
 */
export interface CopyResumeAttachmentsJobData {
  sourceResumeId: string;
  targetResumeId: string;
  userId: string;
  attachments: {
    id: string;
    type: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    isProcessed: boolean;
    originalUrl: string | null;
    title: string | null;
    description: string | null;
    order: number;
    visible: boolean;
  }[];
}

/**
 * File Copy Processor
 * Handles async file copy operations for resume attachments
 */
@Processor(QUEUE_NAMES.FILE_COPY)
export class FileCopyProcessor extends WorkerHost {
  private readonly logger = new Logger(FileCopyProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<CopyResumeAttachmentsJobData>): Promise<void> {
    const { sourceResumeId, targetResumeId, userId, attachments } = job.data;

    this.logger.log(
      `Processing file copy job ${job.id}: ${attachments.length} attachments from ${sourceResumeId} to ${targetResumeId}`,
    );

    let successCount = 0;
    let failCount = 0;

    for (const attachment of attachments) {
      try {
        // Update job progress
        await job.updateProgress({
          current: successCount + failCount,
          total: attachments.length,
          currentFile: attachment.fileName,
        });

        // Copy main file in MinIO storage
        const { fileKey: newFileKey, fileUrl: newFileUrl } =
          await this.storageService.copyFile(attachment.fileKey, userId, targetResumeId);

        // Copy original file if it exists (for grayscale photos)
        let newOriginalUrl: string | null = null;
        if (attachment.originalUrl) {
          const originalKey = attachment.originalUrl.split('/').slice(-4).join('/');
          const { fileUrl } = await this.storageService.copyFile(originalKey, userId, targetResumeId);
          newOriginalUrl = fileUrl;
        }

        // Create attachment record for copied resume
        await this.prisma.resumeAttachment.create({
          data: {
            resumeId: targetResumeId,
            type: attachment.type as AttachmentType,
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

        successCount++;
        this.logger.debug(`Copied attachment ${attachment.id}: ${attachment.fileName}`);
      } catch (error: any) {
        failCount++;
        this.logger.error(
          `Failed to copy attachment ${attachment.id} (${attachment.fileName}): ${error.message}`,
        );
        // Continue with other attachments even if one fails
      }
    }

    // Update resume copyStatus based on results
    const status: CopyStatus =
      failCount === 0
        ? CopyStatus.COMPLETED
        : failCount === attachments.length
          ? CopyStatus.FAILED
          : CopyStatus.PARTIAL;

    await this.prisma.resume.update({
      where: { id: targetResumeId },
      data: {
        copyStatus: status,
        copyCompletedAt: new Date(),
      },
    });

    this.logger.log(
      `File copy job ${job.id} completed: ${successCount} success, ${failCount} failed (status: ${status})`,
    );

    if (failCount > 0 && failCount < attachments.length) {
      // Partial failure - log warning but don't throw
      this.logger.warn(
        `Partial file copy for resume ${targetResumeId}: ${failCount}/${attachments.length} attachments failed`,
      );
    } else if (failCount === attachments.length) {
      throw new Error(`All ${attachments.length} attachment copies failed for resume ${targetResumeId}`);
    }
  }
}
