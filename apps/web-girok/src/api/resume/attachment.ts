/**
 * Attachment Operations
 *
 * APIs for managing resume attachments including file uploads,
 * updates, deletion, and reordering.
 */
import type { AttachmentType } from '@my-girok/types';
import { personalApi } from './client';
import type { ResumeAttachment } from './types';

/**
 * Upload an attachment to a resume
 */
export const uploadAttachment = async (
  resumeId: string,
  file: File,
  type: AttachmentType,
  title?: string,
  description?: string,
): Promise<ResumeAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  const response = await personalApi.post(`/v1/resume/${resumeId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get attachments for a resume, optionally filtered by type
 */
export const getAttachments = async (
  resumeId: string,
  type?: AttachmentType,
): Promise<ResumeAttachment[]> => {
  const params = type ? { type } : {};
  const response = await personalApi.get(`/v1/resume/${resumeId}/attachments`, { params });
  return response.data;
};

/**
 * Update an attachment's metadata
 */
export const updateAttachment = async (
  resumeId: string,
  attachmentId: string,
  data: { title?: string; description?: string; visible?: boolean },
): Promise<ResumeAttachment> => {
  const response = await personalApi.patch(
    `/v1/resume/${resumeId}/attachments/${attachmentId}`,
    data,
  );
  return response.data;
};

/**
 * Delete an attachment
 */
export const deleteAttachment = async (resumeId: string, attachmentId: string): Promise<void> => {
  await personalApi.delete(`/v1/resume/${resumeId}/attachments/${attachmentId}`);
};

/**
 * Reorder attachments of a specific type
 */
export const reorderAttachments = async (
  resumeId: string,
  type: AttachmentType,
  attachmentIds: string[],
): Promise<void> => {
  await personalApi.patch(`/v1/resume/${resumeId}/attachments/reorder`, { type, attachmentIds });
};
