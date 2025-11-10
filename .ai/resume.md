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
    ├── Skills
    ├── Experience (Company → Roles → Tasks)
    ├── Projects
    ├── Education
    └── Certificates
```

### 2. Work Experience Structure

```
Company
└── Role
    ├── title (required) - "Backend Development Lead"
    ├── position (optional) - "Senior Developer"
    ├── responsibilities (optional) - Main job duties
    └── tasks (hierarchical, 4 depth levels)
        ├── Depth 1 (•): Main tasks
        ├── Depth 2 (◦): Sub-tasks
        ├── Depth 3 (▪): Details
        └── Depth 4 (▫): Specific items
```

### 3. Design Theme - Library Concept

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

### Adding New Fields to ExperienceRole

1. Update schema: `services/personal-service/prisma/schema.prisma`
2. Update types: `apps/web-main/src/api/resume.ts`
3. Update DTO: `services/personal-service/src/resume/dto/create-resume.dto.ts`
4. Update service: Include in create/update operations
5. Update UI: Add to ResumeForm with library theme
6. Update preview: Add to ResumePreview

### Library Theme Styling

**Role Cards**:
```jsx
className="border border-amber-200 rounded-lg p-4 bg-amber-50/20"
```

**Section Headers**:
```jsx
<h5 className="text-sm font-semibold text-amber-900 flex items-center gap-1">
  📖 Role #{roleIndex + 1}
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

### Task Depth Selector

Shows bullet symbols instead of dashes:
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

## Print Optimization

- **Preview**: Amber theme (brand colors)
- **Print**: Grayscale (black & white)
- Use `print:` Tailwind prefix for print-specific styles
- Profile photos auto-convert to grayscale

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
- **Preview**: `apps/web-main/src/components/resume/ResumePreview.tsx`

## Quick Reference

**Indentation**: 1.5em per level (standard document formatting)
**Bullet Styles**: • → ◦ → ▪ → ▫
**Colors**: Amber theme (see DESIGN_SYSTEM.md)
**i18n**: Korean default, English fallback
**Tests**: Jest (backend), Vitest (frontend)

---

**For detailed information, refer to**: `docs/policies/RESUME.md`
