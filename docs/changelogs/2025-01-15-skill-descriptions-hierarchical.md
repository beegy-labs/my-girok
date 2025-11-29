# Skill Descriptions - Hierarchical Structure (4 Depth Levels)

**Date**: 2025-01-15
**Type**: Feature Enhancement
**Scope**: Resume Management - Skills Section

## Overview

Enhanced the Skills section to support hierarchical descriptions with 4 depth levels, similar to the existing Key Achievements structure in Work Experience. Users can now add detailed, structured explanations of their skill usage and experience.

## Motivation

Previously, skill descriptions were limited to a single text field, making it difficult to:
- Organize complex skill experiences hierarchically
- Show progressive detail from high-level to specific implementations
- Maintain consistent formatting across different skills
- Present structured information in a professional resume format

The new hierarchical structure allows developers to showcase their skills with rich, organized details.

## Changes

### 1. Type Definitions (Frontend)

**File**: `apps/web-main/src/api/resume.ts`

Added new `SkillDescription` interface:

```typescript
export interface SkillDescription {
  id?: string;
  content: string; // Description text
  depth: number; // 1-4 (indentation level)
  order: number;
  children?: SkillDescription[]; // Hierarchical structure
}
```

Updated `SkillItem` interface:

```typescript
export interface SkillItem {
  name: string; // 기술명 (e.g., "React", "Node.js")
  description?: string; // Legacy: 단순 텍스트 설명 (backward compatibility)
  descriptions?: SkillDescription[]; // 활용 경험/세부 설명 (hierarchical, 4 depth levels)
}
```

**Backward Compatibility**: The legacy `description` field is retained for existing data.

### 2. Backend DTOs

**File**: `services/personal-service/src/resume/dto/create-resume.dto.ts`

Added `SkillDescriptionDto`:

```typescript
export class SkillDescriptionDto {
  @ApiProperty({ example: 'React Hooks와 Context API를 활용한 전역 상태 관리' })
  @IsString()
  content!: string;

  @ApiProperty({ example: 1, description: 'Indentation depth (1-4)' })
  @IsInt()
  @Min(1)
  depth!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ type: [SkillDescriptionDto], description: 'Child descriptions (recursive structure)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDescriptionDto)
  children?: SkillDescriptionDto[];
}
```

Updated `SkillItemDto` to include optional `descriptions` field.

**Note**: No database schema changes required - Skills already use `Json` type in Prisma.

### 3. Reusable UI Component

**File**: `apps/web-main/src/components/resume/HierarchicalDescription.tsx` (New)

Created a generic, reusable component for hierarchical descriptions:

**Features**:
- **4 Depth Levels**: Supports up to 4 levels of indentation
- **Bullet Symbols**:
  - Depth 1: • (filled circle)
  - Depth 2: ◦ (open circle)
  - Depth 3: ▪ (filled square)
  - Depth 4: ▫ (open square)
- **Drag & Drop**: Root-level items can be reordered via @dnd-kit
- **Recursive Structure**: Each item can have unlimited children
- **Add Sub-items**: "+ 하위" button to add children (up to max depth)
- **Collapse/Expand**: Show/hide children
- **Overflow Handling**: Proper word-breaking and width constraints

**Props**:
```typescript
interface HierarchicalDescriptionProps {
  items: HierarchicalItem[];
  onChange: (items: HierarchicalItem[]) => void;
  label?: string; // Default: "설명"
  placeholder?: string;
  maxDepth?: number; // Default: 4
}
```

### 4. Skills Section Update (Form)

**File**: `apps/web-main/src/components/resume/ResumeForm.tsx`

**Changes**:
- Replaced textarea for descriptions with `HierarchicalDescription` component
- Added import for `HierarchicalDescription` and `HierarchicalItem`
- Displays legacy description with migration notice (yellow banner)

**UI Flow**:
1. User adds a skill item (e.g., "React")
2. Clicks "+ 추가" button to add hierarchical descriptions
3. Adds main points at depth 1
4. Clicks "+ 하위" on any item to add sub-points (up to depth 4)
5. Drag & drop to reorder root-level descriptions

### 5. Skills Section Update (Preview)

**File**: `apps/web-main/src/components/resume/ResumePreview.tsx`

**Changes**:
- Added `renderDescriptions()` function (similar to `renderAchievements()`)
- Renders hierarchical descriptions with proper indentation (1.5em per level)
- Uses correct bullet symbols based on depth
- Fallback to legacy `description` field if no hierarchical descriptions exist

**Rendering**:
```typescript
const renderDescriptions = (descriptions: any[]) => {
  if (!descriptions || descriptions.length === 0) return null;
  return descriptions.sort((a, b) => a.order - b.order).map((desc, idx) => (
    <div key={idx}>
      <div
        className="flex items-start break-words"
        style={{
          marginLeft: getIndentation(desc.depth),
          marginBottom: '0.25rem'
        }}
      >
        <span className="mr-1 select-none flex-shrink-0">{getBulletStyle(desc.depth)}</span>
        <span className="flex-1 break-words overflow-wrap-anywhere">{desc.content}</span>
      </div>
      {desc.children && desc.children.length > 0 && renderDescriptions(desc.children)}
    </div>
  ));
};
```

### 6. Overflow Design Fixes

Applied across all hierarchical components:

**ExperienceSection.tsx** (HierarchicalAchievement):
- Added `maxWidth: calc(100% - ${(depth - 1) * 1.5}rem)`
- Added `flex-shrink-0` to bullet/depth indicators
- Added `min-w-0` to input fields
- Added `wordBreak: 'break-word', overflowWrap: 'anywhere'` styles

**HierarchicalDescription.tsx**:
- Same overflow fixes as ExperienceSection
- Ensures long text wraps properly within container
- Prevents horizontal scrolling even at depth 4

**ResumePreview.tsx** (SkillsSection):
- Added `break-words`, `overflow-wrap-anywhere` classes
- Added `min-w-0`, `flex-shrink-0` for flex items
- Ensures print-friendly layout

## Database Impact

**No schema changes required.**

The Skills table already uses `items Json` column, which can store the new hierarchical structure without migration.

**Existing Data**:
- Old resumes with `{ name: "React", description: "3년 경험" }` continue to work
- New resumes can use `{ name: "React", descriptions: [...] }`
- Both formats coexist peacefully

## UI/UX Guidelines

### Form Input

**Location**: Resume Edit Page → Skills Section → Each Skill Item

**Layout**:
```
┌─────────────────────────────────────────────┐
│ 기술명: React                    [삭제]      │
├─────────────────────────────────────────────┤
│ ⭐ 활용 경험 / 세부 설명 (최대 4단계) [+ 추가]│
│                                             │
│ [≡] • (1) React Hooks 전역 상태 관리   [+ 하위] [✕] │
│     ◦ (2) useState, useContext 활용  [+ 하위] [✕]   │
│         ▪ (3) useMemo로 최적화      [+ 하위] [✕]     │
│             ▫ (4) 렌더링 40% 감소          [✕]       │
└─────────────────────────────────────────────┘
```

**Interactions**:
- **Drag Handle (≡)**: Reorder root-level items
- **+ 하위**: Add child item (appears until depth 4)
- **▼/▶**: Collapse/expand children
- **✕**: Remove item

### Preview Display

**Print-Optimized Format**:

```
Frontend
  • React
    • React Hooks와 Context API를 활용한 전역 상태 관리
      ◦ useState, useEffect, useContext 활용
        ▪ 성능 최적화를 위한 useMemo, useCallback 사용
          ▫ 렌더링 횟수 40% 감소
    • React Router v6를 이용한 SPA 라우팅 구현
```

**Styling**:
- Standard 1.5em indentation per depth level
- Professional bullet progression (• → ◦ → ▪ → ▫)
- Text wraps properly within margins
- Consistent with Work Experience achievements

## Migration Guide

### For Users with Existing Descriptions

When editing a skill with a legacy text description:

1. Old description appears in yellow banner:
   ```
   ┌─────────────────────────────────────────┐
   │ ⚠️ 기존 설명: 3년 실무 경험            │
   │                                         │
   │ 위 내용은 기존 텍스트 형식입니다.       │
   │ 새로운 계층 구조로 마이그레이션하려면   │
   │ 위에서 "+ 추가" 버튼을 눌러             │
   │ 새로운 항목을 추가하세요.               │
   └─────────────────────────────────────────┘
   ```

2. Click "+ 추가" to start using hierarchical structure
3. Copy content from old description into new hierarchical items
4. Save - old description remains as fallback until deleted

### For New Resumes

1. Add skill item (e.g., "React")
2. Click "+ 추가" to add first description point
3. Type main point (depth 1)
4. Click "+ 하위" to add details (depth 2-4)
5. Drag to reorder as needed

## Example Use Cases

### Frontend Developer - React

```
• React
  • React Hooks와 Context API를 활용한 전역 상태 관리
    ◦ useState, useEffect, useContext 활용
    ◦ Custom Hooks 개발로 로직 재사용성 향상
      ▪ useAuth, useFetch 등 5개 이상의 Custom Hooks 제작
  • React Router v6를 이용한 SPA 라우팅 구현
    ◦ 동적 라우팅 및 Protected Routes 구현
```

### Backend Developer - NestJS

```
• NestJS
  • RESTful API 및 GraphQL 서버 개발
    ◦ @nestjs/graphql을 활용한 GraphQL Schema 설계
    ◦ TypeORM을 이용한 데이터베이스 연동
      ▪ PostgreSQL, MySQL 연동 경험
      ▪ 트랜잭션 관리 및 쿼리 최적화
        ▫ N+1 문제 해결로 응답 속도 60% 개선
```

### DevOps - Kubernetes

```
• Kubernetes
  • EKS 클러스터 구축 및 운영
    ◦ Helm Chart를 이용한 애플리케이션 배포
    ◦ ArgoCD를 활용한 GitOps 구현
      ▪ 자동화된 CI/CD 파이프라인 구축
      ▪ 배포 시간 70% 단축
  • 모니터링 및 로깅 시스템 구축
    ◦ Prometheus + Grafana 대시보드
    ◦ ELK Stack을 이용한 중앙 집중식 로깅
```

## Testing Checklist

### Manual Testing

- [x] **Create**: Add new skill with hierarchical descriptions
- [x] **Read**: View hierarchical descriptions in preview
- [x] **Update**: Edit existing hierarchical descriptions
- [x] **Delete**: Remove individual description items
- [x] **Drag & Drop**: Reorder root-level descriptions
- [x] **Add Child**: Add sub-items up to depth 4
- [x] **Collapse/Expand**: Toggle children visibility
- [x] **Overflow**: Long text wraps properly at all depths
- [x] **Legacy Data**: Old description field displays correctly
- [x] **Print Preview**: Hierarchical format renders correctly

### Build Tests

- [x] `pnpm --filter @my-girok/web-main build` - ✅ Success
- [x] `pnpm --filter @my-girok/personal-service build` - ✅ Success

### Browser Compatibility

- Chrome/Edge: ✅ Expected to work
- Firefox: ✅ Expected to work
- Safari: ✅ Expected to work

## Performance Considerations

**Impact**: Minimal

- Hierarchical structure uses recursive rendering (same as Work Experience)
- Drag & drop library (@dnd-kit) already used in codebase
- No additional database queries required
- JSON column storage is efficient for nested data

**Optimization**:
- Memoization can be added if performance issues arise
- Collapse/expand prevents rendering all children at once

## Design System Compliance

**Colors**: Amber library theme maintained
- Primary: `amber-900` for headings
- Borders: `amber-100`, `amber-200`, `amber-300`
- Backgrounds: `amber-50/30`, `amber-50/20`
- Buttons: `amber-600`, `amber-700`

**Icons**: Emoji-based for warmth
- ⭐ for descriptions
- ✕ for remove
- ▼/▶ for collapse/expand

**Spacing**: Follows 4px grid system

## Future Enhancements

### Potential Features

1. **Skill Level Indicators**: Add proficiency levels (Beginner, Intermediate, Expert)
2. **Years of Experience**: Auto-calculate from project dates
3. **Skill Categories**: Tag skills (Frontend, Backend, DevOps, etc.)
4. **AI Suggestions**: Recommend description structure based on skill name
5. **Import from LinkedIn**: Parse LinkedIn skills section

### Under Consideration

- Skill endorsements/certifications
- Visual skill graphs (radar charts)
- Skill-to-job matching scores

## Documentation Updates

- ✅ `docs/changelogs/2025-01-15-skill-descriptions-hierarchical.md` (this file)
- ✅ `docs/policies/RESUME.md` - Updated Skills section documentation

## References

- **Design System**: `docs/DESIGN_SYSTEM.md`
- **Resume Policy**: `docs/policies/RESUME.md`
- **Similar Feature**: Work Experience hierarchical achievements (2025-01-13)

## Contributors

- Implementation: Claude (AI Assistant)
- Review: Pending

---

**Status**: ✅ Implementation Complete
**Next Steps**: Code review → Merge to main → Deploy to dev environment
