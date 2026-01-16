/**
 * Resume CRUD Operations
 *
 * Core resume management APIs including create, read, update, delete,
 * and section management operations.
 */
import type { Resume } from '@my-girok/types';
import { personalApi } from './client';
import type {
  CreateResumeDto,
  UpdateResumeDto,
  UpdateSectionOrderDto,
  ToggleSectionVisibilityDto,
} from './types';
import { prepareResumeForSubmit } from './utils';

/**
 * Create a new resume
 */
export const createResume = async (data: CreateResumeDto): Promise<Resume> => {
  const cleanData = prepareResumeForSubmit(data);
  const response = await personalApi.post('/v1/resume', cleanData);
  return response.data;
};

/**
 * Get all resumes for the current user
 */
export const getAllResumes = async (): Promise<Resume[]> => {
  const response = await personalApi.get('/v1/resume');
  return response.data;
};

/**
 * Get the default resume for the current user
 */
export const getDefaultResume = async (): Promise<Resume> => {
  const response = await personalApi.get('/v1/resume/default');
  return response.data;
};

/**
 * Get a specific resume by ID
 */
export const getResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.get(`/v1/resume/${resumeId}`);
  return response.data;
};

/**
 * Update an existing resume
 */
export const updateResume = async (resumeId: string, data: UpdateResumeDto): Promise<Resume> => {
  const cleanData = prepareResumeForSubmit(data);
  const response = await personalApi.put(`/v1/resume/${resumeId}`, cleanData);
  return response.data;
};

/**
 * Delete a resume
 */
export const deleteResume = async (resumeId: string): Promise<void> => {
  await personalApi.delete(`/v1/resume/${resumeId}`);
};

/**
 * Set a resume as the default
 */
export const setDefaultResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/default`);
  return response.data;
};

/**
 * Create a copy of an existing resume
 */
export const copyResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.post(`/v1/resume/${resumeId}/copy`);
  return response.data;
};

/**
 * Update the order of a resume section
 */
export const updateSectionOrder = async (
  resumeId: string,
  data: UpdateSectionOrderDto,
): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/sections/order`, data);
  return response.data;
};

/**
 * Toggle visibility of a resume section
 */
export const toggleSectionVisibility = async (
  resumeId: string,
  data: ToggleSectionVisibilityDto,
): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/sections/visibility`, data);
  return response.data;
};
