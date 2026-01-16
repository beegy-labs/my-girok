# Google AdSense Integration

## Banner Modes

| `isAdEnabled` | Display             |
| ------------- | ------------------- |
| false         | Self Promo Carousel |
| true          | Google AdSense      |

## Toggle

```tsx
// apps/web-girok/src/pages/HomePage.tsx
const isAdEnabled = true;
// Future: import.meta.env.VITE_AD_ENABLED
```

## AdSense Settings

| Attribute                  | Value  |
| -------------------------- | ------ |
| data-ad-format             | "auto" |
| data-full-width-responsive | "true" |

## Container Sizing

```tsx
// Use min-height (prevents CLS)
<div className="min-h-[100px] sm:min-h-[120px] lg:min-h-[160px]">
```

| Breakpoint  | Min-Height |
| ----------- | ---------- |
| base        | 100px      |
| sm (640px)  | 120px      |
| lg (1024px) | 160px      |

## Implementation

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

## AdSense Script

```html
<!-- index.html -->
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossorigin="anonymous"
></script>
```

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

## Policy Compliance

```tsx
// "Sponsored" label (required)
<span className="text-[10px] text-theme-text-muted uppercase">
  {t('ad.sponsored')}
</span>

// ARIA label (a11y)
<section aria-label={t('aria.advertisement')}>
```

## Self Promo Carousel

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

| Screen              | Features                        |
| ------------------- | ------------------------------- |
| Mobile (<640px)     | Compact, hidden description     |
| Tablet (640-1023px) | Horizontal, visible description |
| Desktop (>=1024px)  | Full layout, nav buttons        |
