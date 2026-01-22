# Resume Feature

## Architecture

```
ResumeEditPage
├── ResumeForm (input, 800ms debounce)
│   ├── SectionOrderManager (drag-drop)
│   ├── ExperienceSection
│   ├── EducationSection
│   ├── SkillsSection
│   └── HierarchicalDescription (4 depth)
└── ResumePreviewContainer
    └── ResumePdfDocument (@react-pdf/renderer)
```

## Data Flow

```
User Input -> ResumeForm -> onChange (800ms debounce) -> PDF Preview
                 |
                 v
            Save -> API -> personal-service -> Database
```

## Section Types

| Type               | Icon | Korean     | Note                                |
| ------------------ | ---- | ---------- | ----------------------------------- |
| BASIC_INFO         | -    | 기본정보   | Always first, not reorderable       |
| EXPERIENCE         | 💼   | 경력       | Company -> Projects -> Achievements |
| EDUCATION          | 🎓   | 학력       | Drag-drop, degree enum              |
| SKILLS             | ⚡   | 기술       | Category -> Items -> Descriptions   |
| CERTIFICATE        | 🏆   | 자격증     |                                     |
| KEY_ACHIEVEMENTS   | 🏅   | 핵심성과   | string[]                            |
| APPLICATION_REASON | 💡   | 지원동기   |                                     |
| COVER_LETTER       | 📝   | 자기소개서 |                                     |

## Korean Market Fields

| Field             | Type       | Purpose                                |
| ----------------- | ---------- | -------------------------------------- |
| birthDate         | YYYY-MM-DD | 만 나이                                |
| gender            | enum       | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| militaryService   | enum       | COMPLETED, EXEMPTED, NOT_APPLICABLE    |
| coverLetter       | string     | 자기소개서                             |
| applicationReason | string     | 지원 동기                              |
| keyAchievements   | string[]   | 주요 성과                              |

## Hierarchical Achievements (4 Depth)

```
• Depth 1 (Main)
  ◦ Depth 2 (Sub)
    ▪ Depth 3 (Details)
      ▫ Depth 4 (Specific)
```

Used: Experience (achievements), Skills (descriptions)

## Paged.js Integration

```typescript
useEffect(() => {
  if (viewMode === 'paginated' && contentRef.current) {
    const paged = new Previewer();
    const dynamicCSS = `@page { size: ${paperSize === 'A4' ? 'A4' : 'letter'}; margin: 0; }`;
    paged.preview(content, [dynamicCSS], container);
  }
}, [viewMode, resume, paperSize]);
```

## Print CSS

```css
@media print {
  #resume-content {
    display: none !important;
  }
  .pagedjs-container {
    display: block !important;
  }
  .pagedjs_page {
    width: 100% !important;
    max-width: 100% !important;
  }
  a,
  span,
  p,
  div,
  li {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  img,
  video,
  svg {
    max-width: 100% !important;
    height: auto !important;
  }
}
```

## Print Settings

| Setting             | Value        |
| ------------------- | ------------ |
| Margins             | None         |
| Headers/footers     | None         |
| Background graphics | On           |
| Paper Size          | A4 or Letter |

## Related Documentation

- **Implementation Details**: `resume-implementation.md`
- File Locations: `apps/web-girok/src/components/resume/`, `services/personal-service/src/resume/`
