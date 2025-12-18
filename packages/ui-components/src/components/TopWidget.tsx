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
const containerClasses =
  'p-8 sm:p-10 rounded-[48px] bg-theme-bg-card border-2 border-theme-primary shadow-theme-lg';

const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

/**
 * TopWidget Component - Pinned Widget for Dashboard (2025 Accessible Pattern)
 *
 * Features:
 * - Displays a pinned widget at the top of the dashboard
 * - 48px border radius for premium look
 * - Accent border for emphasis
 * - WCAG 2.1 AAA compliant focus ring
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
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {/* Icon container */}
          <div className="p-3 bg-theme-bg-page border border-theme-border-default rounded-2xl text-theme-primary">
            {icon}
          </div>
          {/* Title and badge */}
          <div>
            <h2
              className="text-xl font-bold text-theme-text-primary"
              style={{ fontFamily: 'var(--font-family-serif-title)' }}
            >
              {title}
            </h2>
            <p
              className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest"
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
            className={`text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary hover:text-theme-text-primary transition-colors rounded-lg px-3 py-2 min-h-[44px] flex items-center ${focusClasses}`}
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
