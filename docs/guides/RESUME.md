# Resume Feature Guide

> Comprehensive documentation for the Resume Management feature in My-Girok

## Overview

The Resume feature allows users to create, edit, preview, and share professional resumes with full support for the Korean job market. It includes real-time PDF preview, drag-and-drop section reordering, hierarchical achievements, and multi-format export.

## Table of Contents

1. [Architecture](#architecture)
2. [Key Components](#key-components)
3. [Data Structure](#data-structure)
4. [Section Order Manager](#section-order-manager)
5. [PDF Generation](#pdf-generation)
6. [Design Compliance](#design-compliance)
7. [Performance Optimization](#performance-optimization)
8. [Korean Market Features](#korean-market-features)
9. [File Locations](#file-locations)
10. [Changelog](#changelog)

---

## Architecture

### Component Hierarchy

```
ResumeEditPage
├── ResumeForm (Form input)
│   ├── CollapsibleSection (Settings, BasicInfo, etc.)
│   ├── SectionOrderManager (Drag-and-drop reorder)
│   ├── ExperienceSection (Work history)
│   ├── EducationSection (Education history)
│   ├── SkillsSection (Skills with hierarchical descriptions)
│   └── HierarchicalDescription (Reusable 4-depth input)
└── ResumePreviewContainer
    └── ResumePreview (PDF preview)
        └── ResumePdfDocument (@react-pdf/renderer)
```

### Data Flow

```
User Input → ResumeForm → onChange (debounced 800ms) → ResumePreview → PDF Generation
                ↓
            Save Button → API Call → personal-service → Database
```

---

## Key Components

### ResumeForm.tsx

Main form component for resume data input.

**Features:**

- Collapsible sections with expand/collapse state
- Auto-save drafts to localStorage
- Profile photo upload with temp storage
- Dynamic section ordering via SectionOrderManager

**Best Practices Applied:**

- `useCallback` for all event handlers
- `useMemo` for derived data
- Module-scope constants for static data
- Debounced onChange (800ms) for performance

### SectionOrderManager.tsx

Drag-and-drop interface for reordering resume sections.

**Features:**

- 8 manageable sections (EXPERIENCE, EDUCATION, SKILLS, etc.)
- Visibility toggles per section
- @dnd-kit integration with PointerSensor and KeyboardSensor
- Korean resume priority order by default

**Module-scope Constants:**

```typescript
const SECTION_ICONS: Record<FormSectionType, string> = {
  EXPERIENCE: '💼',
  EDUCATION: '🎓',
  SKILLS: '⚡',
  // ...
};

const SECTION_LABEL_KEYS: Record<FormSectionType, string> = {
  EXPERIENCE: 'resume.sections.experience',
  // ...
};
```

### ResumePreview.tsx

Real-time PDF preview using react-pdf and @react-pdf/renderer.

**Features:**

- Continuous and paginated view modes
- Grayscale toggle for print optimization
- A4 and Letter paper size support
- Image loading with base64 conversion for CORS bypass

**React 19 Compatibility:**

- Uses `pdf()` function instead of `usePDF` hook to avoid "Eo is not a function" error
- GitHub Issues: #3164, #3187, #2756

---

## Data Structure

### Resume Model

```typescript
interface Resume {
  id: string;
  title: string;
  description?: string;
  isDefault: boolean;
  paperSize: 'A4' | 'LETTER';

  // Basic Info
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profileImage?: string;

  // Links
  github?: string;
  blog?: string;
  linkedin?: string;
  portfolio?: string;

  // Korean Market Fields
  birthDate?: string; // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  militaryService?: 'COMPLETED' | 'EXEMPTED' | 'NOT_APPLICABLE';
  applicationReason?: string;
  coverLetter?: string;
  keyAchievements?: string[];

  // Dynamic Sections
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certificates: Certificate[];
  sections: Section[]; // Order and visibility
}
```

### FormSectionType Enum

Frontend-only section types for ordering (8 sections):

| Type               | Icon | Label (Korean) |
| ------------------ | ---- | -------------- |
| EXPERIENCE         | 💼   | 경력           |
| EDUCATION          | 🎓   | 학력           |
| SKILLS             | ⚡   | 기술           |
| CERTIFICATE        | 🏆   | 자격증         |
| KEY_ACHIEVEMENTS   | 🏅   | 핵심성과       |
| APPLICATION_REASON | 💡   | 지원동기       |
| ATTACHMENTS        | 📎   | 첨부파일       |
| COVER_LETTER       | 📝   | 자기소개서     |

**Note:** BASIC_INFO is always first and not reorderable.

---

## Section Order Manager

### Default Priority Order (Korean Resume Standard)

```
1. 경력 (Experience)
2. 학력 (Education)
3. 기술 (Skills)
4. 자격증 (Certificates)
5. 핵심성과 (Key Achievements)
6. 지원동기 (Application Reason)
7. 첨부파일 (Attachments)
8. 자기소개서 (Cover Letter)
```

### Initialization Logic

The `initializeSections()` function:

1. Loads sections from backend if available
2. Filters invalid section types (e.g., PROJECT, MILITARY that don't exist in frontend)
3. Adds frontend-only sections not in backend
4. Sorts by order

```typescript
const initializeSections = (resumeSections?: Section[]): FormSection[] => {
  // Filter valid FormSectionType values
  const validFormSectionTypes = new Set(Object.values(FormSectionType));

  // Merge backend + frontend-only sections
  // ...
};
```

---

## PDF Generation

### Image Handling

Profile images are converted to base64 to avoid CORS issues:

```typescript
// imageProxy.ts - Canvas-based approach
export async function imageToBase64(url?: string): Promise<string | null> {
  if (!url) return null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  // ... canvas conversion
}
```

### Export Functions

| Function                    | Purpose                  |
| --------------------------- | ------------------------ |
| `exportResumeToPDF()`       | Download PDF file        |
| `generateResumePDFBlob()`   | Get PDF as Blob          |
| `generateResumePDFBase64()` | Get PDF as base64 string |
| `printResumePDF()`          | Open PDF for printing    |

All functions pass `profileImageBase64` to `ResumePdfDocument` for embedded image support.

---

## Design Compliance

### 8pt Grid System

All spacing follows 8pt grid (8px, 16px, 24px, 32px increments):

| Allowed | Value | Disallowed | Value |
| ------- | ----- | ---------- | ----- |
| `p-2`   | 8px   | `p-3`      | 12px  |
| `p-4`   | 16px  | `p-5`      | 20px  |
| `gap-2` | 8px   | `gap-3`    | 12px  |
| `gap-4` | 16px  | `gap-5`    | 20px  |
| `mb-4`  | 16px  | `mb-3`     | 12px  |

### SSOT (Single Source of Truth)

All styling uses theme tokens:

```tsx
// ✅ Correct
className = 'bg-theme-bg-card text-theme-text-primary border-theme-border-subtle';

// ❌ Wrong
className = 'bg-white text-gray-900 border-gray-200';
```

### Border Radius

Use `rounded-soft` (8px) for all UI components:

```tsx
// ✅ Correct
className = 'rounded-soft';

// ❌ Wrong
className = 'rounded-lg'; // 8px but not SSOT
className = 'rounded-[12px]'; // Magic number
```

---

## Performance Optimization

### React Best Practices (2025)

1. **Module-scope Constants**

   ```typescript
   // ✅ Outside component
   const SECTION_ICONS = { ... };

   // ❌ Inside component
   function Component() {
     const icons = { ... }; // Recreated every render
   }
   ```

2. **Memoized Handlers**

   ```typescript
   const handleClick = useCallback(
     (id: string) => {
       // ...
     },
     [dependency],
   );
   ```

3. **Memoized List Items**

   ```typescript
   const SortableSection = memo(function SortableSection(props) {
     // ...
   });
   ```

4. **Debounced Form Changes**

   ```typescript
   const FORM_CHANGE_DEBOUNCE_MS = 800;

   useEffect(() => {
     const timeout = setTimeout(() => {
       onChange?.(formData);
     }, FORM_CHANGE_DEBOUNCE_MS);
     return () => clearTimeout(timeout);
   }, [formData]);
   ```

---

## Korean Market Features

### Birth Date & Age Calculation

```typescript
// Display: "1994 (30세)"
const age = calculateKoreanAge(birthDate); // 만 나이
```

### Military Service

| Status         | Korean   | Description       |
| -------------- | -------- | ----------------- |
| COMPLETED      | 군필     | Completed service |
| EXEMPTED       | 면제     | Exempted          |
| NOT_APPLICABLE | 해당없음 | Not applicable    |

### Cover Letter Sections

2-depth structure:

- Title (제목)
- Content (내용)

---

## File Locations

### Frontend

| File                                                          | Purpose                    |
| ------------------------------------------------------------- | -------------------------- |
| `apps/web-main/src/components/resume/ResumeForm.tsx`          | Main form component        |
| `apps/web-main/src/components/resume/SectionOrderManager.tsx` | Drag-and-drop ordering     |
| `apps/web-main/src/components/resume/ResumePreview.tsx`       | PDF preview                |
| `apps/web-main/src/components/resume/ResumePdfDocument.tsx`   | PDF document structure     |
| `apps/web-main/src/utils/pdf.ts`                              | PDF export functions       |
| `apps/web-main/src/utils/imageProxy.ts`                       | Image to base64 conversion |

### Backend

| File                                                            | Purpose                |
| --------------------------------------------------------------- | ---------------------- |
| `services/personal-service/src/resume/resume.service.ts`        | Resume CRUD operations |
| `services/personal-service/src/resume/dto/create-resume.dto.ts` | Request validation     |
| `services/personal-service/prisma/schema.prisma`                | Database schema        |

### Documentation

| File                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `.ai/resume.md`         | LLM-optimized reference (token-efficient) |
| `docs/guides/RESUME.md` | Human-readable guide (this file)          |

---

## Changelog

### 2025-12-24

**Part 2: 8pt Grid System Compliance**

- Fixed remaining spacing violations:
  - `ResumeForm.tsx`: `space-y-3` → `space-y-4`, `mb-3` → `mb-4`, `gap-3` → `gap-4`, `px-3` → `px-4`, `p-3` → `p-4`
  - `ResumePreview.tsx`: `py-3` → `py-4`, `gap-3` → `gap-4`

**Part 1: Section Order Manager & PDF Fix**

- Restructured `FormSectionType` to 8 sections (removed BASIC_INFO, PROJECT, MILITARY)
- Fixed PDF image export using `imageToBase64()` from `imageProxy.ts`
- Extracted constants to module scope for performance
- Added `initializeSections()` to filter invalid backend section types

### 2025-12-23

**PDF Rendering Stability**

- Fixed @react-pdf/renderer "Eo is not a function" crash
- Added `sanitizeText()` for emoji removal
- Added 800ms debounce to form onChange
- Fixed profile photo re-selection after deletion

---

## Related Documentation

- **LLM Reference:** [.ai/resume.md](../../.ai/resume.md) - Quick patterns and APIs
- **Design System:** [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Visual specifications
- **SSOT Guide:** [.ai/ssot.md](../../.ai/ssot.md) - Token architecture
- **Rules:** [.ai/rules.md](../../.ai/rules.md) - Core development rules

---

_Last updated: 2025-12-24_
