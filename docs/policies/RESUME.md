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
  address?: string;              // City/District level (e.g., "서울특별시 강남구")
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  profileImage?: string;

  // Korean-specific fields
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  militaryDischarge?: string;    // Legacy field (backward compatibility)
  militaryRank?: string;         // 계급: 병장, 상병, 일병, 이병
  militaryDischargeType?: string; // 전역사유: 만기전역, 의병전역
  militaryServiceStartDate?: string; // 입대일: YYYY-MM format
  militaryServiceEndDate?: string;   // 전역일: YYYY-MM format
  coverLetter?: string;
  careerGoals?: string;

  // Resume Sections (all support unlimited entries)
  sections: ResumeSection[];
  skills: Skill[];              // Unlimited skill categories
  experiences: Experience[];    // Unlimited work experiences
  projects: Project[];          // Unlimited projects
  educations: Education[];      // Unlimited education entries
  certificates: Certificate[];  // Unlimited certifications
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

### React Component Optimization

**CRITICAL**: All resume pages must follow performance best practices.

#### Event Handler Memoization

```typescript
// ❌ DON'T: Inline functions in resume list
{resumes.map((resume) => (
  <button onClick={() => navigate(`/resume/edit/${resume.id}`)}>Edit</button>
))}

// ✅ DO: Memoize handlers
const navigateToEdit = useCallback((id: string) => {
  navigate(`/resume/edit/${id}`);
}, [navigate]);

{resumes.map((resume) => (
  <button onClick={() => navigateToEdit(resume.id)}>Edit</button>
))}
```

**Required for**:
- MyResumePage: All button handlers (edit, preview, copy, share, delete)
- ResumeEditPage: handleFormChange, handleSubmit
- ResumeForm: All section handlers

#### Form Change Optimization

```typescript
// ✅ Parent component memoizes onChange
const handleFormChange = useCallback((data: CreateResumeDto) => {
  const mockResume = /* create preview data */;
  setPreviewData(mockResume);
}, [resume?.id, resume?.sections, defaultSections]);

// ✅ Child component excludes onChange from deps
useEffect(() => {
  if (onChange) onChange(formData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formData]); // Only formData changes trigger
```

**Why**: Prevents infinite re-render loops when typing in form inputs.

#### Navigation Pattern

```typescript
// ❌ DON'T: State-based navigation (anti-pattern)
const [navigateToPreview, setNavigateToPreview] = useState<string | null>(null);

useEffect(() => {
  if (navigateToPreview) navigate(navigateToPreview);
}, [navigateToPreview]);

// ✅ DO: Direct navigation (React Router v7)
const handleSubmit = async (data: CreateResumeDto) => {
  const created = await createResume(data);
  navigate(`/resume/preview/${created.id}`); // Direct call
};
```

**Performance Impact**:
- Before: 60+ inline functions per render (10 resumes × 6 buttons)
- After: Handlers created once, 80%+ reduction in re-renders

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

#### 1. Military Service Details (병역 사항)
- **Status Field**: `militaryService`
  - **Type**: Enum - `COMPLETED` | `EXEMPTED` | `NOT_APPLICABLE`
  - **Options**:
    - `COMPLETED`: Military service completed (군필)
    - `EXEMPTED`: Exempted from service (면제)
    - `NOT_APPLICABLE`: Not applicable (해당없음) - for female applicants or foreign nationals
- **Structured Fields** (for COMPLETED status):
  - **Rank** (`militaryRank`):
    - Dropdown selection: 병장 (Sergeant), 상병 (Corporal), 일병 (Private First Class), 이병 (Private)
    - Standard Korean military ranks
  - **Discharge Type** (`militaryDischargeType`):
    - Dropdown selection: 만기전역 (Honorable Discharge), 의병전역 (Medical Discharge)
    - Common discharge categories
  - **Service Period** (`militaryServiceStartDate`, `militaryServiceEndDate`):
    - Two month picker inputs for start and end dates
    - Input type: `month` (browser native picker)
    - Format: YYYY-MM (e.g., "2020-01" ~ "2021-10")
    - Structured for validation and search
    - Prevents invalid date formats
- **Legacy Field**: `militaryDischarge`
  - **Type**: Free text string (maintained for backward compatibility)
  - **Examples**: "병장 제대", "2020.01 - 2021.10"
  - Used as fallback if structured fields are not available
- **Purpose**: Required information for male job applicants in Korea
- **Display**:
  - Korean locale: Shows rank, discharge type, and period (e.g., "병장 만기전역 (2020-01 ~ 2021-10)")
  - English locale: Shows simplified format (e.g., "Completed (2020-01 - 2021-10)")
- **Benefits**:
  - Consistent data format across all resumes
  - Easier to search and filter by service details
  - Professional structured input with dropdowns and month pickers
  - Better UX with native date pickers preventing format errors
  - Streamlined interface focusing on essential information

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
- **Responsive Scaling**:
  - Desktop (>794px): 100% original size
  - Tablet (~768px): Auto-scaled to ~93%
  - Mobile (~375px): Auto-scaled to ~43%
  - Maintains A4/Letter paper dimensions
  - Browser zoom still functional
- **Sticky**: Preview panel stays visible while scrolling form

#### Performance Optimizations
- **Debouncing**: 150ms delay on resize events (50x fewer re-renders)
- **RAF**: requestAnimationFrame for smooth 60fps updates
- **GPU Acceleration**: Hardware-accelerated transforms with translate3d
- **Smart Updates**: Only re-renders when scale value actually changes
- **Passive Listeners**: Non-blocking resize event handlers

#### Benefits
- Instant visual feedback
- Reduces formatting errors
- Helps maintain consistent style
- Shows exactly how resume will look when printed/exported
- Smooth scaling on all devices without performance issues

### Universal Dynamic Sections

#### Overview
All resume sections support unlimited entries, allowing users to create comprehensive resumes regardless of career path (service development, SI development, research, freelance, etc.).

#### Dynamic Section Features

##### 1. Work Experience (경력) - Unified with Projects

**IMPORTANT CHANGE (2025-01-13)**: Work Experience and Projects have been unified. Each company now has ONE final position and unlimited projects, replacing the previous multiple-roles structure.

- **Unlimited Companies**: Add as many companies as needed
- **Company Fields**:
  - Company name (required)
  - Start date (required)
  - End date (optional - leave empty for "Present")
  - **Final Position** (required) - 최종 직책, e.g., "Backend Team Lead"
  - **Job Title** (required) - 직급, e.g., "Senior Developer"
  - **Salary** (optional) - Salary amount at this company, e.g., 5000
  - **Salary Unit** (optional) - Salary unit, e.g., "만원" (KRW), "USD", "EUR", "JPY"
  - **Show Salary** (optional, default: false) - Toggle to show/hide salary in preview and public access
  - Order (for drag-and-drop)
  - Visibility toggle

- **Unlimited Projects per Company**: Each company can have unlimited projects
- **Project Fields**:
  - Project name (required) - e.g., "E-Commerce Platform Rebuild"
  - Role (optional) - e.g., "Lead Backend Developer"
  - Description (required) - Project overview
  - Start date (required)
  - End date (optional - leave empty for "Ongoing")
  - Tech stack (array) - Technologies used
  - URL (optional) - Project demo link
  - GitHub URL (optional) - Repository link
  - Hierarchical achievements (unlimited, 4 depth levels)

- **Hierarchical Achievement Structure**: Each project supports up to 4 levels of indentation
  - **Depth 1** (•): Main achievements/accomplishments
  - **Depth 2** (◦): Sub-achievements or details
  - **Depth 3** (▪): Further breakdown
  - **Depth 4** (▫): Most detailed level
  - **Indentation**: Standard 1.5em per level (approximately 6 spaces)
  - **Bullet Styles**: Follows standard document formatting conventions
    - Level 1: Filled circle (•)
    - Level 2: Open circle (◦)
    - Level 3: Filled square (▪)
    - Level 4: Open square (▫)
  - **Recursive Structure**: Achievements can have children for nested structure

- **UI Features**:
  - Drag-and-drop reordering at all levels (companies, projects, achievements)
  - Depth selector dropdown (•, ◦, ▪, ▫) for each achievement
  - Visual indentation in form editor
  - Collapsible project cards
  - Dynamic add/remove for companies, projects, and achievements
  - Library theme with amber colors (📚 for companies, 📁 for projects, ⭐ for achievements)

- **Use Cases**:
  - Multiple companies in career history
  - Multiple projects at each company
  - Detailed breakdown of project achievements
  - Hierarchical accomplishment structures (e.g., main feature → components → implementations → optimizations)
  - Contract/freelance positions with multiple projects
  - Team lead roles with project oversight

##### 2. Standalone Projects (프로젝트)

**NOTE**: As of 2025-01-13, the standalone Projects section has been removed from the UI. Projects are now entered within Work Experience under each company. This standalone Project type is kept for backward compatibility only.

- **Unlimited Entries**: Add all significant projects NOT associated with a company
- **Fields Per Entry**:
  - Project name (required)
  - Your role (e.g., "Lead Developer", "Solo Developer")
  - Start date (required)
  - End date (optional - "Ongoing" if empty)
  - Description (project overview)
  - Achievements (bullet points - unlimited)
  - Tech stack (array of technologies)
  - Demo URL (live deployment link)
  - GitHub URL (repository link)
  - Order (for drag-and-drop)
  - Visibility toggle
- **Add/Remove**: Dynamic buttons to manage entries
- **Use Cases**:
  - Personal projects
  - Open-source contributions
  - Hackathon projects
  - Side projects
  - Company projects (if different from experience)

##### 3. Skills (기술 스택)
- **Unlimited Categories**: Organize skills by category
- **Fields Per Category**:
  - Category name (e.g., "Languages", "Frameworks", "Tools")
  - Items (array of skill objects)
  - Order (for drag-and-drop)
  - Visibility toggle
- **Fields Per Skill Item**:
  - Skill name (required) - e.g., "React", "Node.js"
  - **Hierarchical Descriptions** (optional, 4 depth levels) - 활용 경험/세부 설명
    - **Depth 1** (•): Main usage experience
    - **Depth 2** (◦): Sub-details
    - **Depth 3** (▪): Further breakdown
    - **Depth 4** (▫): Most detailed level
    - **Indentation**: Standard 1.5em per level (approximately 6 spaces)
    - **Bullet Styles**: Follows standard document formatting conventions
      - Level 1: Filled circle (•)
      - Level 2: Open circle (◦)
      - Level 3: Filled square (▪)
      - Level 4: Open square (▫)
    - **Recursive Structure**: Descriptions can have children for nested structure
  - Legacy description (optional, backward compatibility) - Simple text
- **UI Features**:
  - Drag-and-drop reordering for skill items
  - Hierarchical description editor with "+ 추가" and "+ 하위" buttons
  - Visual depth indicators in form editor
  - Collapse/expand for hierarchical descriptions
  - Library theme with amber colors
- **Add/Remove**: Dynamic buttons to manage categories and skills
- **Common Categories**:
  - Programming Languages
  - Frontend Frameworks
  - Backend Frameworks
  - Databases
  - DevOps/Infrastructure
  - Tools & Methodologies
  - Cloud Platforms
  - Mobile Development
- **Use Cases**:
  - Detailed skill usage explanations
  - Progressive detail from high-level to specific implementations
  - Structured presentation of complex skill experiences
  - Professional resume formatting

##### 4. Education (학력)
- **Unlimited Entries**: Add all degrees and certifications
- **Fields Per Entry**:
  - School name (required)
  - Degree (e.g., "Bachelor's", "Master's", "Ph.D.")
  - Major (field of study)
  - GPA (optional)
  - Start date
  - End date (optional - "Present" if empty)
  - Order (for drag-and-drop)
  - Visibility toggle
- **Add/Remove**: Dynamic buttons to manage entries
- **Use Cases**:
  - Multiple degrees
  - Bootcamps
  - Online courses (if relevant)
  - Exchange programs
  - Continuing education

##### 5. Certifications (자격증)
- **Unlimited Entries**: Add all relevant certifications
- **Fields Per Entry**:
  - Certification name (required)
  - Issuing organization (required)
  - Issue date (required)
  - Expiry date (optional)
  - Credential URL (verification link)
  - Order (for drag-and-drop)
  - Visibility toggle
- **Add/Remove**: Dynamic buttons to manage entries
- **Common Certifications**:
  - AWS/GCP/Azure certifications
  - Programming language certifications
  - Security certifications (CISSP, CEH, etc.)
  - Project management (PMP, Scrum Master, etc.)
  - Korean certifications (정보처리기사, etc.)

#### Universal Resume Strategy

##### Service Development Companies
Typical section order and emphasis:
1. **Experience** (highlight company experience)
2. **Skills** (comprehensive tech stack)
3. **Projects** (side projects to show passion)
4. **Education**
5. **Certifications**

##### SI Development / Consulting
Typical section order and emphasis:
1. **Projects** (diverse client projects)
2. **Skills** (wide range of technologies)
3. **Experience** (consulting firms)
4. **Certifications** (professional credentials)
5. **Education**

##### Junior Developers / Bootcamp Graduates
Typical section order and emphasis:
1. **Projects** (showcase work)
2. **Skills** (learned technologies)
3. **Education** (bootcamp/degree)
4. **Certifications** (if any)
5. **Experience** (internships/part-time)

##### Research / Academic Positions
Typical section order and emphasis:
1. **Education** (degrees and publications)
2. **Projects** (research projects)
3. **Skills** (research tools and languages)
4. **Experience** (research positions)
5. **Certifications** (if relevant)

#### Print Optimization

##### Multi-Page Support
- **Natural Flow**: Content flows naturally across multiple pages
- **Page Breaks**:
  - Sections can break across pages (`page-break-inside: auto`)
  - Individual items stay together (`page-break-inside: avoid`)
  - Headings don't break from content (`page-break-after: avoid`)
- **Page Numbering**: Automatic "Page X / Y" in footer
- **No Orphans/Widows**: Minimum 2 lines at page top/bottom

##### URL Visibility in Print
- **Screen View**: Links shown as clickable text (e.g., "GitHub")
- **Print View**: Full URLs displayed (e.g., "GitHub: https://github.com/username")
- **Applies To**:
  - Personal links (GitHub, blog, LinkedIn, portfolio)
  - Project links (demo URL, GitHub URL)
  - Certification links (credential URL)
- **Implementation**: Conditional rendering with `print:hidden` and `hidden print:inline`

##### Paper Size Support
- **A4**: 210mm × 297mm (default for Korea, Europe)
- **Letter**: 215.9mm × 279.4mm (USA)
- **Margins**: 1cm all sides (optimized for maximum content space)
  - Screen view (continuous): 1cm padding on all sides
  - Screen view (paginated): 1cm padding via Paged.js
  - Print view: 0.5cm @page margin + 0.5cm content padding = 1cm total
  - Consistent across all view modes
- **Minimum Safe Margin**: 0.5cm for printer compatibility
- **Indicator**: Shows current paper size in preview (hidden in print)
- **Print Priority**: Print and PDF export use paginated view (Paged.js) for optimal page breaks
- **Overflow Prevention**:
  - Content automatically wraps and clips to prevent page boundary overflow
  - Word-break and overflow-wrap applied to all text elements
  - Maximum width constraints enforced on all containers

##### Print Styling & Preview Design

**Design Philosophy**: The resume preview uses high-contrast grayscale design for optimal readability and print compatibility, separate from the brand's amber theme used in editing UI.

- **Grayscale Palette**: Uses gray-50 through gray-900 (NOT pure black/white)
  - Headers: `gray-900` (#111827) - Strong emphasis
  - Body text: `gray-700` (#374151) - Readable
  - Secondary text: `gray-600` (#4B5563)
  - Borders: `gray-400` (#9CA3AF) - Section dividers
  - Backgrounds: `gray-50` (#F9FAFB), `gray-100` (#F3F4F6)
- **High Contrast**: Ensures 7:1 minimum contrast ratio for text
- **Profile Photo**: Auto-grayscale filter (`filter: grayscale(100%)`)
- **No Brand Colors**: ResumePreview component does NOT use amber theme
- **Clean Layout**: Minimal decoration, focus on content hierarchy
- **Print-Optimized**: Reduces printing costs, ATS-friendly format
- **Separate UI**: Editing interface maintains amber brand identity

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
- **Multi-language Support**: Korean, English, Japanese via i18n
- **Default Language**: Korean (ko)
- **Fallback Language**: English (en)
- **Language Persistence**: User preference stored in localStorage
- **Translation Coverage**: All section headers, descriptions, and UI labels
- Support for both localized labels and multi-language content in all fields

## Internationalization (i18n)

### Overview
The resume system supports multiple languages through react-i18next, enabling users to view and edit resumes in their preferred language.

### Supported Languages

#### 1. Korean (ko) - Default
```json
{
  "resume.sections.settings": "이력서 설정",
  "resume.sections.basicInfo": "기본 정보",
  "resume.sections.experience": "경력",
  "resume.sections.projects": "프로젝트",
  "resume.sections.skills": "기술 스택",
  "resume.sections.education": "학력",
  "resume.sections.certifications": "자격증"
}
```

**Descriptions:**
- experience: "회사에서의 업무 경험을 추가하세요"
- projects: "개인 또는 팀 프로젝트를 추가하세요"
- skills: "보유 기술을 카테고리별로 정리하세요"
- education: "학교와 전공을 추가하세요"
- certifications: "보유한 자격증과 수상 경력을 추가하세요"

#### 2. English (en) - Fallback
```json
{
  "resume.sections.settings": "Resume Settings",
  "resume.sections.basicInfo": "Basic Information",
  "resume.sections.experience": "Work Experience",
  "resume.sections.projects": "Projects",
  "resume.sections.skills": "Skills",
  "resume.sections.education": "Education",
  "resume.sections.certifications": "Certifications"
}
```

**Descriptions:**
- experience: "Add your work history and achievements"
- projects: "Add your personal and professional projects"
- skills: "Organize your technical skills by category"
- education: "Add your educational background"
- certifications: "Add professional certifications and awards"

#### 3. Japanese (ja)
```json
{
  "resume.sections.settings": "履歴書設定",
  "resume.sections.basicInfo": "基本情報",
  "resume.sections.experience": "職務経歴",
  "resume.sections.projects": "プロジェクト",
  "resume.sections.skills": "スキル",
  "resume.sections.education": "学歴",
  "resume.sections.certifications": "資格"
}
```

**Descriptions:**
- experience: "職務経験と実績を追加してください"
- projects: "個人またはチームプロジェクトを追加してください"
- skills: "技術スキルをカテゴリ別に整理してください"
- education: "学歴を追加してください"
- certifications: "保有資格と受賞歴を追加してください"

### Configuration

#### i18n Setup (src/i18n/config.ts)
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'ko', // Default: Korean
    fallbackLng: 'en', // Fallback: English
    interpolation: {
      escapeValue: false,
    },
  });
```

### Usage in Components

#### ResumeForm.tsx
```typescript
import { useTranslation } from 'react-i18next';

export default function ResumeForm({ resume, onSubmit, onChange }: ResumeFormProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{t('resume.sections.experience')}</h2>
      <p>{t('resume.descriptions.experience')}</p>
    </div>
  );
}
```

#### ResumePreview.tsx
```typescript
function SkillsSection({ skills }: { skills: any[] }) {
  const { t } = useTranslation();

  return (
    <h2>{t('resume.sections.skills')}</h2>
  );
}
```

#### SectionOrderManager.tsx
```typescript
function SortableSection({ section }: { section: ResumeSection }) {
  const { t } = useTranslation();

  const getSectionLabel = (type: SectionType): string => {
    const labelMap: Record<SectionType, string> = {
      SKILLS: t('resume.sections.skills'),
      EXPERIENCE: t('resume.sections.experience'),
      PROJECT: t('resume.sections.projects'),
      EDUCATION: t('resume.sections.education'),
      CERTIFICATE: t('resume.sections.certifications'),
    };
    return labelMap[type];
  };

  return <span>{getSectionLabel(section.type)}</span>;
}
```

### Language Switching

Users can switch languages using the `LanguageSwitcher` component in the navbar:
- Changes apply immediately across all resume components
- Selected language is persisted to `localStorage`
- Page refresh maintains language preference

### Translation Keys Structure

```
resume
├── edit              # "Edit Resume"
├── preview           # "Preview"
├── viewPublic        # "View Public Profile"
├── sections
│   ├── settings      # Section headers
│   ├── basicInfo
│   ├── experience
│   ├── projects
│   ├── skills
│   ├── education
│   └── certifications
└── descriptions
    ├── experience    # Helper text
    ├── projects
    ├── skills
    ├── education
    └── certifications
```

### Best Practices

#### Adding New Translations
1. Add key to all three language files (ko.json, en.json, ja.json)
2. Use descriptive key names with dot notation (e.g., `resume.sections.newSection`)
3. Keep translations concise and professional
4. Test with all three languages

#### Translation Guidelines
- **Korean**: Use standard modern Korean (표준 한국어), not archaic terms
- **English**: Use professional American English
- **Japanese**: Use polite form (です・ます調)
- Maintain consistency in terminology across the application
- Use title case for English, sentence case for Korean/Japanese

#### Don'ts
- ❌ Don't hardcode text strings in components
- ❌ Don't use machine translation without review
- ❌ Don't mix languages in a single UI element
- ❌ Don't forget to add fallback translations

## Technical Implementation

### Dynamic Section Management Pattern

All dynamic sections (Experience, Projects, Skills, Education, Certificates) follow a consistent implementation pattern:

#### State Management
```typescript
// Form state holds arrays of entries
const [formData, setFormData] = useState<CreateResumeDto>({
  experiences: [],
  projects: [],
  skills: [],
  educations: [],
  certificates: [],
  // ... other fields
});
```

#### Add Entry Pattern
```typescript
<button
  onClick={() => {
    setFormData({
      ...formData,
      projects: [
        ...(formData.projects || []),
        {
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          role: '',
          achievements: [],
          techStack: [],
          url: '',
          githubUrl: '',
          order: formData.projects?.length || 0,
          visible: true,
        },
      ],
    });
  }}
>
  + Add Project
</button>
```

#### Remove Entry Pattern
```typescript
<button
  onClick={() => {
    const newProjects = formData.projects?.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: newProjects });
  }}
>
  Remove
</button>
```

#### Update Entry Pattern
```typescript
onChange={e => {
  const newProjects = [...(formData.projects || [])];
  newProjects[index] = { ...newProjects[index], name: e.target.value };
  setFormData({ ...formData, projects: newProjects });
}}
```

#### Live Preview Integration
```typescript
// Parent component (ResumeEditPage)
const handleFormChange = (data: CreateResumeDto) => {
  // Convert form data to Resume format for preview
  const mockResume: Resume = {
    id: resume?.id || 'preview',
    userId: user?.id || 'preview',
    title: data.title,
    // ... map all fields
    experiences: data.experiences?.map((exp, idx) => ({
      id: `exp-${idx}`,
      ...exp,
    })) || [],
    // ... other sections
  };
  setPreviewData(mockResume);
};

// Child component (ResumeForm)
<ResumeForm
  resume={resume}
  onSubmit={handleSubmit}
  onChange={handleFormChange}  // Triggers on every formData change
/>
```

### Print-Specific Styling Patterns

#### Conditional Rendering for URLs
```tsx
{/* Screen: Clickable link */}
<span className="print:hidden text-amber-700 hover:underline">
  <a href={resume.github}>GitHub</a>
</span>

{/* Print: Full URL displayed */}
<span className="hidden print:inline text-gray-900">
  GitHub: {resume.github}
</span>
```

#### Page Break Control
```css
/* In print.css */

/* Allow sections to break across pages */
.resume-section {
  page-break-inside: auto;
  break-inside: auto;
}

/* Keep individual items together */
.resume-item,
div[class*="mb-4"],
div[class*="mb-3"] {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Prevent headings from separating from content */
h1, h2, h3, h4, h5, h6 {
  page-break-after: avoid;
  page-break-inside: avoid;
  break-after: avoid;
  break-inside: avoid;
}
```

#### Grayscale Conversion
```tsx
{/* Profile photo with print grayscale */}
<img
  src={resume.profileImage}
  alt={resume.name}
  className="w-32 h-40 object-cover rounded-lg border-2 border-amber-200 print:border-gray-300 print:filter print:grayscale"
/>
```

### Form Validation

#### Required Fields
```typescript
// Resume level
title: string;        // Required
name: string;         // Required
email: string;        // Required

// Experience level
company: string;      // Required
position: string;     // Required
startDate: string;    // Required

// Project level
name: string;         // Required
startDate: string;    // Required

// Education level
school: string;       // Required
degree: string;       // Required
major: string;        // Required

// Certificate level
name: string;         // Required
issuer: string;       // Required
issueDate: string;    // Required
```

#### Field Indicators
```tsx
<label className="block text-sm font-semibold text-gray-700 mb-2">
  Project Name <span className="text-red-500">*</span>
</label>
```

### Section Ordering with Drag-and-Drop

#### Dependencies
```json
{
  "@dnd-kit/core": "^6.x.x",
  "@dnd-kit/sortable": "^8.x.x",
  "@dnd-kit/utilities": "^3.x.x"
}
```

#### Implementation (SectionOrderManager.tsx)
```typescript
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

// Only dynamic sections are reorderable
const dynamicSections = resume.sections.filter(s =>
  s.type !== 'HEADER' &&
  s.type !== 'SUMMARY' &&
  s.type !== 'COVER_LETTER' &&
  s.type !== 'CAREER_GOALS'
);

// Drag end handler
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    // Update order field for each item
    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      order: idx,
    }));
    onReorder(updatedItems);
  }
};
```

## Design System Integration

### Brand Identity
The resume feature follows the My-Girok design system with a library/book theme.

#### Color Palette
- **Primary Brand**: `amber-900` (#78350F) - Main headings, brand logo
- **Primary Action**: `amber-700 to amber-600` gradient - CTA buttons
- **Links**: `amber-700` with `hover:amber-800` - Interactive text
- **Borders**: `amber-100` - Cards, containers, navbar
- **Secondary Text**: `gray-700` for body, `gray-600` for hints

#### Component Styling

##### Navbar
```typescript
<nav className="bg-white border-b border-amber-100">
  <Link to="/">
    <span className="text-2xl">📚</span>
    <span className="text-2xl font-bold text-amber-900">My-Girok</span>
  </Link>

  {/* Primary CTA Button */}
  <Link className="bg-gradient-to-r from-amber-700 to-amber-600
                   hover:from-amber-800 hover:to-amber-700
                   text-white px-4 py-2 rounded-lg
                   transform hover:scale-[1.02]
                   shadow-lg shadow-amber-700/30">
    회원가입
  </Link>
</nav>
```

##### Form Inputs
```typescript
<input
  className="w-full px-4 py-3 bg-white
             border border-amber-200 rounded-lg
             focus:outline-none focus:ring-2
             focus:ring-amber-400 focus:border-transparent
             transition-all text-gray-900"
/>
```

##### Section Headers
```typescript
<h2 className="text-xl font-bold text-amber-900 mb-4">
  ⚡ {t('resume.sections.skills')}
</h2>
```

##### Cards
```typescript
<div className="bg-amber-50/30 border border-amber-100
                rounded-2xl shadow-md p-6
                hover:shadow-xl hover:-translate-y-1
                hover:border-amber-300 transition-all">
  {/* Card content */}
</div>
```

#### Typography
- **Headings**: Bold, `amber-900` or `gray-900`
- **Body Text**: Regular, `gray-700` (minimum for accessibility)
- **Input Text**: `gray-900` (ensures visibility on white backgrounds)
- **Hints**: Semibold labels with `gray-700`, small `gray-600` for descriptions

#### Accessibility
- All color combinations meet WCAG 2.1 AA standards
- `amber-900` on white: 8.52:1 contrast ratio (AAA)
- `gray-900` on white: Excellent visibility for form inputs
- Focus states use `ring-amber-400` for keyboard navigation

#### Iconography
- Emoji-based icons for warmth and approachability
- Book/library theme: 📚 (brand), 📋 (info), 💼 (career), 🚀 (projects)
- Consistent emoji usage across all sections

### Design Compliance Checklist

#### ✅ Compliant Elements
- Navbar uses amber color scheme with brand emoji
- All buttons use amber gradient with proper hover effects
- Form inputs have amber borders and focus rings
- Text colors meet accessibility standards
- Section headers use amber-900 for emphasis
- Cards use amber-50 backgrounds with amber-100 borders

#### ⚠️ Important Notes
- Never use `blue-600` or other off-brand colors
- Always use `text-gray-900` for input fields (not white)
- Maintain amber theme throughout resume components
- Follow spacing system (multiples of 4px/0.25rem)
- Use rounded-2xl for cards, rounded-lg for inputs/buttons

## Change Log

Detailed change history is available in `docs/changelogs/` directory.

Recent updates:
- Mobile responsive scaling and performance optimization
- Hierarchical skill descriptions (4 depth levels)
- Grayscale toggle and multi-page layout
- Unified Work Experience and Projects structure
- Internationalization support (Korean, English, Japanese)