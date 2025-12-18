import React, { memo } from 'react';

export interface TopWidgetProps {
  /**
   * Icon component to display
   */
  icon: React.ReactNode;
  /**
   * Widget title
   */
  title: string;
  /**
   * Badge text (e.g., "Active Focus")
   */
  badgeText?: string;
  /**
   * Click handler to change focus/unpin
   */
  onChangeFocus?: () => void;
  /**
   * Change focus button text
   */
  changeFocusText?: string;
  /**
   * Widget content (children)
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Static class definitions (2025 best practice - outside component)
// V0.0.1 AAA Workstation Design System
const containerClasses =
  'p-10 sm:p-12 rounded-[48px] bg-theme-bg-card border-2 border-theme-primary shadow-theme-lg';

const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

const iconContainerClasses =
  'p-3 bg-theme-bg-secondary border border-theme-border-default rounded-2xl text-theme-primary';

/**
 * TopWidget Component - Pinned Widget for Dashboard (2025 Accessible Pattern)
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Displays a pinned widget at the top of the dashboard
 * - 48px border radius for premium look
 * - Accent border for emphasis
 * - WCAG 2.1 AAA compliant focus ring
 * - 44px minimum touch targets
 * - Supports custom content via children
 *
 * @example
 * ```tsx
 * <TopWidget
 *   icon={<Calendar />}
 *   title="Today's Schedule"
 *   badgeText="Active Focus"
 *   onChangeFocus={() => setEditMode(true)}
 *   changeFocusText="Change Focus"
 * >
 *   <ScheduleContent />
 * </TopWidget>
 * ```
 */
export const TopWidget = memo(function TopWidget({
  icon,
  title,
  badgeText = 'Active Focus',
  onChangeFocus,
  changeFocusText = 'Change Focus',
  children,
  className = '',
}: TopWidgetProps) {
  return (
    <section className={`${containerClasses} ${className}`} aria-label={title}>
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-5">
          {/* Icon container */}
          <div className={iconContainerClasses}>{icon}</div>
          {/* Title and badge */}
          <div>
            <h2
              className="text-2xl font-bold text-theme-text-primary"
              style={{ fontFamily: 'var(--font-family-serif-title)' }}
            >
              {title}
            </h2>
            <p
              className="text-xs font-bold text-theme-text-muted uppercase tracking-[0.25em] mt-1"
              style={{ fontFamily: 'var(--font-family-mono-brand)' }}
            >
              {badgeText}
            </p>
          </div>
        </div>

        {/* Change Focus button - min-h-[44px] for WCAG 2.5.5 touch target */}
        {onChangeFocus && (
          <button
            type="button"
            onClick={onChangeFocus}
            className={`text-xs font-bold uppercase tracking-[0.2em] text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover transition-all rounded-xl px-4 py-3 min-h-[44px] min-w-[44px] flex items-center border-2 border-transparent hover:border-theme-border-default ${focusClasses}`}
          >
            {changeFocusText}
          </button>
        )}
      </div>

      {/* Widget Content */}
      <div className="animate-in fade-in duration-300">{children}</div>
    </section>
  );
});
