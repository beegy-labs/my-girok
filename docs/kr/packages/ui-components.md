# @my-girok/ui-components

> WCAG 2.1 AAA 준수 React 컴포넌트

## Components

### Button

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg' | 'xl';
  rounded: 'default' | 'subtle' | 'editorial' | 'full';
}
```

| 사이즈 | 높이 | 타이포그래피         |
| ------ | ---- | -------------------- |
| sm     | 44px | 보통                 |
| md     | 44px | 보통                 |
| lg     | 56px | font-black uppercase |
| xl     | 64px | font-black uppercase |

### TextInput

```typescript
interface TextInputProps {
  size: 'sm' | 'default' | 'lg' | 'xl';
  variant: 'default' | 'filled' | 'outlined' | 'ghost';
  icon?: ReactNode;
  showPasswordToggle?: boolean;
  clearable?: boolean;
  showCharCount?: boolean;
}
```

| 사이즈  | 높이 |
| ------- | ---- |
| sm      | 40px |
| default | 48px |
| lg      | 56px |
| xl      | 64px |

### Card

```typescript
interface CardProps {
  variant: 'primary' | 'secondary' | 'elevated';
  padding: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  radius: 'none' | 'subtle' | 'default' | 'lg' | 'xl' | '2xl';
}
```

### Badge

```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  size: 'sm' | 'md' | 'lg';
}
```

## Component List

| 컴포넌트           | 목적                           |
| ------------------ | ------------------------------ |
| Alert              | 상태 메시지 및 알림            |
| SelectInput        | 드롭다운 선택 메뉴             |
| TextArea           | 다중 줄 텍스트 입력            |
| CollapsibleSection | 확장/축소 가능한 섹션          |
| MenuCard           | 64px 편집자 스타일 메뉴 카드   |
| MenuRow            | 핀 표시가 있는 리스트 행       |
| ViewToggle         | 그리드/리스트 보기 토글 (56px) |
| TopWidget          | 대시보드 고정 위젯             |
| PageContainer      | 일관된 패딩을 가진 페이지 래퍼 |
| PageHeader         | 옵션 백 링크가 있는 제목       |

## Theme Tokens

라이트 및 다크 모드에서 일관된 스타일링을 위해 테마 토큰을 사용합니다:

```tsx
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">
  {/* Content */}
</div>
```

### Available Tokens

| 토큰                          | 사용법           |
| ----------------------------- | ---------------- |
| `bg-theme-bg-page`            | 페이지 배경      |
| `bg-theme-bg-card`            | 카드/표면 배경   |
| `text-theme-text-primary`     | 주요 텍스트 색상 |
| `text-theme-text-secondary`   | 보조 텍스트 색상 |
| `border-theme-border-default` | 기본 테두리      |
| `border-theme-border-subtle`  | 미세 테두리      |
| `text-theme-primary`          | 주요 강조 색상   |
| `bg-theme-primary`            | 주요 강조 배경   |

## Hooks

### useClickOutside

참조된 요소 외부의 클릭을 감지합니다:

```typescript
import { useClickOutside } from '@my-girok/ui-components';

const ref = useRef<HTMLDivElement>(null);
const [isOpen, setIsOpen] = useState(false);

useClickOutside(ref, isOpen, () => setIsOpen(false));

return (
  <div ref={ref}>
    {isOpen && <Dropdown />}
  </div>
);
```

## Commands

```bash
# Development (Storybook)
pnpm --filter @my-girok/ui-components storybook

# Build for production
pnpm --filter @my-girok/ui-components build
```

---

**LLM 참조**: `docs/llm/packages/ui-components.md`
