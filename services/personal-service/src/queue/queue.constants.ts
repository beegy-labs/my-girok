/**
 * Queue names for BullMQ
 */
export const QUEUE_NAMES = {
  FILE_COPY: 'file-copy',
} as const;

/**
 * Job names within queues
 */
export const JOB_NAMES = {
  COPY_RESUME_ATTACHMENTS: 'copy-resume-attachments',
} as const;
