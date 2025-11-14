# Resume Management - LLM Guidelines

> Quick reference for AI assistants working with the resume feature

## Overview

Resume management system for creating, editing, and sharing professional resumes with Korean market support.

## Key Concepts

### 1. Data Structure

```
Resume
├── Basic Info (name, email, phone, etc.)
├── Korean Fields (military service, cover letter, career goals)
└── Dynamic Sections (reorderable)
    ├── Skills (Category → Items → Hierarchical Descriptions)
    ├── Experience (Company → Projects → Achievements)
    ├── Projects (Standalone, deprecated)
    ├── Education
    └── Certificates
```

### 2. Work Experience Structure (Unified with Projects)

```
Company
├── startDate/endDate - Company period
├── isCurrentlyWorking (boolean) - 재직중 flag
├── finalPosition (required) - "Backend Team Lead" (최종 직책)
├── jobTitle (required) - "Senior Developer" (직급)
├── Auto-calculated: Duration (e.g., "6년 8개월")
└── Projects (unlimited)
    ├── name (required) - "E-Commerce Platform Rebuild"
    ├── role (optional) - "Lead Backend Developer"
    ├── description (required) - Project overview
    ├── startDate/endDate - Project timeline
    ├── techStack[] - Technologies used
    ├── url/githubUrl - Project links
    └── achievements (hierarchical, 4 depth levels)
        ├── Depth 1 (•): Main achievements
        ├── Depth 2 (◦): Sub-achievements
        ├── Depth 3 (▪): Details
        └── Depth 4 (▫): Specific items
```

**Duration Calculation**: Auto-calculated from startDate and endDate (or current date if isCurrentlyWorking=true)

**Key Change**: Work Experience and Projects are now unified. Each company has ONE final position/job title, and unlimited projects with hierarchical achievements (replacing the old Role → Tasks structure).

### 3. Education Structure (with Degree Enum)

```
Education
├── school (required)
├── major (required)
├── degree? (DegreeType enum - optional)
│   ├── HIGH_SCHOOL
│   ├── ASSOCIATE_2 (2년제)
│   ├── ASSOCIATE_3 (3년제)
│   ├── BACHELOR
│   ├── MASTER
│   └── DOCTORATE
├── startDate (YYYY-MM)
├── endDate? (nullable = current)
├── gpa?
└── order (drag-and-drop)
```

**Drag-and-drop**: EducationSection.tsx uses @dnd-kit for reordering

### 4. Skills Structure (with Hierarchical Descriptions)

```
Skill Category (e.g., "Frontend")
└── Skill Items[]
    ├── name (required) - "React"
    ├── description (legacy, optional) - "3년 경험"
    └── descriptions[] (hierarchical, 4 depth levels)
        ├── Depth 1 (•): Main usage experience
        ├── Depth 2 (◦): Sub-details
        ├── Depth 3 (▪): Further breakdown
        └── Depth 4 (▫): Specific items
```

**Example**:
```
• React
  • React Hooks와 Context API를 활용한 전역 상태 관리
    ◦ useState, useEffect, useContext 활용
      ▪ useMemo, useCallback으로 성능 최적화
        ▫ 렌더링 횟수 40% 감소
```

**Components**:
- `HierarchicalDescription.tsx` - Reusable hierarchical input component
- Supports drag & drop, collapse/expand, recursive structure
- Same UX as Work Experience achievements

**Reordering**:
- Skill items have ▲/▼ buttons to change order
- Up button only shows if not first, down only if not last
- Simple array swap, no drag-and-drop library needed

### 5. Design Theme - Library Concept

**Concept**: "나의 기록" (My Records) - Personal library for documenting life and career

**Colors**:
- Primary: `amber-900` (#78350F) - Headers
- Accent: `amber-700` to `amber-600` gradient - CTAs
- Backgrounds: `amber-50/30` - Cards
- Borders: `amber-200` - Form inputs
- Focus: `amber-400` - Ring states

**Visual Metaphors**:
- 📚 Brand/Library
- 📖 Roles/Chapters
- ✍️ Tasks/Writing
- 💼 Career

## Implementation Patterns

### Saving Skills with JSON Fields

**CRITICAL**: Use individual `create()` not `createMany()` for Skills

```typescript
// ❌ DON'T - corrupts nested JSON
await tx.skill.createMany({ data: skills });

// ✅ DO - properly serializes JSON
for (const skill of skills) {
  await tx.skill.create({ data: skill });
}
```

**Reason**: `createMany` doesn't handle complex nested JSON (like hierarchical descriptions with children arrays)

### Adding New Fields to Experience/ExperienceProject

1. Update schema: `services/personal-service/prisma/schema.prisma`
2. Update types: `apps/web-main/src/api/resume.ts`
3. Update DTO: `services/personal-service/src/resume/dto/create-resume.dto.ts`
4. Update service: Include in create/update operations with nested relations
5. Update UI: Add to ExperienceSection component with library theme
6. Update preview: Add to ResumePreview ExperienceSection function

### Library Theme Styling

**Project Cards**:
```jsx
className="border border-amber-200 rounded-lg p-4 bg-amber-50/20"
```

**Section Headers**:
```jsx
<h5 className="text-sm font-semibold text-amber-900 flex items-center gap-1">
  📁 Project #{projectIndex + 1}
</h5>
```

**Inputs**:
```jsx
className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
```

**Buttons**:
```jsx
className="px-2 py-1 bg-amber-600 text-white text-xs rounded-lg
           hover:bg-amber-700 transition-all"
```

### Achievement Depth Selector

Shows bullet symbols for hierarchical achievements:
```jsx
<option value="1">• (1)</option>
<option value="2">◦ (2)</option>
<option value="3">▪ (3)</option>
<option value="4">▫ (4)</option>
```

## API Endpoints

```typescript
// Resume CRUD
POST   /v1/resume              // Create
GET    /v1/resume              // Get all
GET    /v1/resume/:id          // Get one
PUT    /v1/resume/:id          // Update
DELETE /v1/resume/:id          // Delete
PATCH  /v1/resume/:id/default  // Set default
POST   /v1/resume/:id/copy     // Copy/duplicate resume

// Section management
PATCH /v1/resume/:id/sections/order       // Reorder
PATCH /v1/resume/:id/sections/visibility  // Toggle

// Public access & Sharing
GET /v1/resume/public/:username  // User's default resume by username
GET /v1/share/public/:token      // Shared resume by token

// Share links
POST   /v1/share/resume/:resumeId  // Create share link
GET    /v1/share                   // Get my share links
GET    /v1/share/:id               // Get specific share link
PATCH  /v1/share/:id               // Update share link
DELETE /v1/share/:id               // Delete share link
```

## Database Migration

**Use db push for development** (no shadow database required):
```bash
DATABASE_URL="<connection_string>" pnpm --filter @my-girok/personal-service prisma db push
```

## Testing

**Run tests**:
```bash
cd services/personal-service
pnpm test -- --testPathPattern=resume.service.spec.ts
```

**Test coverage**: Minimum 80%

## Korean Market Features

1. **Military Service** (`militaryService`): COMPLETED | EXEMPTED | NOT_APPLICABLE
2. **Position** (`position`): 직급 (e.g., "Senior Developer")
3. **Responsibilities** (`responsibilities`): 담당업무
4. **Cover Letter** (`coverLetter`): 자기소개서
5. **Application Reason** (`applicationReason`): 지원 동기

## Resume Preview Design

**Concept**: Print-optimized, high-contrast design with user control

- **Content**: Uses grayscale (gray-50 ~ gray-900) for text and layout
- **Profile Photos**: Show in color by default, optional grayscale toggle
- **Grayscale Toggle**: 🎨/🖤 button lets users switch to full B&W mode
- **Editing UI**: Uses amber brand colors (form inputs, buttons, navigation)
- **Multi-Page**: Supports both A4 (21cm × 29.7cm) and Letter (21.59cm × 27.94cm)
- **Page Separation**: Visual shadows between pages, page numbers on screen
- **Print-Friendly**: Automatic page breaks, cost-effective, ATS-compatible

## Common Mistakes to Avoid

❌ **DON'T**:
- Use `blue-600` or other off-brand colors
- Use arbitrary values like `w-[123px]`
- Forget to add translation keys for new text
- Create nested relations with `createMany` (not supported)
- Send database-generated fields (`id`, `projectId`, `resumeId`, `experienceId`, `parentId`, `createdAt`, `updatedAt`) to API
- Skip test coverage updates

✅ **DO**:
- Follow amber library theme consistently
- Use standard spacing (multiples of 0.25rem)
- Add i18n keys for all user-facing text
- Use `create` with nested data for relations
- Strip all DB fields before API calls (handled automatically by `prepareResumeForSubmit`)
- Update documentation with changes

## File Locations

- **Policy docs**: `docs/policies/RESUME.md` (comprehensive)
- **LLM guide**: `.ai/resume.md` (this file, concise)
- **Design system**: `docs/DESIGN_SYSTEM.md`
- **Schema**: `services/personal-service/prisma/schema.prisma`
- **Types**: `apps/web-main/src/api/resume.ts`
- **DTOs**: `services/personal-service/src/resume/dto/`
- **Service**: `services/personal-service/src/resume/resume.service.ts`
- **Form UI**: `apps/web-main/src/components/resume/ResumeForm.tsx`
- **Experience Component**: `apps/web-main/src/components/resume/ExperienceSection.tsx` (drag-and-drop)
- **Education Component**: `apps/web-main/src/components/resume/EducationSection.tsx` (drag-and-drop, degree select)
- **Hierarchical Component**: `apps/web-main/src/components/resume/HierarchicalDescription.tsx` (reusable, 4 depth)
- **Preview**: `apps/web-main/src/components/resume/ResumePreview.tsx`

## Quick Reference

**Indentation**: 1.5em per level (standard document formatting)
**Bullet Styles**: • → ◦ → ▪ → ▫
**Max Depth**: 4 levels (achievements, skill descriptions)

## Recent Updates

**2025-11-14**: Resume list UI improvements with i18n and amber theme
- Added resume copy button to ResumeList component
- Refactored ResumeList.tsx to use i18n for all user-facing text (policy compliance)
- Changed color scheme from blue/green to amber theme (policy compliance)
- Added translation keys to en.json, ko.json, ja.json: `resume.list.*`
- Translation keys support: title, createNew, edit, preview, copy, setDefault, delete, confirmations, error messages, stats
- UI buttons now follow amber library theme: `bg-amber-50 text-amber-700`, gradient CTAs
- Delete button remains red (appropriate for destructive action)
- Copy feature: Uses existing backend API `POST /v1/resume/:id/copy`
- Files changed: `ResumeList.tsx`, `en.json`, `ko.json`, `ja.json`

**2025-11-13**: Total career duration with overlap handling
- Added `calculateTotalExperienceWithOverlap()` utility function to handle overlapping work periods
- Merges overlapping date ranges using interval merging algorithm to avoid double-counting
- Example: Company A (2020-01~2022-06) + Company B (2022-03~2025-11) = 5y 11m (not 6y 3m)
- Display total career duration in Experience section title: "경력 (5년 11개월)"
- Handles currently working experiences (isCurrentlyWorking flag)
- Added comprehensive test suite with 15 test cases (100% pass rate)
- Frontend test file: `apps/web-main/src/api/resume.test.ts`
- Updated vitest configuration for proper jsdom support
- Deprecated old `calculateTotalExperience()` function (simple sum without overlap handling)

**2025-11-12 (Part 7)**: Fix missing isCurrentlyWorking field and empty string handling
- Fixed 500 error when creating/updating resumes with missing `isCurrentlyWorking` field
- Added proper handling for empty string values (`""` → `null`) in `endDate` fields
- Added default values for optional fields: `order` (0), `visible` (true)
- Applied fixes to both `create()` and `update()` methods for Experience and ExperienceProject
- Prevents database insertion errors when frontend sends empty strings or missing optional fields

**2025-11-12 (Part 6)**: Fix 500 error in resume create/update operations
- Fixed 500 Internal Server Error when creating or updating resumes
- Extended hierarchical achievements fetch pattern to `create()` and `update()` return values
- Both methods now properly return hierarchical achievements with `where: { parentId: null }`
- Includes 4-level deep children with proper ordering
- Ensures consistency across all resume CRUD operations (POST, PUT, GET)
- Resolves issue where flat achievement structures were causing response processing errors

**2025-11-12 (Part 5)**: Resume copy/duplicate feature + Nested achievements retrieval fix
- Added resume copy endpoint: `POST /v1/resume/:id/copy`
- Copies all nested data: sections, skills, experiences with projects/achievements (4 depth), education, certificates
- Copied resume title gets " (Copy)" suffix and is never set as default
- Fixed 500 error when retrieving resumes with nested achievements
- Updated `findByIdAndUserId()`, `findAllByUserId()`, and `getDefaultResume()` to properly fetch hierarchical achievements with `where: { parentId: null }`
- Added `copyAchievements()` helper for recursive copying
- Frontend API: `copyResume(resumeId)`

**2025-11-12 (Part 4)**: Nested achievements save fix
- Fixed critical bug where only first level of achievements was saved
- Added `transformAchievements()` recursive helper method
- Properly handles children at all depth levels (1-4)
- Applied to both `create()` and `update()` methods in resume service

**2025-11-12 (Part 3)**: Collapsible sections + Share link fixes + DB field stripping
- Added collapsible functionality to all resume form sections for better UX
- Fixed share link URL format: `/shared/:token` (was incorrectly `/resume/:token`)
- Enhanced `stripIds()` to remove all DB fields: `id`, `projectId`, `resumeId`, `experienceId`, `parentId`, `createdAt`, `updatedAt`
- Prevents validation errors when submitting previously-fetched data
- Certificates and Education saving confirmed working correctly

**2025-11-12 (Part 2)**: Share link creation and management
- Share links now generate correct URLs: `https://domain/shared/{token}`
- Frontend routes: `/resume/:username` (public profile), `/shared/:token` (share link)
- Backend endpoints: `/v1/resume/public/:username`, `/v1/share/public/:token`
- Fixed `findAllByUser()` and `update()` in share.service.ts

**2025-11-12 (Part 1)**: Database field validation fix
- `stripIds()` function now removes all database-generated fields
- Prevents "property X should not exist" validation errors
- Applies recursively to all nested objects (achievements, projects, etc.)

**2025-01-16 (Part 4)**: Experience duration auto-calculation + Currently working flag
- Added `isCurrentlyWorking` (재직중) checkbox for Experience
- Auto-calculate experience duration (e.g., "6년 8개월")
- Display duration under company name in preview
- i18n: KR (재직중), JP (在職中), EN (Currently Working)
- Utility: `calculateExperienceDuration()` and `calculateTotalExperience()`

**2025-01-16 (Part 3)**: Career goals → Application reason + Tech Stack + GPA format
- Changed `careerGoals` to `applicationReason` (지원 동기)
- Moved Tech Stack after Description in preview
- Added GPA format field: SCALE_4_0, SCALE_4_5, SCALE_100
- Country-specific formats: US (4.0), KR (4.5), JP (100)

**2025-01-16 (Part 2)**: Fix achievements save validation error
- Added `stripIds()` utility to recursively remove `id` fields
- Updated `createResume()` and `updateResume()` to use `prepareResumeForSubmit()`
- Fixes: "property id should not exist" validation error

**2025-01-16 (Part 1)**: Education degree enum + drag-and-drop
- DegreeType enum: HIGH_SCHOOL, ASSOCIATE_2, ASSOCIATE_3, BACHELOR, MASTER, DOCTORATE
- i18n: KR (2년제/3년제), JP, EN
- EducationSection.tsx: drag-and-drop sortable component
- Schema: degree → DegreeType? (nullable)
- UI: Select with t(`resume.degreeTypes.${degree}`)

**2025-01-15 (Part 2)**: Skill save fix + reordering
- Fix: `create()` loop vs `createMany()` for JSON
- Feature: ▲/▼ buttons for skill items

**2025-01-15 (Part 1)**: Skills hierarchical descriptions
- HierarchicalDescription.tsx (reusable, 4 depth)
- Backward compatible

**Stack**: Amber theme, i18n (KR/EN), Jest/Vitest

---

**For detailed information, refer to**: `docs/policies/RESUME.md`
