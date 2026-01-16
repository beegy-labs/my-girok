/**
 * Share Link Operations
 *
 * APIs for creating and managing resume share links,
 * including public access endpoints.
 */
import type { Resume } from '@my-girok/types';
import { personalApi } from './client';
import type { ShareLink, CreateShareLinkDto, UpdateShareLinkDto } from './types';

/**
 * Create a share link for a resume
 */
export const createResumeShare = async (
  resumeId: string,
  data: CreateShareLinkDto,
): Promise<ShareLink> => {
  const response = await personalApi.post(`/v1/share/resume/${resumeId}`, data);
  return response.data;
};

/**
 * Get all share links for the current user
 */
export const getMyShareLinks = async (): Promise<ShareLink[]> => {
  const response = await personalApi.get('/v1/share');
  return response.data;
};

/**
 * Get a specific share link by ID
 */
export const getShareLink = async (id: string): Promise<ShareLink> => {
  const response = await personalApi.get(`/v1/share/${id}`);
  return response.data;
};

/**
 * Update a share link
 */
export const updateShareLink = async (id: string, data: UpdateShareLinkDto): Promise<ShareLink> => {
  const response = await personalApi.patch(`/v1/share/${id}`, data);
  return response.data;
};

/**
 * Delete a share link
 */
export const deleteShareLink = async (id: string): Promise<void> => {
  await personalApi.delete(`/v1/share/${id}`);
};

/**
 * Get a resume via public share token (no authentication required)
 */
export const getPublicResume = async (token: string): Promise<Resume> => {
  const response = await personalApi.get(`/v1/share/public/${token}`);
  return response.data;
};

/**
 * Get user's default resume by username (public access)
 */
export const getUserResume = async (username: string): Promise<Resume> => {
  const response = await personalApi.get(`/v1/resume/public/${username}`);
  return response.data;
};
