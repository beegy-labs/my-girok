// Resume types for My-Girok

// ========== Enums ==========

export enum SectionType {
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECT = 'PROJECT',
  EDUCATION = 'EDUCATION',
  CERTIFICATE = 'CERTIFICATE',
}

export enum DegreeType {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ASSOCIATE_2 = 'ASSOCIATE_2', // 2-year college
  ASSOCIATE_3 = 'ASSOCIATE_3', // 3-year college (Korea specific)
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

export enum GpaFormat {
  SCALE_4_0 = 'SCALE_4_0',   // 4.0 scale (US: 3.8/4.0)
  SCALE_4_5 = 'SCALE_4_5',   // 4.5 scale (KR: 4.2/4.5)
  SCALE_100 = 'SCALE_100',   // 100-point scale (JP: 85/100)
}

export enum AttachmentType {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  PORTFOLIO = 'PORTFOLIO',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

export enum Gender {
  MALE = 'MALE',     // 남성
  FEMALE = 'FEMALE', // 여성
  OTHER = 'OTHER',   // 기타
}

export type PaperSize = 'A4' | 'LETTER';

// ========== Hierarchical Structures ==========

export interface SkillDescription {
  id?: string;
  content: string; // Description text
  depth: number; // 1-4 (indentation level)
  order: number;
  children?: SkillDescription[]; // Hierarchical structure
}

export interface ProjectAchievement {
  id?: string;
  content: string; // Achievement content
  depth: number; // 1-4 (indentation level)
  order: number;
  children?: ProjectAchievement[]; // Hierarchical structure
}

// ========== Skill Types ==========

export interface SkillItem {
  name: string; // 기술명 (e.g., "React", "Node.js")
  description?: string; // Legacy: 단순 텍스트 설명 (backward compatibility)
  descriptions?: SkillDescription[]; // 활용 경험/세부 설명 (hierarchical, 4 depth levels)
}

export interface Skill {
  id?: string;
  category: string; // 카테고리 (e.g., "Language", "Framework", "Database")
  items: SkillItem[]; // 기술 항목들
  order: number;
  visible: boolean;
}

// ========== Experience Types ==========

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
  isCurrentlyWorking?: boolean; // 재직중
  finalPosition: string; // 최종 직책 (e.g., "Backend Team Lead")
  jobTitle: string; // 직급 (e.g., "Senior Developer")
  salary?: number; // Salary amount at this company
  salaryUnit?: string; // e.g., "만원", "USD", "EUR", "JPY"
  showSalary?: boolean; // Show in preview
  projects: ExperienceProject[]; // Projects at this company
  order: number;
  visible: boolean;
}

// ========== Project Types (Deprecated) ==========

/**
 * @deprecated Projects are now handled as nested ExperienceProject within experiences.
 * This interface exists only for backward compatibility with old data.
 */
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

// ========== Education Types ==========

export interface Education {
  id?: string;
  school: string;
  major: string;
  degree?: DegreeType;
  startDate: string;
  endDate?: string;
  gpa?: string;
  gpaFormat?: GpaFormat;
  order: number;
  visible: boolean;
}

// ========== Certificate Types ==========

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

// ========== Resume Section Types ==========

export interface ResumeSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
}

// ========== Attachment Types ==========

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

// ========== Main Resume Type ==========

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
  keyAchievements?: string[]; // 주요 성과 (3-5 major accomplishments)
  profileImage?: string;
  // Birth Year and Gender
  birthYear?: number; // 출생 연도 (e.g., 1994)
  gender?: Gender; // 성별
  // Korean-specific fields
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE'; // 병역 여부
  militaryDischarge?: string; // 병역 상세 (예: "병장 제대", "2020.01 - 2021.10")
  // Detailed military service information
  militaryRank?: string; // 계급 (e.g., "병장", "상병")
  militaryDischargeType?: string; // 전역 사유 (e.g., "만기전역", "의병전역")
  militaryServiceStartDate?: string; // 입대일 (YYYY-MM format)
  militaryServiceEndDate?: string; // 전역일 (YYYY-MM format)
  coverLetter?: string; // 자기소개서
  applicationReason?: string; // 지원 동기
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  /** @deprecated Projects are now handled as nested ExperienceProject within experiences. This field exists only for backward compatibility with old data. */
  projects: Project[];
  educations: Education[];
  certificates: Certificate[];
  attachments?: ResumeAttachmentBase[]; // Optional for backwards compatibility
  createdAt: string;
  updatedAt: string;
}
