# Google AdSense 통합 가이드

> 반응형 광고 배너를 구현하고 자체 프로모션으로 부드럽게 대체

## 개요

홈페이지는 두 가지 배너 모드를 지원합니다: 수익화를 위한 Google AdSense와 내부 마케팅용 자체 프로모션 캐러셀. 표시 모드는 간단한 기능 플래그로 제어됩니다.

## 배너 모드

| `isAdEnabled` | 디스플레이 모드       |
| ------------- | --------------------- |
| false         | Self Promo Carousel   |
| true          | Google AdSense Banner |

## 설정

### 토글 스위치

광고 표시 모드는 HomePage 컴포넌트에서 제어됩니다:

```tsx
// apps/web-main/src/pages/HomePage.tsx
const isAdEnabled = true;

// Future implementation will use environment variable:
// const isAdEnabled = import.meta.env.VITE_AD_ENABLED === 'true';
```

## AdSense 설정

### 필수 속성

| 속성                       | 값     | 목적                      |
| -------------------------- | ------ | ------------------------- |
| data-ad-format             | "auto" | 반응형 광고 크기 활성화   |
| data-full-width-responsive | "true" | 모바일에서 전체 너비 허용 |

### 컨테이너 크기 조정

Cumulative Layout Shift (CLS)를 방지하려면 최소 높이를 사용합니다:

```tsx
<div className="min-h-[100px] sm:min-h-[120px] lg:min-h-[160px]">{/* Ad content */}</div>
```

| 브레이크포인트 | 최소 높이 |
| -------------- | --------- |
| base (mobile)  | 100px     |
| sm (640px+)    | 120px     |
| lg (1024px+)   | 160px     |

## 구현

### 광고 컨테이너 구조

```tsx
<div
  className="ad-container w-full overflow-hidden rounded-soft border-2 border-theme-border-default bg-theme-bg-card"
  data-ad-slot="homepage-banner"
  data-ad-format="auto"
  data-full-width-responsive="true"
>
  <div className="w-full min-h-[100px] sm:min-h-[120px] lg:min-h-[160px] flex items-center justify-center" />
</div>
```

### AdSense 스크립트 통합

`index.html`에 AdSense 스크립트를 추가합니다:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossorigin="anonymous"
></script>
```

컴포넌트에 광고 단위를 삽입합니다:

```tsx
<ins
  className="adsbygoogle"
  style={{ display: 'block' }}
  data-ad-client="ca-pub-XXXXXXXX"
  data-ad-slot="XXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"
/>
```

## 정책 준수

### 스폰서 라벨 (필수)

Google AdSense는 광고를 명확히 표시하도록 요구합니다:

```tsx
<span className="text-[10px] text-theme-text-muted uppercase">{t('ad.sponsored')}</span>
```

### 접근성

스크린 리더용 ARIA 라벨을 추가합니다:

```tsx
<section aria-label={t('aria.advertisement')}>{/* Ad content */}</section>
```

## 자체 프로모션 캐러셀

광고가 비활성화될 때 내부 프로모션을 표시합니다:

### 프로모션 설정

```tsx
const PROMOS = [
  {
    tagKey: 'promo.premium.tag',
    titleKey: 'promo.premium.title',
    descKey: 'promo.premium.desc',
    ctaKey: 'promo.premium.cta',
  },
];
```

### 반응형 동작

| 화면 크기           | 특징                          |
| ------------------- | ----------------------------- |
| Mobile (<640px)     | 컴팩트 레이아웃, 설명 숨김    |
| Tablet (640-1023px) | 가로 레이아웃, 설명 표시      |
| Desktop (1024px+)   | 전체 레이아웃, 탐색 버튼 포함 |

## 최고의 실천법

1. **광고 배치 테스트**: 라이브 전 AdSense 미리보기 모드를 사용합니다.
2. **성과 모니터링**: AdSense 대시보드에서 CTR 및 수익을 추적합니다.
3. **사용자 경험 존중**: 광고 빈도와 배치를 제한합니다.
4. **광고 차단기 처리**: 차단 시 부드럽게 자체 프로모션으로 대체합니다.
5. **정책 검토**: Google AdSense 정책을 정기적으로 확인합니다.

---

**LLM 참조**: `docs/llm/guides/ADSENSE_GUIDE.md`
