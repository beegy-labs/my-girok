# Resume Management - LLM Guidelines

> Quick reference for AI assistants working with the resume feature

## Overview

Resume management system for creating, editing, and sharing professional resumes with Korean market support.

## Key Concepts

### 1. Data Structure

```
Resume
├── Basic Info (name, email, phone, profileImage, etc.)
├── Korean Fields (military service, cover letter, application reason)
├── Key Achievements (keyAchievements: string[]) - Career highlights
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

**Colors** (WCAG 2.1 AA - Oak Brown Theme):

- Primary: `theme-primary` (#8B5E3C) - Headers, CTAs
- Text: `theme-text-primary` (#262220 light / #B0A9A2 dark)
- Backgrounds: `theme-bg-card` (#F8F7F4 light / #282522 dark)
- Borders: `theme-border-default`
- Focus: `theme-focus-ring`

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

### Profile Photo Handling

**Display in Form** (ResumeForm.tsx):

```jsx
{formData.profileImage && (
  <div className="mb-3 flex items-center gap-3">
    <img
      src={formData.profileImage}
      alt="Profile"
      className="w-24 h-24 object-cover rounded-full border-2 border-theme-border-default"
      onError={(e) => {
        // Fallback to placeholder SVG on error
        (e.target as HTMLImageElement).src = 'data:image/svg+xml,...';
      }}
    />
    <button
      type="button"
      onClick={() => setFormData({ ...formData, profileImage: '' })}
      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
    >
      Remove Photo
    </button>
  </div>
)}
```

**Key Points**:

- Image preview: 96x96px (`w-24 h-24`) circular with theme border
- Error handling: Fallback to SVG placeholder if URL fails to load
- Remove button: Clears profileImage field (destructive action, red color)
- Input field: Text input for image URL (file upload not implemented)

### Theme Styling (WCAG 2.1 AA)

**Project Cards**:

```jsx
className = 'border border-theme-border-subtle rounded-lg p-4 bg-theme-bg-card';
```

**Section Headers**:

```jsx
<h5 className="text-sm font-semibold text-theme-text-primary flex items-center gap-1">
  📁 Project #{projectIndex + 1}
</h5>
```

**Inputs** (use @my-girok/ui-components):

```jsx
<TextInput label="Project Name" value={name} onChange={setName} />
```

**Buttons** (use @my-girok/ui-components):

```jsx
<Button variant="primary" size="sm">
  Add
</Button>
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

1. **Birth Date** (`birthDate: string`): 생년월일 (YYYY-MM-DD format) for accurate Korean age (만 나이) calculation
   - **Deprecated**: `birthYear: number` (kept for backward compatibility)
2. **Gender** (`gender: Gender`): 성별 - MALE | FEMALE | OTHER
3. **Military Service** (`militaryService`): COMPLETED | EXEMPTED | NOT_APPLICABLE
4. **Position** (`position`): 직급 (e.g., "Senior Developer")
5. **Responsibilities** (`responsibilities`): 담당업무
6. **Cover Letter** (`coverLetter`): 자기소개서
7. **Application Reason** (`applicationReason`): 지원 동기
8. **Key Achievements** (`keyAchievements: string[]`): 주요 성과 - Career highlights displayed as bullet list

## Resume Preview Design

**Concept**: Print-optimized, high-contrast design with responsive scaling

- **Content**: Uses grayscale (gray-50 ~ gray-900) for text and layout
- **Profile Photos**: Show in color by default, optional grayscale toggle
- **Grayscale Toggle**: 🎨/🖤 button lets users switch to full B&W mode
- **Editing UI**: Uses Oak Brown theme (WCAG 2.1 AA compliant)
- **Multi-Page**: Supports both A4 (21cm × 29.7cm) and Letter (21.59cm × 27.94cm)
- **Page Separation**: Visual shadows between pages, page numbers on screen
- **Print-Friendly**: Automatic page breaks, cost-effective, ATS-compatible
- **Responsive Scaling**:
  - Desktop (>794px): 100% original size
  - Tablet (~768px): Auto-scaled to ~93%
  - Mobile (~375px): Auto-scaled to ~43%
  - Browser zoom remains functional
- **Performance**: Debounced resize (150ms), RAF, GPU acceleration, smart updates

## Print & PDF Output

**Current Strategy (2025-11-19)**:

- **Print**: Uses Paged.js paginated view (📄 페이지 보기)
- **PDF Export**: Uses Paged.js with multi-page support
- **Margins**: 0.5cm on all sides (minimal padding for maximum content)
- **@page margin**: 0 (Paged.js handles all spacing)

**Required Print Settings**:

- Margins: **None**
- Headers and footers: **None**
- Background graphics: **On**

**Paper Size**: Dynamic based on paperSize prop (A4 or Letter)

### Paged.js Integration

```typescript
// ResumePreview.tsx - Paged.js integration with CSS injection
useEffect(() => {
  if (viewMode === 'paginated' && contentRef.current && pagedContainerRef.current) {
    const paged = new Previewer();
    const pageSize = paperSize === 'A4' ? 'A4' : 'letter';

    const dynamicCSS = `
      @page {
        size: ${pageSize};
        margin: 0; /* Paged.js handles margins */
      }

      @media print {
        .resume-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;

    paged.preview(contentClone.innerHTML, [dynamicCSS], pagedContainerRef.current);
  }
}, [viewMode, resume, paperSize]);
```

### Print CSS Configuration

```css
@media print {
  /* Hide continuous view, show Paged.js */
  #resume-content {
    display: none !important;
  }
  .pagedjs-container {
    display: block !important;
  }

  /* Page constraints */
  .pagedjs_page,
  .pagedjs_page_content,
  .pagedjs_pagebox {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* All content inside pages */
  .pagedjs_page_content * {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Text overflow prevention */
  a,
  span,
  p,
  div,
  li {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    hyphens: auto !important;
  }

  /* Media constraints */
  img,
  video,
  svg {
    max-width: 100% !important;
    height: auto !important;
  }
}
```

### PDF Export with Paged.js

```typescript
// pdf.ts - Multi-page PDF export
export async function exportResumeToPDF(
  elementId: string,
  options: PDFExportOptions
): Promise<void> {
  // PRIORITY: Use Paged.js for PDF export
  const pagedContainer = document.querySelector('.pagedjs-container');
  if (pagedContainer && isVisible) {
    await exportPagedJSToPDF(pagedContainer, paperSize, fileName);
    return;
  }
  // Fallback: continuous view
}

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  const pageSize = paperSize === 'A4' ? 'A4' : 'letter';
  styleElement.textContent = `
    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }
    }
  `;

  return () => {
    const element = document.getElementById(styleId);
    if (element) element.remove();
  };
}, [paperSize]);
```

**Print Styles**:

- `print.css`: Global print styles (black & white optimizations, page breaks)
- `resume-print.css`: Resume-specific page layouts (A4/Letter dimensions)
- **Background**: White (`background: white`) for cost-effective printing
- **Colors**: High contrast grayscale for readability
- **Page Breaks**: Controlled with `page-break-inside: avoid` for sections/items

**CRITICAL**:

- ❌ Don't use hardcoded `@page { size: A4 }` in CSS files
- ✅ Use dynamic style injection in component based on props
- ❌ Don't use colored backgrounds (gray, etc.) for print
- ✅ Use white background for cost-effective printing

## Performance Optimization (CRITICAL)

❌ **DON'T**:

```typescript
// Inline functions in resume list (creates 60+ functions per render)
{resumes.map(r => <button onClick={() => navigate(`/edit/${r.id}`)}>Edit</button>)}

// State for navigation (anti-pattern)
const [nav, setNav] = useState(null);
useEffect(() => { if(nav) navigate(nav) }, [nav]);
```

✅ **DO**:

```typescript
// Memoize all handlers
const navigateToEdit = useCallback((id) => navigate(`/edit/${id}`), [navigate]);
{resumes.map(r => <button onClick={() => navigateToEdit(r.id)}>Edit</button>)}

// Direct navigation (React Router v7)
const handleSubmit = async (data) => {
  const created = await createResume(data);
  navigate(`/preview/${created.id}`); // Direct call
};
```

**Required for resume pages:**

- `MyResumePage`: Memoize all 9 handlers (edit, preview, copy, share, delete, etc.)
- `ResumeEditPage`: Memoize handleFormChange, defaultSections
- `ResumeForm`: Exclude onChange from useEffect deps (parent memoizes it)

## Common Mistakes to Avoid

❌ **DON'T**:

- Use `blue-600` or other off-brand colors
- Use arbitrary values like `w-[123px]`
- Forget to add translation keys for new text
- Create nested relations with `createMany` (not supported)
- Send database-generated fields (`id`, `projectId`, `resumeId`, `experienceId`, `parentId`, `createdAt`, `updatedAt`) to API
- Skip test coverage updates
- Use inline functions in map() iterations
- Use state for navigation

✅ **DO**:

- Follow Oak Brown theme (see `docs/DESIGN_SYSTEM.md`)
- Use standard spacing (multiples of 0.25rem)
- Add i18n keys for all user-facing text
- Use `create` with nested data for relations
- Strip all DB fields before API calls (handled automatically by `prepareResumeForSubmit`)
- Update documentation with changes
- Memoize all event handlers with useCallback
- Call navigate() directly in handlers

## File Locations

- **LLM guide**: `.ai/resume.md` (this file)
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

## File Storage Policy

### Profile Photo Storage

**CRITICAL**: Profile photos are stored in **original color format only**.

| Aspect               | Policy                                                          |
| -------------------- | --------------------------------------------------------------- |
| **Storage**          | Original color image only (no server-side grayscale conversion) |
| **Display Default**  | Color (original)                                                |
| **Grayscale Option** | Frontend CSS filter (`filter: grayscale(100%)`) via UI toggle   |
| **Location**         | MinIO bucket: `resumes/{userId}/{resumeId}/{uuid}.{ext}`        |
| **Temp Storage**     | `tmp/{userId}/{uuid}.{ext}` (24-hour auto-cleanup)              |

### Implementation Rules

**Backend (storage.service.ts)**:

- ❌ **NEVER** auto-convert images to grayscale on upload
- ❌ **NEVER** store duplicate grayscale versions
- ✅ Store original file only with `moveFromTemp()`
- ✅ Return `{ fileKey, fileUrl }` (no grayscaleUrl)

**Backend (resume.service.ts)**:

- ❌ **NEVER** use `result.grayscaleUrl || result.fileUrl`
- ✅ Always use `result.fileUrl` (original color image)

**Frontend (ResumePreview.tsx)**:

- ✅ Display color by default
- ✅ Apply `filter: grayscale(100%)` when user enables B&W mode
- ✅ Toggle button: 🎨 (color) / 🖤 (grayscale)

### Rationale

1. **User Choice**: Users decide grayscale preference, not system
2. **Storage Efficiency**: No duplicate files for grayscale versions
3. **Flexibility**: Same source, different presentation via CSS
4. **Policy Compliance**: `.ai/resume.md` line 281-282 states "Profile Photos: Show in color by default, optional grayscale toggle"

## Recent Updates

**2025-11-20 (Part 2)**: Birth date field upgrade for accurate age calculation (#TBD)

- **Breaking Change**: Upgraded `birthYear` (number) to `birthDate` (string, YYYY-MM-DD format)
- **Reason**: Accurate Korean age (만 나이) calculation requires full birth date
- Added `birthDate` field to Resume model, CreateResumeDto
- Changed input type from `<input type="number">` to `<input type="date">` in ResumeForm
- Added utility functions in types package: `calculateKoreanAge()`, `calculateAgeFromYear()`, `getAge()`
- Preview display format: "1994 (30세)" - shows birth year with accurate age (만 나이)
- **Backward Compatibility**: `birthYear` field kept for old data, auto-populated from `birthDate`
- Updated i18n: `resume.birthDate`, `resume.birthDatePlaceholder`, `resume.birthDateHint` (ko, en, ja)
- Fixed: resume/edit live preview now shows birth date and gender
- Fixed: Added `sanitizeSalaryInfo()` to `findAllByUserId()` and `getDefaultResume()` for security
- Files changed: `schema.prisma`, `packages/types/src/resume/index.ts`, `create-resume.dto.ts`, `ResumeForm.tsx`, `ResumePreview.tsx`, `ResumeEditPage.tsx`, `resume.ts`, `ko.json`, `en.json`, `ja.json`, `RESUME.md`, `.ai/resume.md`

**2025-11-20 (Part 1)**: Birth year and gender fields (#125)

- Added `birthYear` (number) and `gender` (Gender enum: MALE | FEMALE | OTHER) to Resume model
- Added input fields in ResumeForm for birth year and gender selection
- Display format in preview: "남, 1994 (30세)" next to name in header
- Age automatically calculated from birth year
- Updated schema.prisma, types package, CreateResumeDto, and documentation
- Files changed: `schema.prisma`, `packages/types/src/resume/index.ts`, `resume.ts`, `ResumeForm.tsx`, `ResumePreview.tsx`, `RESUME.md`, `.ai/resume.md`

**2025-11-19 (Part 3)**: Print content overflow and clipping fix (#116)

- Fixed print button content clipping and overflow issues
- Added max-width: 100% constraints to all Paged.js elements (.pagedjs_page, .pagedjs_page_content, .pagedjs_pagebox)
- Applied box-sizing: border-box to prevent size overflow from padding/borders
- Enhanced text overflow handling: word-break, overflow-wrap: anywhere, hyphens: auto
- Added media element constraints: img/video/svg max-width: 100%, height: auto
- Added max-width to resume sections and items
- Result: Content no longer overflows page boundaries, long URLs wrap properly, images scale to fit

**2025-11-19 (Part 2)**: Paged.js print integration and optimization (#115)

- Changed print strategy from continuous view to Paged.js paginated view
- Print now uses page view (📄 페이지 보기) instead of continuous view
- Added print settings guidance in ResumePreviewPage: Margins=None, Headers/footers=None, Background graphics=On
- Optimized CSS @page rules: margin: 0 (Paged.js handles all spacing)
- Added @media print rules in Paged.js CSS for proper page breaks
- Added print-color-adjust: exact for accurate color rendering
- Based on official Paged.js documentation best practices
- Files: `resume-print.css`, `ResumePreview.tsx`, `ResumePreviewPage.tsx`, `RESUME.md`

**2025-11-19 (Part 1)**: Resume margin optimization and print/PDF strategy (#114)

- Optimized margins from 2cm to 0.5cm for maximum content space
- PDF export: Uses Paged.js for multi-page PDF with proper page boundaries
- Print view: Uses Paged.js with @page margin: 0.5cm
- Screen view: 0.5cm padding on both continuous and paginated views
- Minimum safe margin: 0.5cm for printer compatibility
- Updated policy documentation with new print strategy
- Files: `resume-print.css`, `ResumePreview.tsx`, `pdf.ts`, `RESUME.md`

**2025-11-19**: CI workflow optimization for faster test execution (#114 CI commit)

- Split single test job into 3 parallel jobs (lint, type-check, test)
- Added node_modules caching for 80% faster dependency installation
- Used --prefer-offline flag for pnpm install
- Replaced E2E tests with faster unit tests
- Reduced timeout from 10min to 5min per job
- Total time improvement: ~10min → ~3-5min (2-3x faster)
- Files: `.github/workflows/ci-web-main.yml`

**2025-01-19 (Part 2)**: Shared resume preview container component (#107)

- Extracted duplicate preview container code into `ResumePreviewContainer` component
- Consolidates identical wrapper logic across 4 pages: ResumeEditPage, ResumePreviewPage, SharedResumePage, PublicResumePage
- Features: customizable scale, maxHeight, responsive padding, horizontal scroll, dark mode support
- Usage: `<ResumePreviewContainer resume={resume} scale={0.75} />` for live preview
- Benefits: Single source of truth, eliminates 27 lines of duplicate code, easier maintenance
- Files: `ResumePreviewContainer.tsx` (new), `ResumeEditPage.tsx`, `ResumePreviewPage.tsx`, `SharedResumePage.tsx`, `PublicResumePage.tsx`

**2025-01-19 (Part 1)**: A4 print margins and page boundaries fix (#106)

- Fixed content clipping at page edges by increasing print margins from 1.2-1.5cm to **2cm** on all sides (later optimized to 0.5cm in #114)
- Updated `@page { size: A4; margin: 0; }` in print.css for proper page setup
- Updated paginated view to show accurate page boundaries accounting for padding
- A4 content area: 25.7cm (29.7cm page - 4cm padding)
- Letter content area: 23.94cm (27.94cm page - 4cm padding)
- Visual page boundaries shown with gray separator lines in screen view
- Changed from fixed `height` to `min-height` for natural content flow
- Removed forced `page-break-after` rules for browser-native page breaks
- Files: `print.css`, `resume-print.css`, `ResumePreview.tsx`

**2025-11-18 (Part 4)**: PDF/Print output and profile photo preview improvements (#102)

- Fixed PDF/print background color: Changed from gray (#F9FAFB) to white for cost-effective printing
- Implemented dynamic @page size injection based on paperSize prop (A4 vs Letter)
- Added useEffect hook in ResumePreview to dynamically inject `@page { size: ... }` style
- Removed hardcoded @page size from print.css to support dynamic paper size switching
- Added profile photo preview functionality in ResumeForm
- Preview shows 96x96px circular thumbnail with error handling (fallback SVG on load failure)
- Added "Remove Photo" button for clearing profile image
- Files changed: `resume-print.css`, `print.css`, `ResumePreview.tsx`, `ResumeForm.tsx`

**2025-11-18 (Part 3)**: Fix missing experience data in shared/public resume pages (#101)

- Fixed shared (`/shared/:token`) and public (`/:username`) resume pages missing all experience data
- Added nested includes for experiences → projects → achievements (4-level hierarchy) in `findById()` and `getPublicResumeByUsername()`
- Added `sections` include to public resume endpoint for proper section visibility
- Shared and public pages now display complete experience data with projects and hierarchical achievements
- Files changed: `resume.service.ts`

**2025-11-18 (Part 2)**: Key Achievements UI improvements (#100)

- Fixed text wrapping issues when Key Achievements contain long multi-line text
- Changed bullet list from `list-inside` to `list-outside` with `pl-5` padding
- Changed input type from single-line `<input>` to multi-line `<textarea>` with `rows={3}` and `resize-y`
- Better visual alignment with Application Reason section
- Improved placeholder text with example achievement
- Files changed: `ResumePreview.tsx`, `ResumeForm.tsx`

**2025-11-18 (Part 1)**: Key Achievements storage and display (#98, #99)

- Added Key Achievements (주요 성과) field to resume schema and backend service
- Added `keyAchievements: string[]` to Resume model for storing career highlights
- Updated `create()` and `update()` methods in resume.service.ts to handle keyAchievements
- Fixed ESLint errors in sanitizeSalaryInfo: Renamed unused destructured variables with underscore prefix (`_salary`, `_salaryUnit`, `_showSalary`)
- Key Achievements now save to database and display in preview correctly
- Files changed: `resume.service.ts`

**2025-11-15**: React rendering optimization (#82)

- Memoized all event handlers in MyResumePage, ResumeEditPage
- Fixed navigation anti-pattern (state + useEffect → direct navigate())
- Fixed infinite loop risk in ResumeForm onChange
- 80%+ reduction in re-renders (60+ inline functions eliminated)

**2025-11-14**: Add i18n support to ResumePreview component

- Applied i18n to all hardcoded text in ResumePreview.tsx
- Added `resume.preview.*` translation keys to ko.json, en.json, ja.json
- Translated UI elements: view modes (continuous/paginated), color/grayscale mode toggles
- Translated section headers and labels: coverLetter, applicationReason, page, ongoing, present, tech, demo, github, verify, degree, in
- All resume preview content now fully localized for Korean, English, and Japanese
- Files changed: `ResumePreview.tsx`, `ko.json`, `en.json`, `ja.json`

**2025-11-14 (Part 2)**: Fix experience duration calculation to include end month

- Fixed `calculateMonths()` to include both start and end months in duration calculation
- Example: 2021-10 ~ 2022-05 now correctly calculates as 8 months (not 7)
  - Includes: Oct, Nov, Dec (2021) + Jan, Feb, Mar, Apr, May (2022) = 8 months
- Also fixed `calculateTotalExperienceWithOverlap()` merged interval calculation
- Updated all test expectations to match the corrected calculation
- All 15 tests passing

**2025-12-18**: WCAG 2.1 AA Design System Refactor

- Updated from amber theme to Oak Brown (#8B5E3C) theme
- All colors now use `theme-*` CSS tokens for consistency
- WCAG 2.1 AA compliant (4.5:1+ contrast ratio)
- Uses Lucide-React icons for iconography
- Removed character mascots, uses StatusMessage component

**2025-11-14**: Resume list UI improvements with i18n

- Added resume copy button to ResumeList component
- Refactored ResumeList.tsx to use i18n for all user-facing text
- Added translation keys to en.json, ko.json, ja.json: `resume.list.*`
- Copy feature: Uses existing backend API `POST /v1/resume/:id/copy`

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

**Stack**: Oak Brown theme (WCAG 2.1 AA), i18n (KR/EN/JA), Vitest
