# @my-girok/types

> Shared TypeScript types

## Structure

```
packages/types/src/
├── auth/     # Role, AuthProvider, DTOs
├── user/     # User, Session, AccountLink
├── admin/    # Operator, Permission
├── service/  # Service, Consent (Global Account)
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

// Legacy JWT (backward compatible)
interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'ACCESS' | 'REFRESH' | 'DOMAIN_ACCESS';
}

// New Global Account JWT Types
interface UserJwtPayload {
  sub: string;
  email: string;
  type: 'USER_ACCESS' | 'USER_REFRESH';
  accountMode: 'SERVICE' | 'UNIFIED';
  countryCode: string;
  services: { [slug: string]: { status: string; countries: string[] } };
}

interface AdminJwtPayload {
  sub: string;
  email: string;
  name: string;
  type: 'ADMIN_ACCESS' | 'ADMIN_REFRESH';
  scope: 'SYSTEM' | 'TENANT';
  tenantId?: string;
  roleId: string;
  roleName: string;
  level: number;
  permissions: string[];
  services?: { [slug: string]: { roleId: string; countries: string[] } };
}

interface OperatorJwtPayload {
  sub: string;
  email: string;
  name: string;
  type: 'OPERATOR_ACCESS' | 'OPERATOR_REFRESH';
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  permissions: string[];
}

type JwtPayloadUnion = UserJwtPayload | AdminJwtPayload | OperatorJwtPayload;
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
  PROJECT, // @deprecated - kept for backward compatibility
  EDUCATION,
  CERTIFICATE,
  KEY_ACHIEVEMENTS, // 핵심 성과
  APPLICATION_REASON, // 지원 동기
  ATTACHMENTS, // 첨부파일
  COVER_LETTER, // 자기소개서
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
  PREFER_NOT_TO_SAY,
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

## Account & Service

```typescript
enum AccountMode {
  SERVICE, // Per-service independent
  UNIFIED, // Integrated across services
}

enum UserServiceStatus {
  ACTIVE,
  SUSPENDED,
  WITHDRAWN,
}

enum AccountLinkStatus {
  PENDING,
  ACTIVE,
  UNLINKED,
}
```

## Legal

```typescript
enum ConsentType {
  TERMS_OF_SERVICE, // Required
  PRIVACY_POLICY, // Required
  MARKETING_EMAIL, // Optional
  MARKETING_PUSH, // Optional
  MARKETING_PUSH_NIGHT, // Korea PIPA
  MARKETING_SMS, // Optional
  PERSONALIZED_ADS, // Optional
  THIRD_PARTY_SHARING, // Optional
  CROSS_BORDER_TRANSFER, // Japan APPI
  CROSS_SERVICE_SHARING, // UNIFIED mode
}

interface UserConsentPayload {
  consentType: ConsentType;
  countryCode: string;
  agreed: boolean;
  agreedAt: Date;
}
```

## Service (Global Account)

```typescript
// Row types for raw SQL queries
interface ServiceRow {
  id: string;
  slug: string;
  name: string;
}

interface UserServiceRow {
  userId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  status: string;
  joinedAt: Date;
}

interface ConsentRequirementRow {
  id: string;
  serviceId: string;
  consentType: string;
  countryCode: string;
  isRequired: boolean;
}

interface UserConsentRow {
  id: string;
  userId: string;
  serviceId: string;
  consentType: string;
  agreed: boolean;
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
