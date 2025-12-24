# Types Package Documentation

> Shared TypeScript types across the My-Girok monorepo

## Overview

The `@my-girok/types` package provides a single source of truth for all TypeScript types, enums, and interfaces used across frontend and backend services.

## Table of Contents

1. [Package Structure](#package-structure)
2. [Auth Types](#auth-types)
3. [User Types](#user-types)
4. [Resume Types](#resume-types)
5. [Legal Types](#legal-types)
6. [Common Types](#common-types)
7. [Usage](#usage)
8. [Development Guide](#development-guide)

---

## Package Structure

```
packages/types/src/
├── auth/
│   ├── enums.ts      # Role, AuthProvider, TokenType
│   ├── dto.ts        # Auth DTOs
│   └── index.ts
├── user/
│   └── user.ts       # User, Session, DomainAccessToken
├── resume/
│   └── index.ts      # Resume, Experience, Skill, etc.
├── legal/
│   ├── enums.ts      # ConsentType, LegalDocumentType
│   └── dto.ts        # Consent DTOs
├── common/
│   ├── api-response.ts  # ApiResponse, Pagination
│   └── index.ts
└── index.ts
```

---

## Auth Types

### Enums

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

### DTOs

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

interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  type: 'ACCESS' | 'REFRESH' | 'DOMAIN_ACCESS';
  domain?: string;
  iat?: number;
  exp?: number;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
```

---

## User Types

```typescript
interface User {
  id: string;
  email: string;
  username: string;
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

---

## Resume Types

### Enums

| Enum             | Values                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `SectionType`    | SKILLS, EXPERIENCE, PROJECT, EDUCATION, CERTIFICATE                |
| `DegreeType`     | HIGH_SCHOOL, ASSOCIATE_2, ASSOCIATE_3, BACHELOR, MASTER, DOCTORATE |
| `GpaFormat`      | SCALE_4_0, SCALE_4_5, SCALE_100                                    |
| `AttachmentType` | PROFILE_PHOTO, PORTFOLIO, CERTIFICATE, OTHER                       |
| `Gender`         | MALE, FEMALE, OTHER                                                |
| `PaperSize`      | 'A4', 'LETTER' (type, not enum)                                    |

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
  birthDate?: string; // YYYY-MM-DD
  gender?: Gender;

  // Korean-specific
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  militaryRank?: string;
  militaryDischargeType?: string;
  militaryServiceStartDate?: string;
  militaryServiceEndDate?: string;
  coverLetter?: string;
  applicationReason?: string;

  // Relations
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  educations: Education[];
  certificates: Certificate[];
  attachments?: ResumeAttachmentBase[];

  createdAt: string;
  updatedAt: string;
}
```

### Experience Types

```typescript
interface Experience {
  id?: string;
  company: string;
  startDate: string; // YYYY-MM
  endDate?: string;
  isCurrentlyWorking?: boolean;
  finalPosition: string;
  jobTitle: string;
  salary?: number;
  salaryUnit?: string;
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
  achievements: ProjectAchievement[];
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
  description?: string; // Legacy
  descriptions?: SkillDescription[]; // Hierarchical (4 depth)
}

interface Skill {
  id?: string;
  category: string; // "Language", "Framework"
  items: SkillItem[];
  order: number;
  visible: boolean;
}
```

### Utility Functions

```typescript
// Calculate Korean age from birth date
calculateKoreanAge(birthDate: string | Date): number

// Get age from Resume (uses birthDate or fallback to birthYear)
getAge(resume: Pick<Resume, 'birthDate' | 'birthYear'>): number | undefined
```

---

## Legal Types

### Enums

```typescript
enum ConsentType {
  TERMS_OF_SERVICE      // Required
  PRIVACY_POLICY        // Required
  MARKETING_EMAIL       // Optional
  MARKETING_PUSH        // Optional
  MARKETING_PUSH_NIGHT  // Optional (Korea)
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

### Consent Interfaces

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

interface ConsentRequirementsWithRegionResponse {
  region: string; // 'KR', 'JP', 'EU', 'US'
  law: string; // 'PIPA', 'GDPR', etc.
  nightTimePushRestriction?: { start: number; end: number };
  requirements: ConsentRequirementWithDocument[];
}
```

---

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

---

## Usage

### Import Pattern

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

  // Common
  ApiResponse,
  PaginatedResponse,
} from '@my-girok/types';
```

### Type Guards

```typescript
// Check if user has specific role
function isAdmin(user: User): boolean {
  return user.role === Role.MASTER || user.role === Role.MANAGER;
}

// Check if skill item has hierarchical descriptions
function hasDescriptions(item: SkillItem): boolean {
  return !!item.descriptions && item.descriptions.length > 0;
}
```

---

## Development Guide

### Building

```bash
# Build package
pnpm --filter @my-girok/types build

# Watch mode
pnpm --filter @my-girok/types dev
```

### Adding New Types

1. Create file in appropriate directory (`auth/`, `resume/`, etc.)
2. Export from directory's `index.ts`
3. Export from root `index.ts`
4. Rebuild package: `pnpm --filter @my-girok/types build`

### Type Versioning

When making breaking changes:

1. Add new interface with version suffix (e.g., `ResumeV2`)
2. Keep old interface for backward compatibility
3. Mark old interface as `@deprecated`
4. Update consumers gradually
5. Remove deprecated types in major version

### Best Practices

- Use `interface` for object shapes, `type` for unions/intersections
- Always add JSDoc comments for public types
- Use optional properties (`?`) sparingly
- Prefer strict null checks
- Export utility functions for common type operations

---

## Related Documentation

- **LLM Reference**: [.ai/packages/types.md](../../.ai/packages/types.md)
- **Auth Service**: [docs/services/AUTH_SERVICE.md](../services/AUTH_SERVICE.md)
- **Personal Service**: [docs/services/PERSONAL_SERVICE.md](../services/PERSONAL_SERVICE.md)

---

_Last updated: 2025-12-24_
