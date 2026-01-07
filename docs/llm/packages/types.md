# @my-girok/types

Shared TypeScript types

## Structure

```
packages/types/src/
  auth/    # Role, AuthProvider, TokenType, DTOs
  user/    # User, Session, DomainAccessToken
  resume/  # Resume, Experience, Skill, Education
  legal/   # ConsentType, LegalDocumentType
  common/  # ApiResponse, Pagination
```

## Enums

```yaml
Auth:
  Role: [GUEST, USER, MANAGER, MASTER]
  AuthProvider: [LOCAL, GOOGLE, KAKAO, NAVER, APPLE]
  TokenType: [ACCESS, REFRESH, DOMAIN_ACCESS]

Resume:
  SectionType:
    [
      SKILLS,
      EXPERIENCE,
      PROJECT,
      EDUCATION,
      CERTIFICATE,
      KEY_ACHIEVEMENTS,
      APPLICATION_REASON,
      ATTACHMENTS,
      COVER_LETTER,
    ]
  DegreeType: [HIGH_SCHOOL, ASSOCIATE_2, ASSOCIATE_3, BACHELOR, MASTER, DOCTORATE]
  GpaFormat: [SCALE_4_0, SCALE_4_5, SCALE_100]
  Gender: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]

Legal:
  ConsentType: [TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_EMAIL, MARKETING_PUSH, ...]
  LegalDocumentType: [TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_POLICY, PERSONALIZED_ADS]
```

## Key Interfaces

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: Role;
  provider: AuthProvider;
}

interface AuthPayload {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}

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
pnpm --filter @my-girok/types build  # Build
pnpm --filter @my-girok/types dev    # Watch
```
