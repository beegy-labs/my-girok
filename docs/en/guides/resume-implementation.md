# Resume Implementation Guide

This guide covers PDF export functionality, React 19 compatibility considerations, performance optimizations, file storage policies, share link implementation, and data models for the resume feature.

## Overview

The resume feature allows users to create, edit, and share professional resumes with PDF export capabilities. This guide explains the implementation details and best practices for working with this feature.

## PDF Export

The resume system provides multiple PDF export methods for different use cases:

```typescript
exportResumeToPDF(); // Downloads PDF to user's device
generateResumePDFBlob(); // Returns a Blob for further processing
generateResumePDFBase64(); // Returns Base64 for API transmission
printResumePDF(); // Opens browser print dialog
```

### Image Handling

Images in resumes are converted to Base64 before PDF generation. This approach bypasses CORS restrictions that would otherwise prevent external images from being included in the PDF.

## React 19 Compatibility

React 19 introduced changes to the reconciliation algorithm that affect PDF generation. The following workarounds are necessary:

```typescript
// Use pdf() function instead of usePDF hook for better stability
// Add key={Date.now()} to force re-render and avoid reconciler crashes
<ResumePreviewContainer key={Date.now()} resume={resume} />
```

The key prop with a timestamp ensures a fresh component instance is created when the resume data changes, avoiding internal state conflicts.

## Performance Optimizations

### Debouncing Form Changes

To prevent excessive re-renders during typing, form changes are debounced with an 800ms delay:

```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => onChange(formData), 800);
  return () => clearTimeout(timeoutRef.current);
}, [formData]);
```

This ensures the preview updates only after the user pauses typing, reducing CPU usage and preventing visual jitter.

### Memoization

Static values and callbacks are memoized to prevent unnecessary re-renders:

```typescript
const SECTION_ICONS = { EXPERIENCE: '💼', EDUCATION: '🎓' };
const handleEdit = useCallback((id) => navigate(`/edit/${id}`), [navigate]);
```

### Preview Scaling

The resume preview scales responsively based on screen width:

| Screen Size      | Scale Factor |
| ---------------- | ------------ |
| Desktop (>794px) | 100%         |
| Tablet (~768px)  | ~93%         |
| Mobile (~375px)  | ~43%         |

This ensures the preview remains usable on all device sizes while maintaining accurate proportions.

## File Storage

### Storage Policy

Profile photos follow these storage guidelines:

| Aspect   | Policy                                                   |
| -------- | -------------------------------------------------------- |
| Storage  | Store original color image only                          |
| Display  | Color by default, CSS grayscale toggle available         |
| Location | MinIO bucket: `resumes/{userId}/{resumeId}/{uuid}.{ext}` |
| Temp     | `tmp/{userId}/{uuid}.{ext}` with 24-hour cleanup         |

### Why Store Color Only

Storing only the color version reduces storage costs while providing flexibility. Grayscale conversion is applied via CSS filter when needed, allowing users to toggle between modes without re-uploading images.

## Share Links

### URL Patterns

| Link Type      | Frontend Route   | Backend Endpoint                  |
| -------------- | ---------------- | --------------------------------- |
| Public profile | `/:username`     | `GET /v1/resume/public/:username` |
| Share link     | `/shared/:token` | `GET /v1/share/public/:token`     |

### Creating Share Links

To create a shareable link for a resume:

```
POST /v1/share/resume/:resumeId
Response: { id, token, resumeId, expiresAt }
```

The generated share URL follows the format: `https://domain/shared/${token}`

Share links can have expiration dates and can be revoked by the user.

## Data Models

### DegreeType Enum

The education section supports the following degree types:

| Value       | Korean   | English          |
| ----------- | -------- | ---------------- |
| HIGH_SCHOOL | 고등학교 | High School      |
| ASSOCIATE_2 | 2년제    | 2-Year Associate |
| ASSOCIATE_3 | 3년제    | 3-Year Associate |
| BACHELOR    | 학사     | Bachelor's       |
| MASTER      | 석사     | Master's         |
| DOCTORATE   | 박사     | Doctorate        |

### Education Model

```typescript
interface Education {
  school: string; // Required - institution name
  major: string; // Required - field of study
  degree?: DegreeType; // Optional - degree level
  startDate: string; // Required - format: YYYY-MM
  endDate?: string; // Optional - null indicates currently enrolled
  gpa?: string; // Optional - grade point average
  order: number; // For drag-drop ordering
}
```

## Design Compliance

### Theme Tokens

Use design system theme tokens for consistent styling:

```tsx
className = 'bg-theme-bg-card text-theme-text-primary rounded-soft';
```

### 8pt Grid System

Follow the 8-point grid for spacing:

```tsx
className = 'p-4 gap-4 mb-4'; // 16px (2 × 8pt)
```

## Changelog

| Date       | Changes                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| 2025-12-26 | Removed birthYear field, added PREFER_NOT_TO_SAY option, extended SectionType, soft delete, UUIDv7 tokens |
| 2025-12-23 | Fixed PDF crash issue, added sanitizeText() utility, implemented 800ms debounce                           |
| 2025-11-20 | Added birthDate and gender fields to personal information                                                 |
| 2025-11-19 | Integrated Paged.js for PDF generation, optimized print margins                                           |

---

_This document is auto-generated from `docs/llm/guides/resume-implementation.md`_
