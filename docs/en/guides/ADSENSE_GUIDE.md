# Google AdSense Integration Guide

> Implementation guide for Google AdSense in my-girok web application

## Overview

The homepage banner section supports two modes:

| `isAdEnabled` | Display               | Description             |
| ------------- | --------------------- | ----------------------- |
| `false`       | Self Promo Carousel   | Internal promotions     |
| `true`        | Google AdSense Banner | External advertisements |

## Configuration

### Toggle Ads

```tsx
// apps/web-main/src/pages/HomePage.tsx
const isAdEnabled = true; // Set to true when AdSense is configured
```

Future options:

- Environment variable: `import.meta.env.VITE_AD_ENABLED`
- Feature flag from server
- AdSense callback on ad load success

## AdSense Implementation

### Recommended Settings

| Attribute                    | Value    | Description                    |
| ---------------------------- | -------- | ------------------------------ |
| `data-ad-format`             | `"auto"` | AdSense selects optimal format |
| `data-full-width-responsive` | `"true"` | Full width on mobile           |

### Container Sizing

Use `min-height` instead of fixed `height` to:

- Prevent CLS (Cumulative Layout Shift)
- Allow AdSense to show larger ads when available

```tsx
// ❌ DON'T - Fixed height limits ad sizes
<div className="h-[100px]">

// ✅ DO - Min-height allows flexibility
<div className="min-h-[100px] sm:min-h-[120px] lg:min-h-[160px]">
```

### Responsive Heights

| Breakpoint | Min-Height | Screen Size             |
| ---------- | ---------- | ----------------------- |
| base       | 100px      | < 640px (mobile)        |
| sm         | 120px      | 640px - 1023px (tablet) |
| lg         | 160px      | ≥ 1024px (desktop)      |

### Current Implementation

```tsx
{
  /* Ad Container - Full width responsive (AdSense recommended) */
}
<div
  className="ad-container relative w-full overflow-hidden rounded-soft border-2 border-theme-border-default bg-theme-bg-card"
  data-ad-slot="homepage-banner"
  data-ad-format="auto"
  data-full-width-responsive="true"
>
  <div className="w-full min-h-[100px] sm:min-h-[120px] lg:min-h-[160px] flex items-center justify-center">
    {/* AdSense will inject ad here */}
  </div>
</div>;
```

### AdSense Code Integration

When ready to enable ads, add the AdSense script to `index.html`:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossorigin="anonymous"
></script>
```

Replace placeholder with actual AdSense unit:

```tsx
<ins className="adsbygoogle"
     style={{ display: 'block' }}
     data-ad-client="ca-pub-XXXXXXXX"
     data-ad-slot="XXXXXXXX"
     data-ad-format="auto"
     data-full-width-responsive="true" />
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

## Policy Compliance

### Required Elements

1. **"Sponsored" Label**: Required above ad container per AdSense policy

```tsx
<div className="flex justify-end mb-1">
  <span className="text-[10px] text-theme-text-muted uppercase tracking-wide">
    {t('ad.sponsored', { defaultValue: 'Sponsored' })}
  </span>
</div>
```

2. **ARIA Label**: For accessibility

```tsx
<section aria-label={t('aria.advertisement', { defaultValue: 'Advertisement' })}>
```

### CLS Prevention

Cumulative Layout Shift (CLS) occurs when ads load and push content down. Prevent this by:

1. Using `min-height` on ad containers
2. Pre-sizing containers before ad loads
3. Avoiding lazy loading without proper placeholder sizing

## Self Promo Carousel

When ads are disabled (`isAdEnabled = false`), the carousel displays internal promotions.

### Promo Data Structure

```tsx
const PROMOS = [
  {
    tagKey: 'promo.premium.tag', // i18n key for tag
    titleKey: 'promo.premium.title', // i18n key for title
    descKey: 'promo.premium.desc', // i18n key for description
    ctaKey: 'promo.premium.cta', // i18n key for CTA button
  },
];
```

### Responsive Design

| Screen Size         | Features                                           |
| ------------------- | -------------------------------------------------- |
| Mobile (< 640px)    | Compact card, slide indicators, hidden description |
| Tablet (640-1023px) | Medium layout, horizontal, visible description     |
| Desktop (≥ 1024px)  | Full layout, large typography, navigation buttons  |

## References

- [About responsive behavior of display ad units](https://support.google.com/adsense/answer/9183362?hl=en)
- [How to modify responsive ad code](https://support.google.com/adsense/answer/9183363?hl=en)
- [How to use responsive ad tag parameters](https://support.google.com/adsense/answer/9183460)
- [Guidelines for fixed-sized display ad units](https://support.google.com/adsense/answer/9185043?hl=en)
