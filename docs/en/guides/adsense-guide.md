# Google AdSense Integration Guide

> Implementing responsive ad banners with graceful fallback to self-promotion

## Overview

The homepage supports two banner modes: Google AdSense for monetization and a self-promotion carousel for internal marketing. The display mode is controlled by a simple feature flag.

## Banner Modes

| `isAdEnabled` | Display Mode          |
| ------------- | --------------------- |
| false         | Self Promo Carousel   |
| true          | Google AdSense Banner |

## Configuration

### Toggle Switch

The ad display mode is controlled in the HomePage component:

```tsx
// apps/web-main/src/pages/HomePage.tsx
const isAdEnabled = true;

// Future implementation will use environment variable:
// const isAdEnabled = import.meta.env.VITE_AD_ENABLED === 'true';
```

## AdSense Configuration

### Required Attributes

| Attribute                  | Value  | Purpose                      |
| -------------------------- | ------ | ---------------------------- |
| data-ad-format             | "auto" | Enables responsive ad sizing |
| data-full-width-responsive | "true" | Allows full-width on mobile  |

### Container Sizing

To prevent Cumulative Layout Shift (CLS), use minimum heights:

```tsx
<div className="min-h-[100px] sm:min-h-[120px] lg:min-h-[160px]">{/* Ad content */}</div>
```

| Breakpoint    | Min-Height |
| ------------- | ---------- |
| base (mobile) | 100px      |
| sm (640px+)   | 120px      |
| lg (1024px+)  | 160px      |

## Implementation

### Ad Container Structure

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

### AdSense Script Integration

Add the AdSense script to `index.html`:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossorigin="anonymous"
></script>
```

Insert the ad unit in your component:

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

### Sponsored Label (Required)

Google AdSense requires clear labeling of advertisements:

```tsx
<span className="text-[10px] text-theme-text-muted uppercase">{t('ad.sponsored')}</span>
```

### Accessibility

Add ARIA labels for screen readers:

```tsx
<section aria-label={t('aria.advertisement')}>{/* Ad content */}</section>
```

## Self-Promotion Carousel

When ads are disabled, display internal promotions:

### Promo Configuration

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

### Responsive Behavior

| Screen Size         | Features                               |
| ------------------- | -------------------------------------- |
| Mobile (<640px)     | Compact layout, hidden description     |
| Tablet (640-1023px) | Horizontal layout, visible description |
| Desktop (1024px+)   | Full layout with navigation buttons    |

## Best Practices

1. **Test Ad Placement**: Use AdSense preview mode before going live
2. **Monitor Performance**: Track CTR and revenue in AdSense dashboard
3. **Respect User Experience**: Limit ad frequency and placement
4. **Handle Ad Blockers**: Gracefully fallback to self-promo when blocked
5. **Follow Policies**: Review Google AdSense policies regularly

---

**LLM Reference**: `docs/llm/guides/ADSENSE_GUIDE.md`
