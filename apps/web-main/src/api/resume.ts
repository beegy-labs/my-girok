import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
  // Enums (must be regular import for runtime access)
  SectionType,
  DegreeType,
  GpaFormat,
  AttachmentType,
  Gender,
  type PaperSize,
  // Interfaces
  type SkillDescription,
  type SkillItem,
  type Skill,
  type ProjectAchievement,
  type ExperienceProject,
  type Experience,
  type Project,
  type Education,
  type Certificate,
  type ResumeSection,
  type ResumeAttachmentBase,
  type Resume,
  // Utility functions
  getAge,
  calculateKoreanAge,
} from '@my-girok/types';

// Re-export for backward compatibility
export { SectionType, DegreeType, GpaFormat, AttachmentType, Gender, getAge, calculateKoreanAge };
export type {
  PaperSize,
  SkillDescription,
  SkillItem,
  Skill,
  ProjectAchievement,
  ExperienceProject,
  Experience,
  Project,
  Education,
  Certificate,
  ResumeSection,
  ResumeAttachmentBase,
  Resume,
};

export interface TempUploadResponse {
  tempKey: string;
  previewUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface CreateResumeDto {
  title: string; // "대기업용 이력서", "스타트업용 이력서", etc.
  description?: string; // Brief description of resume purpose
  isDefault?: boolean; // Set as default resume
  paperSize?: PaperSize; // Preferred paper size
  name: string;
  email: string;
  phone?: string;
  address?: string; // Address (City/District level, e.g., "서울특별시 강남구" or "Seoul, Gangnam-gu")
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  keyAchievements?: string[]; // 주요 성과 (3-5 major accomplishments)
  profileImage?: string;
  profileImageTempKey?: string; // Temp file key for profile image (from temp-upload)
  // Birth Date and Gender
  birthDate?: string; // 생년월일 (YYYY-MM-DD format) for accurate age calculation
  gender?: Gender; // 성별
  // Korean-specific fields
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  militaryDischarge?: string;
  // Detailed military service information
  militaryRank?: string; // 계급 (e.g., "병장", "상병")
  militaryDischargeType?: string; // 전역 사유 (e.g., "만기전역", "의병전역")
  militaryServiceStartDate?: string; // 입대일 (YYYY-MM format)
  militaryServiceEndDate?: string; // 전역일 (YYYY-MM format)
  coverLetter?: string;
  applicationReason?: string;
  skills?: Omit<Skill, 'id'>[];
  experiences?: Omit<Experience, 'id'>[];
  // NOTE: projects field removed - projects are now only handled as nested ExperienceProject within experiences
  educations?: Omit<Education, 'id'>[];
  certificates?: Omit<Certificate, 'id'>[];
}

// ========== Utility Functions ==========

/**
 * Calculate duration between two dates in months (inclusive of both start and end months)
 *
 * Example: 2021-10 ~ 2022-05
 * - Includes: Oct, Nov, Dec (2021) + Jan, Feb, Mar, Apr, May (2022) = 8 months
 * - Not 7 months (which would exclude the end month)
 */
function calculateMonths(startDate: string, endDate?: string): number {
  // Return 0 if startDate is empty or invalid
  if (!startDate || startDate.trim() === '') {
    return 0;
  }

  const start = new Date(startDate + '-01');
  const end = endDate ? new Date(endDate + '-01') : new Date();

  // Return 0 if dates are invalid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();

  // Add 1 to include the end month in the calculation
  return years * 12 + months + 1;
}

/**
 * Calculate total work experience duration with overlap handling
 * Merges overlapping date ranges to avoid double-counting
 *
 * Example:
 * - Company A: 2020-01 ~ 2022-06
 * - Company B: 2022-03 ~ 2025-11 (current)
 * - Overlap: 2022-03 ~ 2022-06 (4 months)
 * - Total: 2020-01 ~ 2025-11 = 5 years 11 months (not 6 years 3 months)
 */
export function calculateTotalExperienceWithOverlap(experiences: Experience[]): {
  years: number;
  months: number;
} {
  if (experiences.length === 0) {
    return { years: 0, months: 0 };
  }

  // Convert experiences to date intervals
  interface DateInterval {
    start: Date;
    end: Date;
  }

  // Filter out experiences with invalid or empty startDate
  const validExperiences = experiences.filter(
    (exp) => exp.startDate && exp.startDate.trim() !== '',
  );

  if (validExperiences.length === 0) {
    return { years: 0, months: 0 };
  }

  const intervals: DateInterval[] = validExperiences
    .map((exp) => {
      const start = new Date(exp.startDate + '-01');
      const end =
        exp.isCurrentlyWorking || !exp.endDate ? new Date() : new Date(exp.endDate + '-01');
      return { start, end };
    })
    .filter((interval) => !isNaN(interval.start.getTime()) && !isNaN(interval.end.getTime()));

  // Return early if no valid intervals after filtering
  if (intervals.length === 0) {
    return { years: 0, months: 0 };
  }

  // Sort intervals by start date
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping intervals
  const merged: DateInterval[] = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];

    // Check if current and next overlap or are adjacent
    if (next.start <= current.end) {
      // Merge: extend current end to the later of the two ends
      current = {
        start: current.start,
        end: new Date(Math.max(current.end.getTime(), next.end.getTime())),
      };
    } else {
      // No overlap: save current and move to next
      merged.push(current);
      current = next;
    }
  }

  // Don't forget the last interval
  merged.push(current);

  // Calculate total months from merged intervals (inclusive of both start and end months)
  const totalMonths = merged.reduce((total, interval) => {
    const years = interval.end.getFullYear() - interval.start.getFullYear();
    const months = interval.end.getMonth() - interval.start.getMonth();
    // Add 1 to include the end month in the calculation
    return total + (years * 12 + months + 1);
  }, 0);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Calculate single experience duration
 */
export function calculateExperienceDuration(
  startDate: string,
  endDate?: string,
  isCurrentlyWorking?: boolean,
): { years: number; months: number } {
  const totalMonths = calculateMonths(startDate, isCurrentlyWorking ? undefined : endDate);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Recursively strips database-specific fields and empty values from nested objects
 * This is needed because:
 * 1. DTOs don't accept database-generated fields for nested relations
 * 2. Backend validators reject empty strings (e.g., @IsDateString() on optional fields)
 */
function stripIds<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => stripIds(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    // List of database-generated fields that should be removed before API submission
    const dbFields = [
      'id',
      'projectId',
      'resumeId',
      'experienceId',
      'parentId',
      'createdAt',
      'updatedAt',
    ];
    // Optional fields that should convert empty string to null for proper clearing
    // Required fields (startDate, name, email, etc.) should NOT be converted to null
    const optionalNullableFields = [
      // Date fields
      'endDate',
      'expiryDate',
      'birthDate',
      'militaryDischarge',
      'militaryServiceStartDate',
      'militaryServiceEndDate',
      // Text fields that can be cleared
      'description',
      'summary',
      'coverLetter',
      'applicationReason',
      'phone',
      'address',
      'github',
      'blog',
      'linkedin',
      'portfolio',
      'profileImage',
      'credentialId',
      'credentialUrl',
      'url',
      'githubUrl',
      'role',
      'gpa',
      'militaryRank',
      'militaryDischargeType',
      'salaryUnit',
    ];

    for (const [key, value] of Object.entries(obj)) {
      // Skip database-generated fields
      if (dbFields.includes(key)) {
        continue;
      }

      // Convert empty strings to null for optional nullable fields
      // This allows clearing fields properly in the database
      if (value === '' && optionalNullableFields.includes(key)) {
        result[key] = null;
        continue;
      }

      // Skip undefined values to avoid validation errors
      if (value === undefined) {
        continue;
      }

      // Recursively process nested objects and arrays
      result[key] = stripIds(value);
    }
    return result;
  }

  return obj;
}

/**
 * Prepares resume data for API submission by removing all id fields
 */
function prepareResumeForSubmit<T extends CreateResumeDto | UpdateResumeDto>(data: T): T {
  return stripIds(data);
}

export interface UpdateResumeDto extends Partial<CreateResumeDto> {}

export interface UpdateSectionOrderDto {
  type: SectionType;
  order: number;
}

export interface ToggleSectionVisibilityDto {
  type: SectionType;
  visible: boolean;
}

export enum ShareDuration {
  ONE_WEEK = '1_week',
  ONE_MONTH = '1_month',
  THREE_MONTHS = '3_months',
  PERMANENT = 'permanent',
  CUSTOM = 'custom',
}

export interface ShareLink {
  id: string;
  token: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  expiresAt: string | null;
  isActive: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareLinkDto {
  duration: ShareDuration;
  customExpiresAt?: string;
}

export interface UpdateShareLinkDto {
  duration?: ShareDuration;
  customExpiresAt?: string;
  isActive?: boolean;
}

// ========== API URL ==========

const PERSONAL_API_URL = import.meta.env.VITE_PERSONAL_API_URL || 'http://localhost:4002';

// Create personalApi using axios.create and copy interceptors from authApi
export const personalApi = axios.create({
  baseURL: PERSONAL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh calls
let isRefreshingPersonal = false;

// Copy request interceptor from authApi to add JWT token and check for proactive refresh
personalApi.interceptors.request.use(
  async (config) => {
    // Skip auth for public endpoints (no authentication required)
    const isPublicEndpoint =
      config.url?.includes('/share/public/') || config.url?.includes('/resume/public/');

    if (isPublicEndpoint) {
      return config;
    }

    const { accessToken, needsProactiveRefresh, refreshToken } = useAuthStore.getState();

    // Add access token to headers
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Proactive refresh: renew refresh token if it has 7 days or less remaining
    if (!isRefreshingPersonal && needsProactiveRefresh() && refreshToken) {
      isRefreshingPersonal = true;
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await axios.post(`${API_URL}/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        useAuthStore.getState().updateTokens(newAccessToken, newRefreshToken);

        // Update current request with new token
        config.headers.Authorization = `Bearer ${newAccessToken}`;
      } catch (error) {
        console.warn('Proactive token refresh failed:', error);
        // Don't block the request if proactive refresh fails
      } finally {
        isRefreshingPersonal = false;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Copy response interceptor for token refresh
personalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth retry for public endpoints
    const isPublicEndpoint =
      originalRequest.url?.includes('/share/public/') ||
      originalRequest.url?.includes('/resume/public/');

    if (isPublicEndpoint) {
      return Promise.reject(error);
    }

    // Enhanced error logging for mobile debugging
    if (!error.response) {
      console.error('[API Error] Network or CORS error:', {
        message: error.message,
        url: originalRequest?.url,
        method: originalRequest?.method,
        // This helps debug iOS Safari CORS issues
        userAgent: navigator.userAgent,
      });
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await axios.post(`${API_URL}/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        // Update both tokens (refresh endpoint returns new refresh token)
        if (newRefreshToken) {
          useAuthStore.getState().updateTokens(accessToken, newRefreshToken);
        } else {
          useAuthStore.getState().updateAccessToken(accessToken);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return personalApi(originalRequest);
      } catch (refreshError) {
        console.error('[API Error] Token refresh failed:', refreshError);
        useAuthStore.getState().clearAuth();
        // Preserve current URL to redirect back after login
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnUrl=${returnUrl}`;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// ========== Resume APIs ==========

export const createResume = async (data: CreateResumeDto): Promise<Resume> => {
  const cleanData = prepareResumeForSubmit(data);
  const response = await personalApi.post('/v1/resume', cleanData);
  return response.data;
};

export const getAllResumes = async (): Promise<Resume[]> => {
  const response = await personalApi.get('/v1/resume');
  return response.data;
};

export const getDefaultResume = async (): Promise<Resume> => {
  const response = await personalApi.get('/v1/resume/default');
  return response.data;
};

export const getResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.get(`/v1/resume/${resumeId}`);
  return response.data;
};

export const updateResume = async (resumeId: string, data: UpdateResumeDto): Promise<Resume> => {
  const cleanData = prepareResumeForSubmit(data);
  const response = await personalApi.put(`/v1/resume/${resumeId}`, cleanData);
  return response.data;
};

export const deleteResume = async (resumeId: string): Promise<void> => {
  await personalApi.delete(`/v1/resume/${resumeId}`);
};

export const setDefaultResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/default`);
  return response.data;
};

export const copyResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.post(`/v1/resume/${resumeId}/copy`);
  return response.data;
};

export const updateSectionOrder = async (
  resumeId: string,
  data: UpdateSectionOrderDto,
): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/sections/order`, data);
  return response.data;
};

export const toggleSectionVisibility = async (
  resumeId: string,
  data: ToggleSectionVisibilityDto,
): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/sections/visibility`, data);
  return response.data;
};

// ========== Share Link APIs ==========

export const createResumeShare = async (
  resumeId: string,
  data: CreateShareLinkDto,
): Promise<ShareLink> => {
  const response = await personalApi.post(`/v1/share/resume/${resumeId}`, data);
  return response.data;
};

export const getMyShareLinks = async (): Promise<ShareLink[]> => {
  const response = await personalApi.get('/v1/share');
  return response.data;
};

export const getShareLink = async (id: string): Promise<ShareLink> => {
  const response = await personalApi.get(`/v1/share/${id}`);
  return response.data;
};

export const updateShareLink = async (id: string, data: UpdateShareLinkDto): Promise<ShareLink> => {
  const response = await personalApi.patch(`/v1/share/${id}`, data);
  return response.data;
};

export const deleteShareLink = async (id: string): Promise<void> => {
  await personalApi.delete(`/v1/share/${id}`);
};

export const getPublicResume = async (token: string): Promise<Resume> => {
  const response = await personalApi.get(`/v1/share/public/${token}`);
  return response.data;
};

// Get user's default resume by username (public access)
export const getUserResume = async (username: string): Promise<Resume> => {
  const response = await personalApi.get(`/v1/resume/public/${username}`);
  return response.data;
};

// ========== Attachment Types ==========

export interface ResumeAttachment {
  id: string;
  resumeId: string;
  type: AttachmentType;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isProcessed: boolean;
  originalUrl?: string;
  title?: string;
  description?: string;
  order: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== Attachment APIs ==========

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

export const getAttachments = async (
  resumeId: string,
  type?: AttachmentType,
): Promise<ResumeAttachment[]> => {
  const params = type ? { type } : {};
  const response = await personalApi.get(`/v1/resume/${resumeId}/attachments`, { params });
  return response.data;
};

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

export const deleteAttachment = async (resumeId: string, attachmentId: string): Promise<void> => {
  await personalApi.delete(`/v1/resume/${resumeId}/attachments/${attachmentId}`);
};

export const reorderAttachments = async (
  resumeId: string,
  type: AttachmentType,
  attachmentIds: string[],
): Promise<void> => {
  await personalApi.patch(`/v1/resume/${resumeId}/attachments/reorder`, { type, attachmentIds });
};

// ========== Temp Upload APIs ==========

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
