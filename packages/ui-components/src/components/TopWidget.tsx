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
  'p-8 sm:p-10 rounded-[48px] bg-theme-bg-secondary border-2 border-theme-primary shadow-2xl transition-all';

const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

/**
 * Pin Icon SVG (filled) for header
 */
const PinIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

/**
 * TopWidget Component - Pinned Widget for Dashboard (V24.5 Editorial Style)
 *
 * Features:
 * - Displays a pinned widget at the top of the dashboard
 * - 48px border radius for premium look
 * - Primary color accent border for emphasis
 * - Pin icon indicator on right side
 * - WCAG 2.1 AAA compliant focus ring
 * - Supports custom content via children
 *
 * @example
 * ```tsx
 * <TopWidget
 *   icon={<Calendar />}
 *   title="Today's Schedule"
 *   badgeText="Active Focus Widget"
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
  badgeText = 'Active Focus Widget',
  onChangeFocus,
  changeFocusText = 'Change Focus',
  children,
  className = '',
}: TopWidgetProps) {
  return (
    <section className={`${containerClasses} ${className}`} aria-label={title}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8 sm:mb-10">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Icon container */}
          <div className="p-3 sm:p-4 bg-theme-bg-card rounded-2xl border-2 border-theme-border-default text-theme-primary shadow-sm">
            <span className="block w-6 h-6 sm:w-7 sm:h-7 [&>svg]:w-full [&>svg]:h-full">
              {icon}
            </span>
          </div>
          {/* Title and badge */}
          <div>
            <h2
              className="text-xl sm:text-2xl font-bold text-theme-text-primary tracking-tight"
              style={{ fontFamily: 'var(--font-family-serif-title)' }}
            >
              {title}
            </h2>
            <p
              className="text-[10px] font-black text-theme-text-muted uppercase tracking-[0.3em] opacity-60"
              style={{ fontFamily: 'var(--font-family-mono-brand)' }}
            >
              {badgeText}
            </p>
          </div>
        </div>

        {/* Right side: Pin icon */}
        <div className="text-theme-primary">
          <PinIcon />
        </div>
      </div>

      {/* Widget Content */}
      <div className="animate-in fade-in duration-300">{children}</div>

      {/* Change Focus button (optional) - appears at bottom */}
      {onChangeFocus && (
        <div className="mt-8 sm:mt-10 pt-6 border-t border-theme-border-default">
          <button
            type="button"
            onClick={onChangeFocus}
            className={`text-[10px] font-black uppercase tracking-widest text-theme-text-secondary hover:text-theme-primary transition-colors rounded-lg px-3 py-2 min-h-[44px] flex items-center ${focusClasses}`}
          >
            {changeFocusText}
          </button>
        </div>
      )}
    </section>
  );
});
