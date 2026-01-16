/**
 * Resume API Types and DTOs
 *
 * This module contains all type definitions for the resume API.
 * Re-exports types from @my-girok/types for backward compatibility.
 */
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

// ========== Temp Upload ==========

export interface TempUploadResponse {
  tempKey: string;
  previewUrl: string;
  fileSize: number;
  mimeType: string;
}

// ========== Resume DTOs ==========

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

export interface UpdateResumeDto extends Partial<CreateResumeDto> {}

export interface UpdateSectionOrderDto {
  type: SectionType;
  order: number;
}

export interface ToggleSectionVisibilityDto {
  type: SectionType;
  visible: boolean;
}

// ========== Share Link Types ==========

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
