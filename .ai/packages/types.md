# @my-girok/types

> Shared TypeScript types across the monorepo

## Structure

```
packages/types/src/
├── auth/
│   ├── enums.ts      # Role, AuthProvider, TokenType
│   ├── dto.ts        # Auth DTOs (Login, Register, JWT, etc.)
│   └── index.ts
├── user/
│   └── user.ts       # User, Session, DomainAccessToken
├── resume/
│   └── index.ts      # Resume, Experience, Skill, etc.
├── legal/
│   ├── enums.ts      # ConsentType, LegalDocumentType
│   └── dto.ts        # Consent DTOs, Legal Documents
├── common/
│   ├── api-response.ts  # ApiResponse, Pagination
│   └── index.ts
└── index.ts
```

## Auth Enums

```typescript
enum Role {
  GUEST = 'GUEST',
  USER = 'USER',
  MANAGER = 'MANAGER',
  MASTER = 'MASTER',
}

enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  APPLE = 'APPLE',
}

enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  DOMAIN_ACCESS = 'DOMAIN_ACCESS',
}
```

## Auth DTOs

```typescript
interface RegisterDto {
  email: string;
  username: string;
  password: string;
  name: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface AuthPayload {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}

interface UserPayload {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatar: string | null;
  role: Role;
  provider: AuthProvider;
  emailVerified: boolean;
  createdAt: Date;
}

interface RefreshTokenDto {
  refreshToken: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface GrantDomainAccessDto {
  domain: string;
  expiresInHours: number;
  recipientEmail?: string;
}

interface DomainAccessPayload {
  accessToken: string;
  expiresAt: Date;
  accessUrl: string;
}

interface UpdateProfileDto {
  username?: string;
  name?: string;
  avatar?: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  type: 'ACCESS' | 'REFRESH' | 'DOMAIN_ACCESS';
  domain?: string;
  iat?: number;
  exp?: number;
}
```

## User Types

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: Role;
  provider: AuthProvider;
  providerId: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

interface DomainAccessToken {
  id: string;
  userId: string;
  domain: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
```

## Resume Types

### Enums

| Enum             | Values                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `SectionType`    | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE                |
| `DegreeType`     | HIGH_SCHOOL, ASSOCIATE_2, ASSOCIATE_3, BACHELOR, MASTER, DOCTORATE |
| `GpaFormat`      | SCALE_4_0, SCALE_4_5, SCALE_100                                    |
| `AttachmentType` | PROFILE_PHOTO, PORTFOLIO, CERTIFICATE, OTHER                       |
| `Gender`         | MALE, FEMALE, OTHER                                                |
| `PaperSize`      | 'A4' \| 'LETTER' (type, not enum)                                  |

### Core Interfaces

```typescript
interface Resume {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isDefault: boolean;
  paperSize?: PaperSize;

  // Basic Info
  name: string;
  email: string;
  phone?: string;
  address?: string;
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  keyAchievements?: string[];
  profileImage?: string;

  // Personal Info
  birthYear?: number; // deprecated, use birthDate
  birthDate?: string; // YYYY-MM-DD
  gender?: Gender;

  // Korean-specific (Military Service)
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  militaryDischarge?: string; // e.g., "병장 제대"
  militaryRank?: string; // e.g., "병장", "상병"
  militaryDischargeType?: string; // e.g., "만기전역"
  militaryServiceStartDate?: string; // YYYY-MM
  militaryServiceEndDate?: string; // YYYY-MM
  coverLetter?: string;
  applicationReason?: string;

  // Sections
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  projects: Project[]; // @deprecated - use ExperienceProject
  educations: Education[];
  certificates: Certificate[];
  attachments?: ResumeAttachmentBase[];

  createdAt: string;
  updatedAt: string;
}

interface Experience {
  id?: string;
  company: string;
  startDate: string; // YYYY-MM
  endDate?: string;
  isCurrentlyWorking?: boolean;
  finalPosition: string; // "Backend Team Lead"
  jobTitle: string; // "Senior Developer"
  salary?: number;
  salaryUnit?: string; // "만원", "USD"
  showSalary?: boolean;
  projects: ExperienceProject[];
  order: number;
  visible: boolean;
}

interface ExperienceProject {
  id?: string;
  name: string;
  startDate: string;
  endDate?: string;
  description: string;
  role?: string;
  achievements: ProjectAchievement[]; // 4-depth hierarchy
  techStack: string[];
  url?: string;
  githubUrl?: string;
  order: number;
}

interface ProjectAchievement {
  id?: string;
  content: string;
  depth: number; // 1-4
  order: number;
  children?: ProjectAchievement[];
}
```

### Skill Types

```typescript
interface SkillDescription {
  id?: string;
  content: string;
  depth: number; // 1-4 (indentation level)
  order: number;
  children?: SkillDescription[];
}

interface SkillItem {
  name: string;
  description?: string; // Legacy (backward compatibility)
  descriptions?: SkillDescription[]; // Hierarchical (4 depth levels)
}

interface Skill {
  id?: string;
  category: string; // "Language", "Framework", "Database"
  items: SkillItem[];
  order: number;
  visible: boolean;
}
```

### Supporting Types

| Type                   | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `Education`            | school, major, degree, gpa, gpaFormat       |
| `Certificate`          | name, issuer, issueDate, credentialUrl      |
| `ResumeSection`        | type (SectionType), order, visible          |
| `ResumeAttachmentBase` | type, fileName, fileUrl, fileSize, mimeType |

### Utility Functions

```typescript
// Calculate Korean age from birth date
calculateKoreanAge(birthDate: string | Date): number

// Calculate age from birth year (approximate)
calculateAgeFromYear(birthYear: number): number

// Get age from Resume (uses birthDate or falls back to birthYear)
getAge(resume: Pick<Resume, 'birthDate' | 'birthYear'>): number | undefined
```

## Legal Types

### Enums

```typescript
enum ConsentType {
  TERMS_OF_SERVICE      // Required
  PRIVACY_POLICY        // Required
  MARKETING_EMAIL       // Optional
  MARKETING_PUSH        // Optional
  MARKETING_PUSH_NIGHT  // Optional (Korea 21:00-08:00)
  MARKETING_SMS         // Optional
  PERSONALIZED_ADS      // Optional
  THIRD_PARTY_SHARING   // Optional
}

enum LegalDocumentType {
  TERMS_OF_SERVICE
  PRIVACY_POLICY
  MARKETING_POLICY
  PERSONALIZED_ADS
}
```

### Consent Types

```typescript
interface ConsentRequirement {
  type: ConsentType;
  required: boolean;
  labelKey: string;
  descriptionKey: string;
}

interface ConsentSubmission {
  type: ConsentType;
  agreed: boolean;
}

interface ConsentDocumentSummary {
  id: string;
  version: string;
  title: string;
  summary: string | null;
}

interface ConsentRequirementWithDocument extends ConsentRequirement {
  documentType: LegalDocumentType;
  nightTimeHours?: { start: number; end: number };
  document: ConsentDocumentSummary | null;
}

interface UserConsentPayload {
  id: string;
  userId: string;
  consentType: ConsentType;
  documentId?: string;
  documentVersion?: string;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt?: Date;
}

interface CreateConsentDto {
  consentType: ConsentType;
  documentId?: string;
  agreed: boolean;
}

interface UpdateConsentDto {
  agreed: boolean;
}
```

### Document Types

```typescript
interface LegalDocumentPayload {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  effectiveDate: Date;
}

interface LegalDocumentFull extends LegalDocumentPayload {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Response Types

```typescript
interface ConsentRequirementsResponse {
  requirements: ConsentRequirement[];
}

interface ConsentRequirementsWithRegionResponse {
  region: string; // 'KR', 'JP', 'EU', 'US', 'DEFAULT'
  law: string; // 'PIPA (개인정보보호법)'
  nightTimePushRestriction?: { start: number; end: number };
  requirements: ConsentRequirementWithDocument[];
}

interface RegisterWithConsentsDto {
  email: string;
  username: string;
  password: string;
  name: string;
  consents: ConsentSubmission[];
  language?: string; // 'ko', 'en', 'ja', 'hi'
  country?: string; // 'KR', 'JP', 'US', 'GB', 'IN'
  timezone?: string; // 'Asia/Seoul'
}
```

## Common Types

### API Response

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
}

interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}
```

### Pagination

```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
```

## Usage

```typescript
import {
  // Auth
  User,
  Role,
  AuthProvider,
  AuthPayload,
  JwtPayload,
  // Resume
  Resume,
  Experience,
  Skill,
  SkillItem,
  // Legal
  ConsentType,
  ConsentRequirementsWithRegionResponse,
  UserConsentPayload,
  // Common
  ApiResponse,
  PaginatedResponse,
} from '@my-girok/types';
```

## Build

```bash
pnpm --filter @my-girok/types build
```
