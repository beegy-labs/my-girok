# 디자인 시스템

> V0.0.1 AAA 워크스테이션 - WCAG 2.1 AAA 준수 디자인 시스템

## 시각 스타일

| 요소            | 사양                     |
| --------------- | ------------------------ |
| 카드 반경       | 48px(폼용), 64px(섹션용) |
| 테두리 두께     | 2px(상호작용 요소용)     |
| 패딩            | `p-10 md:p-14`(카드용)   |
| 터치 대상       | 44px 최소, 56px(주요용)  |
| 포커스 링       | 4px 너비, 4px 오프셋     |
| 네비게이션 높이 | 80px                     |

## 타이포그래피

| 요소          | 스타일링                                             |
| ------------- | ---------------------------------------------------- |
| 히어로 타이틀 | `text-[10rem] italic tracking-tighter serif`         |
| 페이지 타이틀 | `text-4xl sm:text-5xl italic tracking-tighter serif` |
| 카드 타이틀   | `text-2xl font-bold`                                 |
| 배지          | `text-[11px] font-black uppercase tracking-[0.3em]`  |
| 입력 라벨     | `text-xs font-bold uppercase tracking-widest`        |

**폰트 스택**:

- Title: Playfair Display (italic)
- Brand: System monospace

## 테마 아키텍처

```
Layer 0: @property definitions  → Type safety
Layer 1: Palette (--palette-*)  → Raw color values
Layer 2: Semantic (--theme-*)   → Theme-switchable tokens
Layer 3: Tailwind               → bg-theme-*, text-theme-*
```

## 색상 팔레트

### 라이트 모드 (Clean White Oak)

| 토큰           | 값      | 대비 비율 |
| -------------- | ------- | --------- |
| Primary Text   | #262220 | 15.76:1   |
| Secondary Text | #4A4744 | 9.23:1    |
| Primary Accent | #6B4A2E | 7.94:1    |

### 다크 모드 (Midnight Gentle Study)

| 토큰           | 값      | 대비 비율 |
| -------------- | ------- | --------- |
| Primary Text   | #CCC5BD | 9.94:1    |
| Secondary Text | #B4ADA5 | 7.65:1    |
| Primary Accent | #D0B080 | 8.25:1    |

모든 색상 조합은 **WCAG 2.1 AAA** (7:1+ 대비 비율)를 충족합니다.

## 반경 토큰

| 토큰                  | 크기 | 사용 용도             |
| --------------------- | ---- | --------------------- |
| rounded-soft          | 8px  | 모든 UI 요소의 기본값 |
| rounded-input         | 24px | 대형 입력 필드        |
| rounded-editorial-lg  | 48px | 폼 카드               |
| rounded-editorial-2xl | 64px | 섹션 컨테이너         |

## 버튼 크기

| 크기  | 높이 | 스타일링                        |
| ----- | ---- | ------------------------------- |
| sm/md | 44px | 표준 터치 대상                  |
| lg    | 56px | `font-black uppercase`          |
| xl    | 64px | `font-black uppercase tracking` |

## HTML5 시맨틱 구조

```tsx
<>
  <main className="min-h-screen pt-nav">{/* Page content */}</main>
  <Footer /> {/* Sibling to main, not child */}
</>
```

**규칙**:

- 페이지당 `<main>` 요소는 하나만
- `<main>` 요소를 중첩해서는 안 함
- `<Footer>`는 `<main>` 외부에 있어야 함

## 접근성 요구사항

- 모든 상호작용 요소는 최소 44px 터치 대상을 충족해야 함
- 포커스 상태는 4px 링으로 표시되어야 함
- 색상 대비는 WCAG 2.1 AAA (7:1)를 충족해야 함
- 시맨틱 HTML 구조가 필요함

**LLM 참조**: `docs/llm/DESIGN_SYSTEM.md`
