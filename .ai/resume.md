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
├── finalPosition (required) - "Backend Team Lead" (최종 직책)
├── jobTitle (required) - "Senior Developer" (직급)
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

**Key Change**: Work Experience and Projects are now unified. Each company has ONE final position/job title, and unlimited projects with hierarchical achievements (replacing the old Role → Tasks structure).

### 3. Skills Structure (with Hierarchical Descriptions)

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

### 4. Design Theme - Library Concept

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

// Section management
PATCH /v1/resume/:id/sections/order       // Reorder
PATCH /v1/resume/:id/sections/visibility  // Toggle

// Public access
GET /v1/resume/public/:username  // User's default resume
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
5. **Career Goals** (`careerGoals`): 입사 후 포부

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
- Skip test coverage updates

✅ **DO**:
- Follow amber library theme consistently
- Use standard spacing (multiples of 0.25rem)
- Add i18n keys for all user-facing text
- Use `create` with nested data for relations
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
- **Experience Component**: `apps/web-main/src/components/resume/ExperienceSection.tsx` (new unified component with drag-and-drop)
- **Hierarchical Component**: `apps/web-main/src/components/resume/HierarchicalDescription.tsx` (reusable for any hierarchical input)
- **Preview**: `apps/web-main/src/components/resume/ResumePreview.tsx`

## Quick Reference

**Indentation**: 1.5em per level (standard document formatting)
**Bullet Styles**: • → ◦ → ▪ → ▫
**Max Depth**: 4 levels (achievements, skill descriptions)

## Recent Updates

**2025-01-15 (Part 2)**: Fixed skill save bug + added reordering
- **Bug Fix**: Changed `createMany` to individual `create` for proper JSON serialization
- **Feature**: Added ▲/▼ buttons to reorder skill items
- File: `resume.service.ts` (lines 288-302), `ResumeForm.tsx` (lines 651-685)
- Changelog: `docs/changelogs/2025-01-15-skill-save-fix-and-reordering.md`

**2025-01-15 (Part 1)**: Skills section now supports hierarchical descriptions (4 depth levels)
- Added `SkillDescription` interface (recursive)
- Created `HierarchicalDescription.tsx` component (reusable)
- Updated `ResumeForm.tsx` and `ResumePreview.tsx`
- Backward compatible with legacy text descriptions
- No database changes (Skills already use Json type)

**Colors**: Amber theme (see DESIGN_SYSTEM.md)
**i18n**: Korean default, English fallback
**Tests**: Jest (backend), Vitest (frontend)

---

**For detailed information, refer to**: `docs/policies/RESUME.md`
