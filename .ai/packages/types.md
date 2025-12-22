# @my-girok/types

> Shared TypeScript types and Protobuf definitions

## Purpose

Central repository for all shared types across the monorepo. Includes TypeScript interfaces, DTOs, and Protobuf definitions for gRPC services.

## Structure

```
packages/types/
├── src/
│   ├── auth/           # Authentication types
│   │   ├── user.ts
│   │   ├── token.ts
│   │   └── session.ts
│   ├── legal/          # Legal & consent types
│   │   ├── enums.ts
│   │   ├── dto.ts
│   │   └── index.ts
│   ├── resume/         # Resume types
│   │   ├── resume.ts
│   │   ├── experience.ts
│   │   └── share.ts
│   ├── feed/           # Feed types
│   │   ├── post.ts
│   │   ├── comment.ts
│   │   └── timeline.ts
│   ├── chat/           # Chat types
│   │   ├── room.ts
│   │   ├── message.ts
│   │   └── participant.ts
│   ├── common/         # Common types
│   │   ├── pagination.ts
│   │   ├── response.ts
│   │   └── error.ts
│   └── index.ts        # Barrel exports
├── proto/              # Protobuf definitions
│   ├── auth.proto
│   ├── feed.proto
│   ├── chat.proto
│   ├── matching.proto
│   └── media.proto
├── package.json
└── tsconfig.json
```

## Usage

```typescript
import {
  User,
  Resume,
  Post,
  ChatRoom,
  Message,
  PaginatedResponse,
  ApiErrorResponse,
} from '@my-girok/types';
```

## Auth Types

```typescript
// src/auth/user.ts
export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  provider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  MANAGER = 'MANAGER',
  MASTER = 'MASTER',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  APPLE = 'APPLE',
}

// src/auth/token.ts
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// src/auth/session.ts
export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  expiresAt: number;
}
```

## Legal Types

```typescript
// src/legal/enums.ts
export enum ConsentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE', // [Required] 이용약관 동의
  PRIVACY_POLICY = 'PRIVACY_POLICY', // [Required] 개인정보 수집·이용 동의
  MARKETING_EMAIL = 'MARKETING_EMAIL', // [Optional] 마케팅 이메일
  MARKETING_PUSH = 'MARKETING_PUSH', // [Optional] 마케팅 푸시
  MARKETING_PUSH_NIGHT = 'MARKETING_PUSH_NIGHT', // [Optional] 야간 푸시 (21:00-08:00)
  MARKETING_SMS = 'MARKETING_SMS', // [Optional] 마케팅 SMS
  PERSONALIZED_ADS = 'PERSONALIZED_ADS', // [Optional] 맞춤형 광고
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING', // [Optional] 제3자 정보 제공
}

export enum LegalDocumentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  MARKETING_POLICY = 'MARKETING_POLICY',
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
}

// src/legal/dto.ts
export interface ConsentItemDto {
  type: ConsentType;
  agreed: boolean;
}

export interface CreateConsentsDto {
  consents: ConsentItemDto[];
}

export interface ConsentRequirementDto {
  type: ConsentType;
  required: boolean;
  label: string;
  description: string;
  documentType?: LegalDocumentType;
}

export interface LegalDocumentResponseDto {
  id: string;
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary?: string;
  effectiveDate: Date;
}

export interface UserConsentResponseDto {
  id: string;
  consentType: ConsentType;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt?: Date;
  documentVersion?: string;
}
```

## Resume Types

```typescript
// src/resume/resume.ts
export interface Resume {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isDefault: boolean;
  paperSize: PaperSize;

  // Personal info
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  summary?: string;
  profilePhotoUrl?: string;

  // Relations
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certificates: Certificate[];

  createdAt: Date;
  updatedAt: Date;
}

export enum PaperSize {
  A4 = 'A4',
  LETTER = 'LETTER',
}

// src/resume/experience.ts
export interface Experience {
  id: string;
  resumeId: string;
  company: string;
  position: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  description?: string;
  achievements: string[];
  projects: Project[];
  sortOrder: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  achievements: string[];
  technologies: string[];
}
```

## Feed Types

```typescript
// src/feed/post.ts
export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

// src/feed/timeline.ts
export interface TimelineItem {
  post: Post;
  author: User;
  isLiked: boolean;
}

export interface TimelineConnection {
  edges: TimelineEdge[];
  pageInfo: PageInfo;
}

export interface TimelineEdge {
  node: TimelineItem;
  cursor: string;
}
```

## Chat Types

```typescript
// src/chat/room.ts
export interface ChatRoom {
  id: string;
  type: RoomType;
  name?: string;
  memberIds: string[];
  lastMessage?: Message;
  lastMessageAt?: Date;
  createdAt: Date;
}

export enum RoomType {
  DIRECT = 'direct',
  GROUP = 'group',
  RANDOM = 'random',
}

// src/chat/message.ts
export interface Message {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, string>;
  isDeleted: boolean;
  createdAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}
```

## Common Types

```typescript
// src/common/pagination.ts
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CursorPaginatedResponse<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: PageInfo;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// src/common/response.ts
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

## DTOs

```typescript
// src/auth/dto.ts
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  username: string;
  name?: string;
}

// src/resume/dto.ts
export interface CreateResumeDto {
  title: string;
  description?: string;
  name: string;
  email?: string;
  phone?: string;
  paperSize?: PaperSize;
}

export interface UpdateResumeDto extends Partial<CreateResumeDto> {
  experiences?: Omit<Experience, 'id' | 'resumeId'>[];
  educations?: Omit<Education, 'id' | 'resumeId'>[];
  skills?: Omit<Skill, 'id' | 'resumeId'>[];
}
```

## Protobuf Definitions

```protobuf
// proto/common.proto
syntax = "proto3";

package common;

message Empty {}

message Timestamp {
  int64 seconds = 1;
  int32 nanos = 2;
}

message PageInfo {
  bool has_next_page = 1;
  bool has_previous_page = 2;
  string start_cursor = 3;
  string end_cursor = 4;
}
```

## Installation

```bash
# Add as workspace dependency
pnpm add @my-girok/types --filter @my-girok/auth-service
pnpm add @my-girok/types --filter @my-girok/graphql-bff
```

## Build

```bash
# Build TypeScript
pnpm --filter @my-girok/types build

# Generate Protobuf (if using protoc)
pnpm --filter @my-girok/types proto:generate
```
