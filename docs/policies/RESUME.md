# Resume Management Policy

> Policies and guidelines for resume management features in My-Girok

## Overview

The resume management system allows users to create, manage, and share their professional resumes. This document outlines the architecture, business rules, and technical specifications for the resume feature.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                      Web Main App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  HomePage    │  │ MyResumePage │  │ EditPage     │  │
│  │  (Dashboard) │  │ (Management) │  │ (Editor)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Web BFF     │
                    └───────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │  Personal Service │
                  │  (Resume Logic)   │
                  └───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │  (Resume DB)  │
                    └───────────────┘
```

### Key Pages

#### 1. HomePage (`/`)
- **Purpose**: Entry point for resume feature
- **Route**: `/resume/my` (for logged-in users)
- **Actions**: Navigate to resume management dashboard

#### 2. MyResumePage (`/resume/my`)
- **Purpose**: Resume management dashboard
- **Authentication**: Required (PrivateRoute)
- **Features**:
  - List all resumes
  - Create new resume
  - Edit existing resume
  - Preview resume
  - Delete resume
  - Share resume with time-limited links
  - View share statistics

#### 3. PublicResumePage (`/resume/:username`)
- **Purpose**: Public view of user's default resume
- **Authentication**: Not required
- **Access**: Public or via share links

#### 4. ResumeEditPage (`/resume/:username/edit`)
- **Purpose**: Create/edit resume
- **Authentication**: Required (PrivateRoute)
- **Features**: Full CRUD operations on resume data

#### 5. ResumePreviewPage (`/resume/:username/preview`)
- **Purpose**: Preview resume before publishing
- **Authentication**: Required (PrivateRoute)
- **Features**: Print-ready view, edit button

## Data Model

### Resume Entity

```typescript
interface Resume {
  id: string;
  userId: string;
  title: string;              // "대기업용", "스타트업용", etc.
  description?: string;       // Purpose description
  isDefault: boolean;         // Default resume for public profile
  paperSize?: PaperSize;      // A4 or LETTER

  // Personal Information
  name: string;
  email: string;
  phone?: string;
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  profileImage?: string;

  // Korean-specific fields
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  coverLetter?: string;
  careerGoals?: string;

  // Resume Sections
  sections: ResumeSection[];
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  educations: Education[];
  certificates: Certificate[];
  attachments?: ResumeAttachment[];

  createdAt: string;
  updatedAt: string;
}
```

### Share Link Entity

```typescript
interface ShareLink {
  id: string;
  token: string;              // Unique share token
  resourceType: string;       // "resume"
  resourceId: string;         // Resume ID
  userId: string;             // Owner ID
  expiresAt: string | null;   // null = permanent
  isActive: boolean;          // Can be deactivated
  viewCount: number;          // Track views
  lastViewedAt: string | null;
  shareUrl: string;           // Full URL
  createdAt: string;
  updatedAt: string;
}
```

## Business Rules

### Resume Management

#### 1. Resume Creation
- **Limit**: No hard limit on number of resumes per user
- **Default Resume**: First resume is automatically set as default
- **Required Fields**:
  - `title`: Resume identifier
  - `name`: User's full name
  - `email`: Contact email
- **Optional Fields**: All other fields are optional

#### 2. Resume Updates
- **Owner Only**: Users can only edit their own resumes
- **Version Control**: Each update modifies `updatedAt` timestamp
- **Default Toggle**: Only one resume can be default at a time

#### 3. Resume Deletion
- **Confirmation Required**: Must confirm before deletion
- **Cascade Delete**: Associated share links are also deleted
- **Default Protection**: If deleting default resume with other resumes, automatically set another as default

#### 4. Resume Visibility
- **Private by Default**: New resumes are private
- **Public Access**: Default resume is accessible via `/resume/:username`
- **Share Links**: Non-default resumes can be shared via time-limited links

### Share Link Management

#### 1. Share Link Creation
- **Duration Options**:
  - `ONE_WEEK`: 7 days
  - `ONE_MONTH`: 30 days
  - `THREE_MONTHS`: 90 days
  - `PERMANENT`: No expiration
- **Token Generation**: Secure random token
- **URL Format**: `https://my.girok.dev/share/public/{token}`

#### 2. Share Link Access
- **No Authentication**: Public access via token
- **Expiry Check**: Validate expiration before serving
- **View Tracking**: Increment view count on each access
- **Active Status**: Can be deactivated without deletion

#### 3. Share Link Statistics
- **View Count**: Total number of views
- **Last Viewed**: Timestamp of last access
- **Expiry Status**: Active/expired/deactivated

## API Endpoints

### Resume Operations

```typescript
// Get all user's resumes
GET /v1/resume
Response: Resume[]

// Get default resume
GET /v1/resume/default
Response: Resume

// Get specific resume
GET /v1/resume/:resumeId
Response: Resume

// Create resume
POST /v1/resume
Body: CreateResumeDto
Response: Resume

// Update resume
PUT /v1/resume/:resumeId
Body: UpdateResumeDto
Response: Resume

// Delete resume
DELETE /v1/resume/:resumeId
Response: void

// Set as default
PATCH /v1/resume/:resumeId/default
Response: Resume

// Get public resume by username
GET /v1/resume/public/:username
Response: Resume
```

### Share Link Operations

```typescript
// Create share link
POST /v1/share/resume/:resumeId
Body: CreateShareLinkDto { duration: ShareDuration }
Response: ShareLink

// Get all user's share links
GET /v1/share
Response: ShareLink[]

// Get specific share link
GET /v1/share/:id
Response: ShareLink

// Update share link
PATCH /v1/share/:id
Body: UpdateShareLinkDto { duration?, isActive? }
Response: ShareLink

// Delete share link
DELETE /v1/share/:id
Response: void

// Access public resume via share token
GET /v1/share/public/:token
Response: Resume
```

## UI/UX Guidelines

### Resume Management Dashboard

#### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│  Header: "나의 이력서"                [새 이력서 만들기]│
├─────────────────────────────────────────────────────┤
│  Resume List                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ Title [기본] [공유 중]                          │  │
│  │ Description                                    │  │
│  │ Last Modified: YYYY-MM-DD                     │  │
│  │ Share Expiry: YYYY-MM-DD                      │  │
│  │ [미리보기] [수정] [공유] [삭제]                  │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Share Links                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ Share Link [활성]                              │  │
│  │ URL: https://...                              │  │
│  │ Views: 42 | Expires: YYYY-MM-DD               │  │
│  │                                        [삭제]   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### Visual Indicators
- **Default Badge**: Amber background (`bg-amber-100 text-amber-800`)
- **Sharing Badge**: Green background (`bg-green-100 text-green-800`)
- **Active Share**: Green text for expiry info
- **Expired Share**: Gray background (`bg-gray-100 text-gray-800`)

#### Interaction Patterns
- **Hover Effects**: Card elevation and border color change
- **Button States**:
  - Primary actions: Amber gradient buttons
  - Secondary actions: White/gray buttons
  - Destructive actions: Red tinted buttons
- **Confirmation Dialogs**: Required for delete operations

### Share Modal

```
┌─────────────────────────────────┐
│  공유 링크 만들기                 │
│                                  │
│  공유 기간                        │
│  [Dropdown: 1주일/1개월/3개월/영구]│
│                                  │
│  [취소]              [생성]       │
└─────────────────────────────────┘
```

## Security Considerations

### Access Control
- **Owner Verification**: Validate user owns resume before any operation
- **Share Token**: Cryptographically secure random tokens
- **Rate Limiting**: Prevent share link abuse
- **CORS**: Restrict API access to known origins

### Data Privacy
- **Personal Information**: Resume data contains PII
- **Public Access**: Only default resume or shared resumes are public
- **Share Link Revocation**: Users can deactivate links anytime
- **Audit Trail**: Track share link views for security monitoring

### Input Validation
- **Resume Fields**: Validate email format, URL formats
- **File Uploads**: Validate attachment types and sizes
- **Share Duration**: Validate against allowed enum values
- **SQL Injection**: Use Prisma ORM parameterized queries

## Performance Optimization

### Database Queries
```typescript
// ❌ DON'T: N+1 query
const resumes = await prisma.resume.findMany();
for (const resume of resumes) {
  const shareLinks = await prisma.shareLink.findMany({
    where: { resourceId: resume.id }
  });
}

// ✅ DO: Include relations
const resumes = await prisma.resume.findMany({
  include: {
    shareLinks: {
      where: { isActive: true }
    }
  }
});
```

### Caching Strategy
- **Public Resumes**: Cache for 5 minutes (stale-while-revalidate)
- **Share Links**: No cache (track view counts)
- **User's Resume List**: Cache for 1 minute

### Pagination
- **Resume List**: Load all (reasonable limit per user)
- **Share Links**: Paginate if > 50 links
- **Public Resume Search**: Implement cursor pagination

## Error Handling

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `RESUME_NOT_FOUND` | Resume doesn't exist | 404 |
| `RESUME_UNAUTHORIZED` | Not resume owner | 403 |
| `SHARE_LINK_EXPIRED` | Share link expired | 410 |
| `SHARE_LINK_INACTIVE` | Share link deactivated | 403 |
| `SHARE_LINK_NOT_FOUND` | Share link doesn't exist | 404 |
| `DEFAULT_RESUME_REQUIRED` | Cannot delete last resume | 400 |

### User-Facing Messages
- **Korean UI**: All error messages in Korean
- **Actionable**: Include next steps
- **Non-Technical**: Avoid exposing technical details

Example:
```typescript
// ✅ Good
"이력서를 찾을 수 없습니다"
"공유 링크가 만료되었습니다"
"이력서를 삭제할 수 없습니다. 최소 1개의 이력서가 필요합니다"

// ❌ Bad
"RESUME_NOT_FOUND"
"Database query failed"
"Constraint violation: fk_user_id"
```

## Testing Requirements

### Unit Tests
- Resume CRUD operations
- Share link generation and validation
- Default resume logic
- Permission checks

### Integration Tests
- End-to-end resume creation flow
- Share link access and expiry
- Public resume access
- Cascade delete behavior

### E2E Tests
- User creates resume from dashboard
- User shares resume and accesses via link
- User deletes resume with active shares
- Anonymous user accesses public resume

### Test Coverage
- **Minimum**: 80% code coverage
- **Critical Paths**: 100% coverage for:
  - Share link validation
  - Permission checks
  - Default resume logic

## Migration & Versioning

### Schema Changes
- **Backward Compatible**: New fields are optional
- **Migration Strategy**: Zero-downtime deployments
- **Rollback Plan**: Maintain previous schema version

### Data Migration
- **Existing Users**: Auto-create default resume on first access
- **Share Links**: Migrate old public URLs to new token system
- **Attachments**: S3 bucket migration with URL updates

## Monitoring & Analytics

### Key Metrics
- **Resume Creation**: Track new resume count
- **Share Links**: Track creation and view counts
- **Public Views**: Track public resume page views
- **Errors**: Monitor 404s and permission errors

### Logging
```typescript
// Resume operations
logger.info('Resume created', { userId, resumeId, title });
logger.info('Resume updated', { userId, resumeId });
logger.info('Resume deleted', { userId, resumeId });

// Share links
logger.info('Share link created', { userId, resumeId, duration });
logger.info('Share link accessed', { token, resumeId, viewCount });
logger.warn('Share link expired access', { token, resumeId });
```

### Alerts
- **Error Rate**: Alert if > 5% error rate
- **Share Link Abuse**: Alert if single token > 1000 views/day
- **Database Performance**: Alert if query time > 500ms

## Future Enhancements

### Planned Features
1. **PDF Export**: Generate PDF from resume
2. **Multiple Templates**: Different resume layouts
3. **Version History**: Track resume changes over time
4. **Collaborative Editing**: Share edit access
5. **Analytics Dashboard**: Detailed view statistics
6. **Resume Recommendations**: AI-powered suggestions

### Under Consideration
- **Resume Scoring**: AI-based resume quality score
- **Job Matching**: Match resumes to job postings
- **Privacy Controls**: Fine-grained visibility settings
- **Custom Domains**: Vanity URLs for resumes

## References

- **Design System**: `/docs/DESIGN_SYSTEM.md`
- **API Documentation**: `/docs/api/personal-service.md`
- **Security Policy**: `/docs/policies/SECURITY.md`
- **Testing Guidelines**: `/docs/policies/TESTING.md`

## Korean Developer Resume Features

### Overview
The resume system has been enhanced to support Korean job market requirements, specifically tailored for software developers.

### Korean-Specific Fields

#### 1. Military Service Status (병역 여부)
- **Field**: `militaryService`
- **Type**: Enum - `COMPLETED` | `EXEMPTED` | `NOT_APPLICABLE`
- **Purpose**: Required information for male job applicants in Korea
- **Display**: Shows in header section next to contact information
- **Options**:
  - `COMPLETED`: Military service completed (군필)
  - `EXEMPTED`: Exempted from service (면제)
  - `NOT_APPLICABLE`: Not applicable (해당없음) - for female applicants or foreign nationals

#### 2. Cover Letter (자기소개서)
- **Field**: `coverLetter`
- **Type**: Long text (textarea)
- **Purpose**: Self-introduction describing background, strengths, and fit for the position
- **Display**: Appears as a dedicated section after Summary
- **Guidelines**:
  - Describe background and experiences
  - Highlight unique qualities and strengths
  - Explain why you're a good fit for the position
  - Typical length: 500-1000 words

#### 3. Career Goals (입사 후 포부)
- **Field**: `careerGoals`
- **Type**: Long text (textarea)
- **Purpose**: Describe aspirations and what you want to achieve after joining
- **Display**: Appears as a dedicated section after Cover Letter
- **Guidelines**:
  - Share professional aspirations
  - Describe what you hope to accomplish in the role
  - Show alignment with company goals
  - Demonstrate long-term commitment
  - Typical length: 300-500 words

### Profile Photo

#### Requirements
- **Field**: `profileImage`
- **Type**: URL string (can be uploaded via Attachments)
- **Purpose**: Professional headshot for Korean resume format
- **Display**:
  - Position: Top-left of resume header
  - Size: 3cm × 4cm (passport photo size)
  - Style: Auto-converts to grayscale for print
  - Border: Subtle border matching resume theme

#### Upload Options
1. **URL Input**: Paste direct image URL in Basic Information section
2. **File Upload**: Use Attachments section → Profile Photo category
3. **MinIO Storage**: Files uploaded via attachments are stored in MinIO

### Resume Sections and Ordering

#### Fixed Sections (Non-reorderable)
These sections always appear at the top in a fixed order:
1. **Header** - Name, photo, contact info, military service
2. **Summary** - Brief professional introduction
3. **Cover Letter** - Self-introduction (if filled)
4. **Career Goals** - Professional aspirations (if filled)

#### Dynamic Sections (Reorderable)
Users can drag-and-drop these sections to customize their resume order:
1. **Skills** (기술 스택)
2. **Experience** (경력)
3. **Projects** (프로젝트)
4. **Education** (학력)
5. **Certifications** (자격증)

#### Section Visibility
- Each dynamic section can be toggled visible/hidden
- Hidden sections don't appear in the final resume
- Useful for creating multiple resume versions (startup vs. large company)

### Live Preview Feature

#### Implementation
- **Layout**: Side-by-side on desktop (form left, preview right)
- **Mobile**: Toggle button to switch between form and preview
- **Update Frequency**: Real-time (updates as you type)
- **Scaling**: Preview scaled to 75% for optimal viewport fit
- **Sticky**: Preview panel stays visible while scrolling form

#### Benefits
- Instant visual feedback
- Reduces formatting errors
- Helps maintain consistent style
- Shows exactly how resume will look when printed/exported

### Best Practices

#### For Korean Developer Resumes
1. **Profile Photo**: Professional, recent photo (last 6 months)
2. **Military Service**: Always fill for male Korean nationals
3. **Cover Letter**:
   - Be specific about technical achievements
   - Mention relevant projects and technologies
   - Show personality and communication skills
4. **Career Goals**:
   - Align with company's tech stack and culture
   - Demonstrate growth mindset
   - Be realistic and achievable
5. **Section Order**:
   - Junior developers: Projects → Skills → Education → Experience
   - Senior developers: Experience → Projects → Skills → Education

#### Localization
- Korean labels in UI (병역, 자기소개서, 입사 후 포부)
- English labels in resume output (for international opportunities)
- Support for both Korean and English content in all fields

## Change Log

- **2025-01-10**: Added Korean developer resume features
  - Military service status field
  - Cover letter section
  - Career goals section
  - Profile photo support in header
  - Live preview with side-by-side layout
  - Section reordering capability (dynamic sections only)
  - Input text visibility improvements

- **2025-01-09**: Initial resume policy documentation
  - Resume management dashboard
  - Share link system
  - Multi-resume support
