# @my-girok/types

> Shared TypeScript types for the My-Girok platform

## Package Structure

```
packages/types/src/
  auth/      # Authentication types
    Role, AuthProvider, TokenType, DTOs
  user/      # User types
    User, Session, DomainAccessToken
  resume/    # Resume types
    Resume, Experience, Skill, Education
  legal/     # Legal types
    ConsentType, LegalDocumentType
  common/    # Common types
    ApiResponse, Pagination
```

## Enums

### Authentication

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

### Resume

```typescript
enum SectionType {
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECT = 'PROJECT',
  EDUCATION = 'EDUCATION',
  CERTIFICATE = 'CERTIFICATE',
  KEY_ACHIEVEMENTS = 'KEY_ACHIEVEMENTS',
  APPLICATION_REASON = 'APPLICATION_REASON',
  ATTACHMENTS = 'ATTACHMENTS',
  COVER_LETTER = 'COVER_LETTER',
}

enum DegreeType {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ASSOCIATE_2 = 'ASSOCIATE_2',
  ASSOCIATE_3 = 'ASSOCIATE_3',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

enum GpaFormat {
  SCALE_4_0 = 'SCALE_4_0',
  SCALE_4_5 = 'SCALE_4_5',
  SCALE_100 = 'SCALE_100',
}

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}
```

### Legal

```typescript
enum ConsentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  MARKETING_EMAIL = 'MARKETING_EMAIL',
  MARKETING_PUSH = 'MARKETING_PUSH',
  // ...more types
}

enum LegalDocumentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  MARKETING_POLICY = 'MARKETING_POLICY',
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
}
```

## Key Interfaces

### User

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

### Authentication

```typescript
interface AuthPayload {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}
```

### Resume

```typescript
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
  projects: ExperienceProject[];
}

interface Skill {
  category: string;
  items: SkillItem[];
}
```

### API Response

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
```

## Usage

```typescript
import { User, Role, AuthProvider, Resume, ApiResponse } from '@my-girok/types';
```

## Commands

```bash
# Build types package
pnpm --filter @my-girok/types build

# Watch mode for development
pnpm --filter @my-girok/types dev
```

---

**LLM Reference**: `docs/llm/packages/types.md`
