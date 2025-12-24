# @my-girok/types

> Shared TypeScript types

## Structure

```
packages/types/src/
├── auth/     # Role, AuthProvider, DTOs
├── user/     # User, Session
├── resume/   # Resume, Experience, Skill
├── legal/    # ConsentType, Documents
├── common/   # ApiResponse, Pagination
└── index.ts
```

## Auth

```typescript
enum Role {
  GUEST,
  USER,
  MANAGER,
  MASTER,
}
enum AuthProvider {
  LOCAL,
  GOOGLE,
  KAKAO,
  NAVER,
  APPLE,
}
enum TokenType {
  ACCESS,
  REFRESH,
  DOMAIN_ACCESS,
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
}
```

## User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: Role;
  provider: AuthProvider;
}
```

## Resume

```typescript
// Enums
enum SectionType {
  SKILLS,
  EXPERIENCE,
  PROJECT,
  EDUCATION,
  CERTIFICATE,
}
enum DegreeType {
  HIGH_SCHOOL,
  ASSOCIATE_2,
  ASSOCIATE_3,
  BACHELOR,
  MASTER,
  DOCTORATE,
}
enum Gender {
  MALE,
  FEMALE,
  OTHER,
}

// Core
interface Resume {
  id: string;
  userId: string;
  title: string;
  name: string;
  email: string;
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  educations: Education[];
}

interface Experience {
  company: string;
  startDate: string;
  finalPosition: string;
  jobTitle: string;
  projects: ExperienceProject[];
}

interface Skill {
  category: string;
  items: SkillItem[]; // name + descriptions (4-depth)
}
```

## Legal

```typescript
enum ConsentType {
  TERMS_OF_SERVICE, // Required
  PRIVACY_POLICY, // Required
  MARKETING_EMAIL, // Optional
  MARKETING_PUSH, // Optional
  MARKETING_PUSH_NIGHT, // Korea only
}

interface UserConsentPayload {
  consentType: ConsentType;
  agreed: boolean;
  agreedAt: Date;
}
```

## Common

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
```

## Usage

```typescript
import { User, Role, Resume, ApiResponse } from '@my-girok/types';
```

## Commands

```bash
pnpm --filter @my-girok/types build
```

---

**Human docs**: [docs/packages/TYPES.md](../../docs/packages/TYPES.md)
