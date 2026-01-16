import { useState, useCallback } from 'react';
import {
  Button,
  TextInput,
  TextArea,
  SelectInput,
  Card,
  Alert,
  Badge,
  SectionBadge,
  MenuCard,
  MenuRow,
  ViewToggle,
  TopWidget,
} from '@my-girok/ui-components';
import type { ViewMode } from '@my-girok/ui-components';

/**
 * Design System Page - V0.0.1 AAA Workstation
 *
 * Atomic UI component showcase following CLAUDE.md policy:
 * - WCAG 2.1 AAA compliant (7:1+ contrast)
 * - 44px+ touch targets
 * - SSOT token usage
 * - React 19 patterns
 */
export default function DesignSystemPage() {
  // Form state
  const [textValue, setTextValue] = useState('');
  const [textAreaValue, setTextAreaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Memoized handlers (rules.md: useCallback for all handlers)
  const handleTextChange = useCallback((value: string) => setTextValue(value), []);
  const handleTextAreaChange = useCallback((value: string) => setTextAreaValue(value), []);
  const handleSelectChange = useCallback((value: string) => setSelectValue(value), []);
  const handleViewModeChange = useCallback((mode: ViewMode) => setViewMode(mode), []);

  return (
    <main className="min-h-screen bg-theme-bg-page">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-section text-center">
          <SectionBadge>V0.0.1 AAA WORKSTATION</SectionBadge>
          <h1 className="text-5xl sm:text-6xl font-serif-title tracking-editorial italic mt-8 mb-6 text-theme-text-primary">
            Design System
          </h1>
          <p className="text-xl text-theme-text-secondary max-w-2xl mx-auto">
            WCAG 2.1 AAA compliant components with 7:1+ contrast ratio. All components use SSOT
            tokens from <code className="font-mono-brand">tokens.css</code>.
          </p>
        </header>

        {/* Section: Typography */}
        <section className="mb-section" aria-labelledby="typography-heading">
          <h2
            id="typography-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Typography
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  font-serif-title + tracking-editorial
                </p>
                <h3 className="text-4xl font-serif-title tracking-editorial italic text-theme-text-primary">
                  Editorial Serif Title
                </h3>
              </div>
              <div>
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  font-mono-brand + tracking-brand
                </p>
                <p className="text-lg font-mono-brand tracking-brand uppercase text-theme-primary">
                  GIROK.WORKSTATION
                </p>
              </div>
              <div>
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  text-theme-text-primary (15.76:1 contrast)
                </p>
                <p className="text-lg text-theme-text-primary">
                  Primary text for main content and headings.
                </p>
              </div>
              <div>
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  text-theme-text-secondary (9.23:1 contrast)
                </p>
                <p className="text-lg text-theme-text-secondary">
                  Secondary text for descriptions and supporting content.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Section: Buttons */}
        <section className="mb-section" aria-labelledby="buttons-heading">
          <h2
            id="buttons-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Buttons
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            {/* Variants */}
            <div className="mb-10">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                VARIANTS
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-10">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                SIZES (44px+ touch targets)
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <Button size="sm">Small (44px)</Button>
                <Button size="md">Medium (44px)</Button>
                <Button size="lg">Large (56px)</Button>
                <Button size="xl">XL (64px)</Button>
              </div>
            </div>

            {/* Rounded Options */}
            <div className="mb-10">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                ROUNDED (SSOT tokens)
              </p>
              <div className="flex flex-wrap gap-4">
                <Button rounded="default">rounded-input (24px)</Button>
                <Button rounded="editorial">rounded-editorial</Button>
                <Button rounded="full">rounded-full</Button>
              </div>
            </div>

            {/* States */}
            <div>
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                STATES
              </p>
              <div className="flex flex-wrap gap-4">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button fullWidth className="mt-4">
                  Full Width
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Section: Form Inputs */}
        <section className="mb-section" aria-labelledby="inputs-heading">
          <h2
            id="inputs-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Form Inputs
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            <div className="grid gap-8 md:grid-cols-2">
              {/* TextInput */}
              <div>
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                  TEXTINPUT (default: 48px, lg: 64px)
                </p>
                <div className="space-y-4">
                  <TextInput
                    label="Default Size"
                    placeholder="Enter text..."
                    value={textValue}
                    onChange={handleTextChange}
                    size="default"
                  />
                  <TextInput
                    label="Large Size"
                    placeholder="Enter text..."
                    value={textValue}
                    onChange={handleTextChange}
                    size="lg"
                  />
                  <TextInput
                    label="With Error"
                    placeholder="Enter email..."
                    value=""
                    onChange={handleTextChange}
                    error="Invalid email format"
                  />
                </div>
              </div>

              {/* SelectInput */}
              <div>
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                  SELECTINPUT
                </p>
                <div className="space-y-4">
                  <SelectInput
                    label="Select Option"
                    value={selectValue}
                    onChange={handleSelectChange}
                    options={[
                      { value: 'option1', label: 'Option 1' },
                      { value: 'option2', label: 'Option 2' },
                      { value: 'option3', label: 'Option 3' },
                    ]}
                    placeholder="Select..."
                  />
                </div>
              </div>
            </div>

            {/* TextArea */}
            <div className="mt-8">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                TEXTAREA
              </p>
              <TextArea
                label="Description"
                placeholder="Enter description..."
                value={textAreaValue}
                onChange={handleTextAreaChange}
                rows={4}
              />
            </div>
          </Card>
        </section>

        {/* Section: Cards */}
        <section className="mb-section" aria-labelledby="cards-heading">
          <h2
            id="cards-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Cards
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card variant="primary" padding="lg" radius="default">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                radius=&quot;default&quot;
              </p>
              <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Primary Card</h3>
              <p className="text-theme-text-secondary">rounded-input (24px)</p>
            </Card>
            <Card variant="secondary" padding="lg" radius="lg">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                radius=&quot;lg&quot;
              </p>
              <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Secondary Card</h3>
              <p className="text-theme-text-secondary">rounded-editorial (40px)</p>
            </Card>
            <Card variant="elevated" padding="lg" radius="xl">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                radius=&quot;xl&quot;
              </p>
              <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Elevated Card</h3>
              <p className="text-theme-text-secondary">rounded-editorial-lg (48px)</p>
            </Card>
          </div>
          <div className="mt-6">
            <Card variant="primary" padding="xl" radius="2xl" interactive onClick={() => {}}>
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                radius=&quot;2xl&quot; + interactive
              </p>
              <h3 className="text-xl font-semibold text-theme-text-primary mb-2">
                Interactive Card (64px)
              </h3>
              <p className="text-theme-text-secondary">
                rounded-editorial-2xl with hover and focus states
              </p>
            </Card>
          </div>
        </section>

        {/* Section: Alerts */}
        <section className="mb-section" aria-labelledby="alerts-heading">
          <h2
            id="alerts-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Alerts
          </h2>
          <div className="space-y-4">
            <Alert variant="success" onClose={() => {}}>
              Success! Your changes have been saved successfully.
            </Alert>
            <Alert variant="error" title="Error" onClose={() => {}}>
              Failed to save changes. Please try again.
            </Alert>
            <Alert variant="warning">Warning: Your session will expire in 5 minutes.</Alert>
            <Alert variant="info">Info: New features are available in the latest update.</Alert>
          </div>
        </section>

        {/* Section: Badges */}
        <section className="mb-section" aria-labelledby="badges-heading">
          <h2
            id="badges-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Badges
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            {/* Variants */}
            <div className="mb-8">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                VARIANTS
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="accent">Accent</Badge>
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-8">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                SIZES
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>

            {/* Rounded */}
            <div className="mb-8">
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                ROUNDED (Badge uses rounded-xl per SSOT)
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge rounded="default">rounded-xl (default)</Badge>
                <Badge rounded="full">rounded-full</Badge>
              </div>
            </div>

            {/* Section Badge */}
            <div>
              <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
                SECTIONBADGE
              </p>
              <SectionBadge>MY ARCHIVE</SectionBadge>
            </div>
          </Card>
        </section>

        {/* Section: View Toggle */}
        <section className="mb-section" aria-labelledby="toggle-heading">
          <h2
            id="toggle-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            View Toggle
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
              56x56px TOUCH TARGET
            </p>
            <ViewToggle value={viewMode} onChange={handleViewModeChange} />
            <p className="text-sm text-theme-text-secondary mt-4">
              Current mode: <span className="font-bold">{viewMode}</span>
            </p>
          </Card>
        </section>

        {/* Section: Menu Components */}
        <section className="mb-section" aria-labelledby="menu-heading">
          <h2
            id="menu-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Menu Components
          </h2>

          {/* MenuCard */}
          <div className="mb-8">
            <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
              MENUCARD (rounded-editorial-2xl: 64px)
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <MenuCard
                index={1}
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                }
                title="Personal Journal"
                description="Record your daily thoughts and reflections"
                onClick={() => {}}
                onPin={() => {}}
              />
              <MenuCard
                index={2}
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                }
                title="Schedule"
                description="Manage your calendar and appointments"
                onClick={() => {}}
                isPinned
                onPin={() => {}}
              />
            </div>
          </div>

          {/* MenuRow */}
          <div>
            <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
              MENUROW (rounded-widget: 32px)
            </p>
            <div className="space-y-3">
              <MenuRow
                index={1}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                title="Finance"
                description="Track expenses and budgets"
                onClick={() => {}}
                onPin={() => {}}
              />
              <MenuRow
                index={2}
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                }
                title="Library"
                description="Organize your documents"
                onClick={() => {}}
                isPinned
                onPin={() => {}}
              />
            </div>
          </div>
        </section>

        {/* Section: Top Widget */}
        <section className="mb-section" aria-labelledby="widget-heading">
          <h2
            id="widget-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Top Widget
          </h2>
          <TopWidget
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
            title="Today's Schedule"
            badgeText="Active Focus"
            onChangeFocus={() => {}}
            changeFocusText="Change Focus"
          >
            <div className="text-theme-text-secondary">
              <p className="mb-4">Widget content area with min-h-[280px]</p>
              <p className="text-sm">
                rounded-editorial-lg (48px) with border-2 border-theme-primary
              </p>
            </div>
          </TopWidget>
        </section>

        {/* Section: Level Colors (AAA) */}
        <section className="mb-section" aria-labelledby="levels-heading">
          <h2
            id="levels-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Level Colors (AAA)
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
              WCAG AAA 7:1+ COMPLIANT TEXT ON COLORED BACKGROUNDS
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-theme-level-1-bg border-l-4 border-l-theme-level-1-border rounded-input p-4">
                <span className="text-theme-level-1-text font-semibold">
                  Level 1: #0d47a1 on #e3f2fd (8.63:1)
                </span>
              </div>
              <div className="bg-theme-level-2-bg border-l-4 border-l-theme-level-2-border rounded-input p-4">
                <span className="text-theme-level-2-text font-semibold">
                  Level 2: #1b5e20 on #e8f5e9 (7.87:1)
                </span>
              </div>
              <div className="bg-theme-level-3-bg border-l-4 border-l-theme-level-3-border rounded-input p-4">
                <span className="text-theme-level-3-text font-semibold">
                  Level 3: #4a148c on #f3e5f5 (9.12:1)
                </span>
              </div>
              <div className="bg-theme-level-4-bg border-l-4 border-l-theme-level-4-border rounded-input p-4">
                <span className="text-theme-level-4-text font-semibold">
                  Level 4: #8b3d06 on #fff3e0 (7.59:1)
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Section: Border Radius Tokens */}
        <section className="mb-section" aria-labelledby="radius-heading">
          <h2
            id="radius-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Border Radius Tokens (SSOT)
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border-2 border-theme-border-default p-4 text-center">
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  rounded-xl
                </p>
                <p className="text-theme-text-primary font-semibold">12px (Badge only)</p>
              </div>
              <div className="rounded-input border-2 border-theme-border-default p-4 text-center">
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  rounded-input
                </p>
                <p className="text-theme-text-primary font-semibold">24px (Inputs, Buttons)</p>
              </div>
              <div className="rounded-widget border-2 border-theme-border-default p-4 text-center">
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  rounded-widget
                </p>
                <p className="text-theme-text-primary font-semibold">32px (Widgets)</p>
              </div>
              <div className="rounded-editorial border-2 border-theme-border-default p-4 text-center">
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  rounded-editorial
                </p>
                <p className="text-theme-text-primary font-semibold">40px (Cards)</p>
              </div>
              <div className="rounded-editorial-lg border-2 border-theme-border-default p-4 text-center">
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  rounded-editorial-lg
                </p>
                <p className="text-theme-text-primary font-semibold">48px (Form Cards)</p>
              </div>
              <div className="rounded-editorial-2xl border-2 border-theme-border-default p-4 text-center">
                <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
                  rounded-editorial-2xl
                </p>
                <p className="text-theme-text-primary font-semibold">64px (Menu Cards)</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Section: Focus Ring */}
        <section className="mb-16" aria-labelledby="focus-heading">
          <h2
            id="focus-heading"
            className="text-3xl font-serif-title tracking-editorial italic mb-8 text-theme-text-primary"
          >
            Focus Ring (AAA)
          </h2>
          <Card variant="secondary" padding="xl" radius="xl">
            <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-4">
              TAB TO SEE FOCUS RING (4px, offset 4px)
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Tab to Focus</Button>
              <Button variant="secondary">Tab to Focus</Button>
              <Button variant="ghost">Tab to Focus</Button>
            </div>
            <p className="text-sm text-theme-text-secondary mt-4">
              All interactive elements use <code className="font-mono-brand">ring-[4px]</code> with{' '}
              <code className="font-mono-brand">ring-offset-4</code> for keyboard navigation.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
