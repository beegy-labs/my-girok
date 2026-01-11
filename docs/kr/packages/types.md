# @my-girok/types

> My-Girok 플랫폼을 위한 공유 TypeScript 타입

## 패키지 구조

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

## 열거형

### 인증

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

### 이력서

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

### 법률

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

## 핵심 인터페이스

### 사용자

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

### 인증

```typescript
interface AuthPayload {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}
```

### 이력서

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

### API 응답

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

## 사용법

```typescript
import { User, Role, AuthProvider, Resume, ApiResponse } from '@my-girok/types';
```

## 명령어

```bash
# Build types package
pnpm --filter @my-girok/types build

# Watch mode for development
pnpm --filter @my-girok/types dev
```

---

**LLM 참조**: `docs/llm/packages/types.md`
