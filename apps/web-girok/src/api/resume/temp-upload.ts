/**
 * Temporary Upload Operations
 *
 * APIs for handling temporary file uploads.
 * Files are moved to permanent storage when the resume is saved.
 */
import { personalApi } from './client';
import type { TempUploadResponse } from './types';

/**
 * Upload file to temporary storage
 * Returns presigned URL for preview. File will be moved to permanent storage on resume save.
 */
export const uploadToTemp = async (file: File): Promise<TempUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await personalApi.post('/v1/resume/temp-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Delete file from temporary storage (cleanup when user cancels)
 */
export const deleteTempFile = async (tempKey: string): Promise<void> => {
  await personalApi.delete('/v1/resume/temp-upload', {
    data: { tempKey },
  });
};
