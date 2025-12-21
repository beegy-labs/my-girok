# @my-girok/ui-components

> Shared React 19 components - **V0.0.1 AAA Workstation**

## Purpose

Reusable UI components for React applications in the monorepo. All components meet WCAG 2.1 AAA standards (7:1+ contrast) with 44px+ touch targets, focus-visible keyboard navigation, and editorial typography.

## Structure

```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx           # Badge, SectionBadge (lg size, rounded options)
│   │   ├── Button.tsx          # sm/md/lg/xl sizes, rounded options
│   │   ├── Card.tsx            # radius: default/lg/xl/2xl
│   │   ├── CollapsibleSection.tsx
│   │   ├── MenuCard.tsx        # Editorial 64px card
│   │   ├── MenuRow.tsx         # Editorial list row with pin support
│   │   ├── PageContainer.tsx
│   │   ├── PageHeader.tsx
│   │   ├── SelectInput.tsx
│   │   ├── TextArea.tsx
│   │   ├── TextInput.tsx       # default/lg sizes, icon support
│   │   ├── TopWidget.tsx       # Pinned dashboard widget
│   │   ├── ViewToggle.tsx      # Grid/List toggle (56px)
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useClickOutside.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Components (V0.0.1)

### Button

```typescript
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl'; // xl = 64px, font-black
  rounded?: 'default' | 'editorial' | 'full'; // editorial = 24px
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}
```

**Size Reference (8pt Grid Compliant):**

| Size | Min Height | Typography                                            | SSOT Token       |
| ---- | ---------- | ----------------------------------------------------- | ---------------- |
| sm   | 44px       | Standard                                              | `min-h-touch-aa` |
| md   | 44px       | Standard                                              | `min-h-touch-aa` |
| lg   | 56px       | `font-black uppercase tracking-brand text-brand-xs`   | `min-h-input-lg` |
| xl   | 64px       | `font-black uppercase tracking-brand text-brand-base` | `min-h-input-xl` |

**Rounded Options:**

| Option    | SSOT Token    | Usage                      |
| --------- | ------------- | -------------------------- |
| default   | rounded-2xl   | Secondary buttons (V0.0.1) |
| editorial | rounded-input | Primary buttons (V0.0.1)   |
| full      | rounded-full  | Hero buttons, circular     |

**Usage:**

```tsx
// Primary submit (xl size, editorial rounded)
<Button variant="primary" size="xl" rounded="editorial" icon={<ArrowRight />}>
  Sign In
</Button>

// Secondary action (lg size)
<Button variant="secondary" size="lg" rounded="default">
  Create Account
</Button>

// Hero button
<Button variant="primary" size="xl" rounded="full" className="px-20 py-8">
  Enter
</Button>
```

### TextInput (2025 Best Practices)

Flexbox-based input component with leading/trailing icon slots, built-in features, and full WCAG 2.1 AAA compliance.

```typescript
export type TextInputSize = 'sm' | 'default' | 'lg' | 'xl';
export type TextInputVariant = 'default' | 'filled' | 'outlined' | 'ghost';
export type TextInputState = 'default' | 'success' | 'warning' | 'error';

export interface IconSlotProps {
  icon: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  decorative?: boolean;
}

export interface TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  required?: boolean;

  // Icons (simple API - backwards compatible)
  icon?: ReactNode; // Leading icon
  trailingIcon?: ReactNode; // Trailing icon

  // Icon slots (advanced API - 2025 best practice)
  leadingSlot?: IconSlotProps; // Full control over leading icon
  trailingSlot?: IconSlotProps; // Full control over trailing icon

  // Variants & States
  size?: TextInputSize; // sm | default | lg | xl
  variant?: TextInputVariant; // default | filled | outlined | ghost
  state?: TextInputState; // Auto-detected from error prop

  // Built-in Features
  showPasswordToggle?: boolean; // Auto eye/eye-off icon for password
  clearable?: boolean; // Show clear button when has value
  onClear?: () => void;
  showCharCount?: boolean; // Show character counter
  maxLength?: number;

  // Styling
  containerClassName?: string;
  wrapperClassName?: string;
  inputClassName?: string;
}
```

**Size Reference (8pt Grid Compliant):**

| Size    | Height | Icon | Gap   | Padding | Typography            |
| ------- | ------ | ---- | ----- | ------- | --------------------- |
| sm      | 40px   | 16px | gap-2 | px-4    | text-sm               |
| default | 48px   | 20px | gap-2 | px-4    | text-base             |
| lg      | 56px   | 20px | gap-4 | px-6    | text-base font-medium |
| xl      | 64px   | 24px | gap-4 | px-6    | text-lg               |

**Variant Reference:**

| Variant  | Background            | Border             | Use Case         |
| -------- | --------------------- | ------------------ | ---------------- |
| default  | bg-theme-bg-secondary | border-subtle      | Standard forms   |
| filled   | bg-theme-bg-tertiary  | border-transparent | Compact UI       |
| outlined | bg-transparent        | border-default     | Prominent fields |
| ghost    | bg-transparent        | border-transparent | Inline editing   |

**State Colors:**

| State   | Border Color                | Icon Color                |
| ------- | --------------------------- | ------------------------- |
| default | (variant default)           | text-theme-text-secondary |
| success | border-theme-status-success | text-theme-status-success |
| warning | border-theme-status-warning | text-theme-status-warning |
| error   | border-theme-status-error   | text-theme-status-error   |

**Usage Examples:**

```tsx
// Basic with leading icon (backwards compatible)
<TextInput
  label="Email"
  type="email"
  size="lg"
  icon={<Mail size={20} />}
  value={email}
  onChange={setEmail}
  required
/>

// Password with visibility toggle (2025 feature)
<TextInput
  label="Password"
  type="password"
  size="lg"
  icon={<Lock size={20} />}
  showPasswordToggle
  value={password}
  onChange={setPassword}
/>

// Clearable input with character count
<TextInput
  label="Username"
  size="lg"
  icon={<AtSign size={20} />}
  clearable
  showCharCount
  maxLength={20}
  value={username}
  onChange={setUsername}
/>

// Advanced: Custom trailing slot with action
<TextInput
  label="Search"
  size="lg"
  icon={<Search size={20} />}
  trailingSlot={{
    icon: <Mic size={20} />,
    onClick: startVoiceSearch,
    ariaLabel: "Voice search"
  }}
  value={query}
  onChange={setQuery}
/>

// Outlined variant with success state
<TextInput
  label="Verified Email"
  variant="outlined"
  state="success"
  size="lg"
  icon={<Mail size={20} />}
  trailingIcon={<CheckCircle size={20} />}
  value={email}
  onChange={setEmail}
/>
```

**2025 Architecture Features:**

| Feature                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| Flexbox Layout           | No absolute positioning hacks                         |
| Slot-based Icons         | Leading/trailing with click handlers & aria-labels    |
| Built-in Password Toggle | Automatic eye/eye-off for type="password"             |
| Built-in Clear Button    | Shows when `clearable` and has value                  |
| Character Counter        | Live count with max limit warning                     |
| Validation States        | Auto-detected from error prop or manual override      |
| WCAG 2.5.5 AAA           | 48px+ touch targets, proper aria attributes           |
| Design Token Based       | Centralized SIZE_CONFIG, VARIANT_CONFIG, STATE_CONFIG |

### Card

```typescript
export interface CardProps {
  variant?: 'primary' | 'secondary' | 'elevated';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  radius?: 'default' | 'lg' | 'xl' | '2xl'; // V0.0.1 options
}
```

**Radius Options (V0.0.1):**

| Option  | SSOT Token            | Usage              |
| ------- | --------------------- | ------------------ |
| default | rounded-xl            | Standard cards     |
| lg      | rounded-editorial     | Editorial cards    |
| xl      | rounded-editorial-lg  | Form cards         |
| 2xl     | rounded-editorial-2xl | Section containers |

### Badge

```typescript
export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md' | 'lg'; // lg = text-[14px] font-black
  rounded?: 'default' | 'full'; // V0.0.1: rounded options
}
```

**V0.0.1 Styling (8pt Grid Compliant):**

- `font-black` (was font-bold)
- `tracking-brand-lg`
- sm size: `text-brand-xs` (11px), `px-3`
- md size: `text-xs` (12px), `px-4`
- lg size: `text-brand-base` (14px), `px-6`
- rounded options: `default` (rounded-xl) or `full` (rounded-full)

### MenuCard

Editorial navigation card with `rounded-editorial-2xl`.

```typescript
export interface MenuCardProps {
  index: number; // Displays as "01", "02", etc.
  icon: React.ReactNode;
  title: string; // font-serif-title
  description: string;
  onClick?: () => void;
  isPinned?: boolean;
  onPin?: () => void;
  pinTooltip?: string;
}
```

**V0.0.1 Styling:**

- Card: `rounded-editorial-2xl border-2 p-10 md:p-12`
- Index: `font-mono-brand tracking-brand font-black`
- Title: `font-serif-title`

### MenuRow

Compact list row for list view mode.

```typescript
export interface MenuRowProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  description?: string; // V0.0.1: description support
  onClick?: () => void;
  isPinned?: boolean;
  onPin?: () => void;
}
```

**V0.0.1 Styling:**

- `rounded-3xl border-2`
- Pin support in list view

### ViewToggle

Grid/List view mode toggle.

```typescript
export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}
```

**V0.0.1 Styling:**

- `min-h-[56px]` touch targets
- `rounded-2xl`
- `shadow-theme-lg`

### TopWidget

Pinned widget for dashboard.

```typescript
export interface TopWidgetProps {
  icon: React.ReactNode;
  title: string; // font-serif-title
  badgeText?: string;
  onChangeFocus?: () => void;
  changeFocusText?: string;
  children: React.ReactNode;
}
```

**V0.0.1 Styling:**

- Card: `min-h-[280px] rounded-editorial-lg`
- Title: `font-serif-title`
- Badge: `font-mono-brand tracking-brand`

### Alert

```typescript
export interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}
```

## Hooks

### useClickOutside

```typescript
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, isOpen, () => setIsOpen(false));
```

## Theme Tokens

Components use semantic theme tokens from `@my-girok/design-tokens`:

| Token                                 | Usage                |
| ------------------------------------- | -------------------- |
| `bg-theme-bg-page`                    | Page background      |
| `bg-theme-bg-card`                    | Card background      |
| `bg-theme-bg-secondary`               | Section background   |
| `bg-theme-bg-input`                   | Input background     |
| `bg-theme-bg-hover`                   | Hover states         |
| `text-theme-text-primary`             | Primary text         |
| `text-theme-text-secondary`           | Secondary text       |
| `text-theme-text-muted`               | Placeholder text     |
| `border-theme-border-default`         | Default borders      |
| `border-theme-border-subtle`          | Subtle borders       |
| `text-theme-primary`                  | Primary accent color |
| `focus-visible:ring-theme-focus-ring` | Focus ring           |

## Installation

```bash
# In monorepo - automatically available via workspace
pnpm install
```

## Dependencies

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@my-girok/design-tokens": "workspace:*"
  }
}
```

## React 19 Compatibility

All components use **ref-as-prop** pattern:

```typescript
export function Button({ ref, ...props }: ButtonProps) {
  return <button ref={ref} {...props} />;
}
```

## Storybook (2025)

Interactive component documentation with **Storybook 10.x**.

### Architecture

Storybook is separated into two concerns:

| Concern       | Location                                 | Responsibility          |
| ------------- | ---------------------------------------- | ----------------------- |
| Configuration | `packages/ui-components/.storybook/`     | Build settings, addons  |
| Story files   | `packages/ui-components/src/components/` | Component documentation |
| MDX docs      | `packages/ui-components/src/*.mdx`       | Introduction, tokens    |
| Deployment    | `apps/storybook/`                        | Docker, Helm, CI/CD     |

See [apps/storybook.md](../apps/storybook.md) for deployment details.

### Configuration Files

| File                | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `main.ts`           | Addons: a11y, vitest, docs, chromatic           |
| `manager.ts`        | Custom GIROK branding (Oak Brown theme)         |
| `preview.tsx`       | Theme decorator with live theme toggle          |
| `preview-head.html` | Google Fonts (Playfair Display for serif-title) |

### Commands

```bash
# Development server (port 6006)
pnpm --filter @my-girok/ui-components storybook

# Build static site
pnpm --filter @my-girok/ui-components build-storybook

# Via storybook app
pnpm --filter @my-girok/storybook dev
pnpm --filter @my-girok/storybook build
```

### Features

- **WCAG AAA Testing**: `@storybook/addon-a11y` with strict mode
- **Auto-generated Docs**: TypeScript props documentation
- **Design Tokens**: Integrated with `@my-girok/design-tokens`
- **Theme Toggle**: Light/Dark mode in toolbar
- **Visual Regression**: Chromatic integration ready

### Story Files (CSF 3.0)

Each component has a `.stories.tsx` file:

```
src/components/
├── Button.tsx
├── Button.stories.tsx    # CSF 3.0 format
├── Card.tsx
├── Card.stories.tsx
└── ...
```

### Deployment

Storybook deploys as an independent Kubernetes service:

| Environment | URL                          | Trigger           |
| ----------- | ---------------------------- | ----------------- |
| Development | https://design-dev.girok.dev | Push to `develop` |
| Production  | https://design.girok.dev     | Tag `ui-v*`       |

```bash
# Create release
git tag ui-v0.1.0
git push origin ui-v0.1.0
```

Pipeline: `.github/workflows/ci-storybook.yml`

### Updating Storybook

When modifying the design system:

1. **Token changes** → Update `DesignTokens.mdx` color tables
2. **Component changes** → Update corresponding `.stories.tsx`
3. **New component** → Create new `.stories.tsx` with autodocs
4. **Theme changes** → Update `manager.ts` branding colors
5. **Always verify** → `pnpm --filter @my-girok/ui-components storybook`

## References

| Document                             | Content              |
| ------------------------------------ | -------------------- |
| [design-tokens.md](design-tokens.md) | SSOT 유틸리티 클래스 |
| [ssot.md](../ssot.md)                | SSOT 전략 문서       |
| `docs/DESIGN_SYSTEM.md`              | 상세 디자인 스펙     |

## Version

**V0.0.1 AAA Workstation** (2025-12)
