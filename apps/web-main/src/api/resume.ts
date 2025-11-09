import { authApi } from './auth';

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

export interface Experience {
  id?: string;
  company: string;
  position: string;
  startDate: string; // YYYY-MM format
  endDate?: string;
  description: string;
  achievements: string[];
  techStack: string[];
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

export interface Resume {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  profileImage?: string;
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  educations: Education[];
  certificates: Certificate[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateResumeDto {
  name: string;
  email: string;
  phone?: string;
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  profileImage?: string;
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
}

export interface UpdateShareLinkDto {
  duration?: ShareDuration;
  isActive?: boolean;
}

// ========== API URL ==========

const PERSONAL_API_URL = import.meta.env.VITE_PERSONAL_API_URL || 'http://localhost:4002';

export const personalApi = authApi.create({
  baseURL: `${PERSONAL_API_URL}/v1`,
});

// ========== Resume APIs ==========

export const createResume = async (data: CreateResumeDto): Promise<Resume> => {
  const response = await personalApi.post('/resume', data);
  return response.data;
};

export const getMyResume = async (): Promise<Resume> => {
  const response = await personalApi.get('/resume');
  return response.data;
};

export const updateResume = async (data: UpdateResumeDto): Promise<Resume> => {
  const response = await personalApi.put('/resume', data);
  return response.data;
};

export const deleteResume = async (): Promise<void> => {
  await personalApi.delete('/resume');
};

export const updateSectionOrder = async (data: UpdateSectionOrderDto): Promise<Resume> => {
  const response = await personalApi.patch('/resume/sections/order', data);
  return response.data;
};

export const toggleSectionVisibility = async (data: ToggleSectionVisibilityDto): Promise<Resume> => {
  const response = await personalApi.patch('/resume/sections/visibility', data);
  return response.data;
};

// ========== Share Link APIs ==========

export const createResumeShare = async (data: CreateShareLinkDto): Promise<ShareLink> => {
  const response = await personalApi.post('/share/resume', data);
  return response.data;
};

export const getMyShareLinks = async (): Promise<ShareLink[]> => {
  const response = await personalApi.get('/share');
  return response.data;
};

export const getShareLink = async (id: string): Promise<ShareLink> => {
  const response = await personalApi.get(`/share/${id}`);
  return response.data;
};

export const updateShareLink = async (id: string, data: UpdateShareLinkDto): Promise<ShareLink> => {
  const response = await personalApi.patch(`/share/${id}`, data);
  return response.data;
};

export const deleteShareLink = async (id: string): Promise<void> => {
  await personalApi.delete(`/share/${id}`);
};

export const getPublicResume = async (token: string): Promise<Resume> => {
  const response = await personalApi.get(`/share/public/${token}`);
  return response.data;
};
