# @my-girok/design-tokens

> WCAG 2.1 AAA 준수 디자인 토큰과 로컬 폰트

## 설치

```css
/* Playfair Display가 포함된 메인 토큰 */
@import '@my-girok/design-tokens/tokens.css';

/* 관리자 인터페이스용 Inter 폰트 */
@import '@my-girok/design-tokens/fonts/inter.css';
```

## 로컬 폰트

모든 폰트는 프라이버시, 성능, 오프라인 지원을 위해 자체 호스팅됩니다.

| 폰트             | 가중치             | 용도                           |
| ---------------- | ------------------ | ------------------------------ |
| Playfair Display | 400-900 + italic   | 편집자 헤딩, 디스플레이 텍스트 |
| Inter            | 400, 500, 600, 700 | 관리자 인터페이스, 본문 텍스트 |
| Pretendard       | 400, 600, 700      | PDF 생성, CJK characters       |

### 폰트 디렉터리 구조

```
packages/design-tokens/fonts/
  inter/                    # Inter font files
  playfair-display/         # Playfair Display font files
  pretendard/               # Pretendard font files
  inter.css                 # Inter CSS imports
  playfair-display.css      # Playfair CSS imports
  pretendard.css            # Pretendard CSS imports
  index.css                 # Combined imports
```

### PDF 폰트 사용

```typescript
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
import PretendardBold from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Bold.otf';
```

## 토큰 카테고리

### 배경

| 클래스             | 용도           |
| ------------------ | -------------- |
| `bg-theme-bg-page` | 페이지 배경    |
| `bg-theme-bg-card` | 카드/표면 배경 |

### 텍스트

| 클래스                      | 용도             |
| --------------------------- | ---------------- |
| `text-theme-text-primary`   | 주요 텍스트 내용 |
| `text-theme-text-secondary` | 보조/음성 텍스트 |

### 테두리

| 클래스                        | 용도               |
| ----------------------------- | ------------------ |
| `border-theme-border-default` | 기본 테두리        |
| `border-theme-border-subtle`  | 미묘/라이트 테두리 |

### 주요 강조

| 클래스               | 용도             |
| -------------------- | ---------------- |
| `text-theme-primary` | 주요 강조 텍스트 |
| `bg-theme-primary`   | 주요 강조 배경   |

### 상태 색상

| 클래스                           | 용도        |
| -------------------------------- | ----------- |
| `bg-theme-status-error-bg`       | 오류 배경   |
| `text-theme-status-success-text` | 성공 텍스트 |
| `bg-theme-status-warning-bg`     | 경고 배경   |

## 유틸리티 클래스

| 유틸리티           | 값               | 용도                   |
| ------------------ | ---------------- | ---------------------- |
| `rounded-soft`     | 8px              | 기본 UI 요소           |
| `rounded-full`     | 50%              | 아바타, 피알           |
| `min-h-touch-aa`   | 44px             | WCAG AA 최소 터치 대상 |
| `min-h-input`      | 48px             | WCAG AAA 입력 필드     |
| `pt-nav`           | 80px             | 내비게이션 높이 패딩   |
| `h-nav`            | 80px             | 내비게이션 높이        |
| `tracking-brand`   | 0.3em            | 브랜드 라벨 간격       |
| `font-serif-title` | Playfair Display | 세리프 헤딩            |

## WCAG 대비 비율

모든 색상 조합은 WCAG AAA 요구 사항(7:1)을 충족하거나 초과합니다.

| 요소           | 라이트 테마 | 다크 테마 |
| -------------- | ----------- | --------- |
| Primary Text   | 15.76:1     | 9.94:1    |
| Secondary Text | 9.23:1      | 7.65:1    |
| Primary Accent | 7.94:1      | 8.25:1    |

## 테마링

`data-theme` 속성을 사용해 다크 또는 라이트 모드를 활성화합니다:

```html
<html data-theme="light">
  <!-- 라이트 테마 -->
</html>

<html data-theme="dark">
  <!-- 다크 테마 -->
</html>
```

## 최고의 관행

### 해야 할 일

```tsx
// 유틸리티 클래스 사용
<div className="rounded-soft border p-4">

// 타이포그래피 유틸리티 사용
<h1 className="font-serif-title tracking-editorial">

// 테마 토큰 사용
<div className="bg-theme-bg-card text-theme-text-primary">
```

### 하지 말아야 할 일

```tsx
// 임의 값 사용 금지
<div className="rounded-[48px]">

// 토큰 대신 인라인 스타일 금지
<h1 style={{ fontFamily: 'var(--font-family-serif-title)' }}>

// 색상 하드코딩 금지
<div className="bg-[#f5f5f5] text-[#333]">
```

---

**LLM 참조**: `docs/llm/packages/design-tokens.md`
