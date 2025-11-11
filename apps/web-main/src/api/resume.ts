import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// ========== Types ==========

export enum SectionType {
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECT = 'PROJECT',
  EDUCATION = 'EDUCATION',
  CERTIFICATE = 'CERTIFICATE',
}

export interface Skill {
  id?: string;
  category: string;
  items: string[];
  order: number;
  visible: boolean;
}

export interface ProjectAchievement {
  id?: string;
  content: string; // Achievement content
  depth: number; // 1-4 (indentation level)
  order: number;
  children?: ProjectAchievement[]; // Hierarchical structure
}

export interface ExperienceProject {
  id?: string;
  name: string; // Project name
  startDate: string; // YYYY-MM format
  endDate?: string; // null = ongoing
  description: string; // Project description
  role?: string; // Role in project (e.g., "Lead Developer")
  achievements: ProjectAchievement[]; // Hierarchical achievements (4 depth levels)
  techStack: string[];
  url?: string;
  githubUrl?: string;
  order: number;
}

export interface Experience {
  id?: string;
  company: string;
  startDate: string; // YYYY-MM format
  endDate?: string;
  finalPosition: string; // 최종 직책 (e.g., "Backend Team Lead")
  jobTitle: string; // 직급 (e.g., "Senior Developer")
  projects: ExperienceProject[]; // Projects at this company
  order: number;
  visible: boolean;
}

export interface Project {
  id?: string;
  name: string;
  startDate: string;
  endDate?: string;
  description: string;
  role?: string;
  achievements: string[];
  techStack: string[];
  url?: string;
  githubUrl?: string;
  order: number;
  visible: boolean;
}

export interface Education {
  id?: string;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  order: number;
  visible: boolean;
}

export interface Certificate {
  id?: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  order: number;
  visible: boolean;
}

export interface ResumeSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
}

export type PaperSize = 'A4' | 'LETTER';

export enum AttachmentType {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  PORTFOLIO = 'PORTFOLIO',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

export interface ResumeAttachmentBase {
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

export interface Resume {
  id: string;
  userId: string;
  title: string; // "대기업용", "스타트업용", etc.
  description?: string;
  isDefault: boolean;
  paperSize?: PaperSize; // Preferred paper size for PDF export
  name: string;
  email: string;
  phone?: string;
  address?: string; // Address (City/District level, e.g., "서울특별시 강남구" or "Seoul, Gangnam-gu")
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  profileImage?: string;
  // Korean-specific fields
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE'; // 병역 여부
  militaryDischarge?: string; // 병역 상세 (예: "병장 제대", "2020.01 - 2021.10")
  // Detailed military service information
  militaryRank?: string; // 계급 (e.g., "병장", "상병")
  militaryDischargeType?: string; // 전역 사유 (e.g., "만기전역", "의병전역")
  militaryServiceStartDate?: string; // 입대일 (YYYY-MM format)
  militaryServiceEndDate?: string; // 전역일 (YYYY-MM format)
  coverLetter?: string; // 자기소개서
  careerGoals?: string; // 입사 후 포부/하고 싶은 일
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  educations: Education[];
  certificates: Certificate[];
  attachments?: ResumeAttachmentBase[]; // Optional for backwards compatibility
  createdAt: string;
  updatedAt: string;
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
  profileImage?: string;
  // Korean-specific fields
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  militaryDischarge?: string;
  // Detailed military service information
  militaryRank?: string; // 계급 (e.g., "병장", "상병")
  militaryDischargeType?: string; // 전역 사유 (e.g., "만기전역", "의병전역")
  militaryServiceStartDate?: string; // 입대일 (YYYY-MM format)
  militaryServiceEndDate?: string; // 전역일 (YYYY-MM format)
  coverLetter?: string;
  careerGoals?: string;
  skills?: Omit<Skill, 'id'>[];
  experiences?: Omit<Experience, 'id'>[];
  projects?: Omit<Project, 'id'>[];
  educations?: Omit<Education, 'id'>[];
  certificates?: Omit<Certificate, 'id'>[];
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
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// ========== Resume APIs ==========

export const createResume = async (data: CreateResumeDto): Promise<Resume> => {
  const response = await personalApi.post('/v1/resume', data);
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
  const response = await personalApi.put(`/v1/resume/${resumeId}`, data);
  return response.data;
};

export const deleteResume = async (resumeId: string): Promise<void> => {
  await personalApi.delete(`/v1/resume/${resumeId}`);
};

export const setDefaultResume = async (resumeId: string): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/default`);
  return response.data;
};

export const updateSectionOrder = async (resumeId: string, data: UpdateSectionOrderDto): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/sections/order`, data);
  return response.data;
};

export const toggleSectionVisibility = async (resumeId: string, data: ToggleSectionVisibilityDto): Promise<Resume> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/sections/visibility`, data);
  return response.data;
};

// ========== Share Link APIs ==========

export const createResumeShare = async (resumeId: string, data: CreateShareLinkDto): Promise<ShareLink> => {
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
  description?: string
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

export const getAttachments = async (resumeId: string, type?: AttachmentType): Promise<ResumeAttachment[]> => {
  const params = type ? { type } : {};
  const response = await personalApi.get(`/v1/resume/${resumeId}/attachments`, { params });
  return response.data;
};

export const updateAttachment = async (
  resumeId: string,
  attachmentId: string,
  data: { title?: string; description?: string; visible?: boolean }
): Promise<ResumeAttachment> => {
  const response = await personalApi.patch(`/v1/resume/${resumeId}/attachments/${attachmentId}`, data);
  return response.data;
};

export const deleteAttachment = async (resumeId: string, attachmentId: string): Promise<void> => {
  await personalApi.delete(`/v1/resume/${resumeId}/attachments/${attachmentId}`);
};

export const reorderAttachments = async (
  resumeId: string,
  type: AttachmentType,
  attachmentIds: string[]
): Promise<void> => {
  await personalApi.patch(`/v1/resume/${resumeId}/attachments/reorder`, { type, attachmentIds });
};
