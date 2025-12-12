import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { CopyResumeAttachmentsJobData } from '../processors/file-copy.processor';

/**
 * File Copy Service
 * Provides interface to queue file copy operations
 */
@Injectable()
export class FileCopyService {
  private readonly logger = new Logger(FileCopyService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.FILE_COPY)
    private readonly fileCopyQueue: Queue<CopyResumeAttachmentsJobData>,
  ) {}

  /**
   * Queue a job to copy resume attachments asynchronously
   * @param data - Job data containing source/target resume IDs and attachments
   * @returns Job ID for tracking
   */
  async queueAttachmentCopy(data: CopyResumeAttachmentsJobData): Promise<string> {
    const job = await this.fileCopyQueue.add(JOB_NAMES.COPY_RESUME_ATTACHMENTS, data, {
      // Priority: normal
      priority: 5,
      // Delay: none (immediate processing)
      delay: 0,
    });

    this.logger.log(
      `Queued attachment copy job ${job.id}: ${data.attachments.length} files from ${data.sourceResumeId} to ${data.targetResumeId}`,
    );

    return job.id as string;
  }

  /**
   * Get job status by ID
   * @param jobId - Job ID to check
   * @returns Job state and progress
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: any;
    failedReason?: string;
  } | null> {
    const job = await this.fileCopyQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      state: await job.getState(),
      progress: job.progress,
      failedReason: job.failedReason,
    };
  }
}
