/**
 * Resume API Module
 *
 * Barrel exports for all resume-related APIs.
 * Provides backward compatibility with the original resume.ts exports.
 */

// Client
export { personalApi } from './client';

// Types - Re-export all types for backward compatibility
export {
  // Enums
  SectionType,
  DegreeType,
  GpaFormat,
  AttachmentType,
  Gender,
  // Utility functions from @my-girok/types
  getAge,
  calculateKoreanAge,
  // Enum types
  ShareDuration,
} from './types';

export type {
  // Types from @my-girok/types
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
  // DTOs
  TempUploadResponse,
  CreateResumeDto,
  UpdateResumeDto,
  UpdateSectionOrderDto,
  ToggleSectionVisibilityDto,
  ShareLink,
  CreateShareLinkDto,
  UpdateShareLinkDto,
  ResumeAttachment,
} from './types';

// Utility functions
export {
  calculateMonths,
  calculateTotalExperienceWithOverlap,
  calculateExperienceDuration,
  stripIds,
  prepareResumeForSubmit,
} from './utils';

// Resume CRUD operations
export {
  createResume,
  getAllResumes,
  getDefaultResume,
  getResume,
  updateResume,
  deleteResume,
  setDefaultResume,
  copyResume,
  updateSectionOrder,
  toggleSectionVisibility,
} from './resume';

// Share link operations
export {
  createResumeShare,
  getMyShareLinks,
  getShareLink,
  updateShareLink,
  deleteShareLink,
  getPublicResume,
  getUserResume,
} from './share';

// Attachment operations
export {
  uploadAttachment,
  getAttachments,
  updateAttachment,
  deleteAttachment,
  reorderAttachments,
} from './attachment';

// Temp upload operations
export { uploadToTemp, deleteTempFile } from './temp-upload';
