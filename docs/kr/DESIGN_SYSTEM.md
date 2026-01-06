# 디자인 시스템

> V0.0.1 AAA 워크스테이션 - WCAG 2.1 AAA 준수

## 브랜드

**"나에 대한 것을 책에 쓴다"** - 개인 기록 관리 플랫폼

## 시각적 스타일

| 요소            | 사양                       |
| --------------- | -------------------------- |
| 카드 반경       | 48px (폼), 64px (섹션)     |
| 테두리 두께     | 인터랙티브 요소의 경우 2px |
| 패딩            | `p-10 md:p-14` 메인 카드   |
| 터치 타겟       | 최소 44px, 강조 56px       |
| 초점 링         | 두께 4px, 오프셋 4px       |
| 네비게이션 높이 | 80px                       |

## 타이포그래피

| 요소        | 스타일링                                                      |
| ----------- | ------------------------------------------------------------- |
| 히어로 제목 | `text-[10rem] italic tracking-tighter serif`                  |
| 페이지 제목 | `text-4xl sm:text-5xl italic tracking-tighter serif`          |
| 카드 제목   | `text-2xl font-bold`                                          |
| 배지        | `text-[11px] font-black uppercase tracking-[0.3em] monospace` |
| 입력 레이블 | `text-xs font-bold uppercase tracking-widest`                 |

**글꼴:**

- 제목: Playfair Display (italic)
- 브랜드: System monospace

## 테마 아키텍처

```
Layer 0: @property 정의  → 타입 안전성
Layer 1: 팔레트 (--palette-*)  → 원시 색상
Layer 2: 의미론적 (--theme-*)   → 테마 전환 가능
Layer 3: Tailwind              → bg-theme-*, text-theme-*
```

## 색상

### 라이트 모드 (Clean White Oak)

| 토큰        | 값      | 대비    |
| ----------- | ------- | ------- |
| 기본 텍스트 | #262220 | 15.76:1 |
| 보조 텍스트 | #4A4744 | 9.23:1  |
| 기본 강조   | #6B4A2E | 7.94:1  |

### 다크 모드 (Midnight Gentle Study)

| 토큰        | 값      | 대비   |
| ----------- | ------- | ------ |
| 기본 텍스트 | #CCC5BD | 9.94:1 |
| 보조 텍스트 | #B4ADA5 | 7.65:1 |
| 기본 강조   | #D0B080 | 8.25:1 |

모든 조합은 WCAG 2.1 AAA (7:1+)를 충족합니다.

## 테두리 대비 (SC 1.4.11)

| 토큰           | 비율  | 사용 용도         |
| -------------- | ----- | ----------------- |
| border-subtle  | 1.5:1 | 장식용으로만 사용 |
| border-default | 3.0:1 | 인터랙티브 요소   |
| border-strong  | 3.8:1 | 강조              |

## 반경 토큰

| 토큰                  | 크기 | 사용 용도            |
| --------------------- | ---- | -------------------- |
| rounded-soft          | 8px  | **모든 UI의 기본값** |
| rounded-input         | 24px | 대형 입력 필드       |
| rounded-editorial-lg  | 48px | 폼 카드              |
| rounded-editorial-2xl | 64px | 섹션 컨테이너        |

## 버튼 크기

| 크기  | 높이 | 스타일링                                            |
| ----- | ---- | --------------------------------------------------- |
| sm/md | 44px | 표준                                                |
| lg    | 56px | `font-black uppercase tracking-widest text-[11px]`  |
| xl    | 64px | `font-black uppercase tracking-[0.3em] text-[14px]` |

## HTML5 시맨틱

```tsx
// 올바른 페이지 구조
<>
  <main className="min-h-screen pt-nav">{/* 콘텐츠 */}</main>
  <Footer />
</>

// 잘못된 예: main 안에 main이나 footer 중첩
```

**규칙:**

- 페이지당 `<main>`은 하나만 사용하며, 중첩하지 않습니다.
- `<Footer>`는 `<main>` 외부에 배치합니다.
- 시맨틱 요소 사용: `<nav>`, `<article>`, `<section>`, `<aside>`

## 컴포넌트 예시

```tsx
// 폼 카드
<div className="bg-theme-bg-card border border-theme-border-subtle rounded-soft p-10 md:p-14">

// 페이지 제목
<h1 className="text-4xl sm:text-5xl italic tracking-tighter"
    style={{ fontFamily: 'var(--font-family-serif-title)' }}>

// 입력 필드
<TextInput size="lg" icon={<Mail />} />

// 버튼
<Button variant="primary" size="xl" rounded="editorial">
```

## 파일 위치

```
packages/design-tokens/src/tokens.css  # 테마의 SSOT(Single Source of Truth)
packages/ui-components/src/            # Button, Card, TextInput
```

---

**빠른 참조**: `.ai/ssot.md`, `.ai/packages/design-tokens.md`
