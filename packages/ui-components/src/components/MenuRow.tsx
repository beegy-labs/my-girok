import React, { memo } from 'react';

export interface MenuRowProps {
  /**
   * Display index (01, 02, etc.)
   */
  index: number;
  /**
   * Icon component to display
   */
  icon: React.ReactNode;
  /**
   * Row title
   */
  title: string;
  /**
   * Click handler - if undefined, row is disabled
   */
  onClick?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Accessible label
   */
  'aria-label'?: string;
}

// Static class definitions (defined outside component for performance - 2025 best practice)
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

const baseClasses =
  'w-full flex items-center gap-4 px-6 py-4 bg-theme-bg-card border border-theme-border-default rounded-2xl transition-all duration-300';

const enabledClasses =
  'cursor-pointer hover:bg-theme-bg-hover hover:border-theme-primary hover:-translate-y-0.5';

const disabledClasses = 'cursor-not-allowed opacity-50';

/**
 * Compact Menu Row Component for list view (2025 Accessible Pattern)
 *
 * Features:
 * - Semantic <button> element for accessibility (WCAG 4.1.2)
 * - Compact horizontal layout with index, icon, and title
 * - Subtle hover effect
 * - WCAG 2.1 AAA compliant focus ring (7:1+ contrast)
 * - Native keyboard navigation (Enter/Space)
 *
 * @example
 * ```tsx
 * <MenuRow
 *   index={1}
 *   icon={<BookIcon aria-hidden="true" />}
 *   title="Personal Journal"
 *   onClick={() => navigate('/journal')}
 * />
 * ```
 */
/**
 * React.memo wrapper for list rendering performance
 * per rules.md: "✅ Use React.memo for list items"
 */
export const MenuRow = memo(function MenuRow({
  index,
  icon,
  title,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}: MenuRowProps) {
  const formattedIndex = String(index).padStart(2, '0');
  const isDisabled = !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={ariaLabel || title}
      className={`${baseClasses} ${isDisabled ? disabledClasses : enabledClasses} ${focusClasses} ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-editorial, cubic-bezier(0.2, 1, 0.3, 1))' }}
    >
      {/* Index */}
      <span
        className="text-xs tracking-widest text-theme-text-muted w-6"
        style={{ fontFamily: 'var(--font-family-mono-brand)' }}
      >
        {formattedIndex}
      </span>

      {/* Icon */}
      <span className="text-theme-text-secondary" aria-hidden="true">
        {icon}
      </span>

      {/* Title */}
      <span className="text-theme-text-primary font-medium">{title}</span>
    </button>
  );
});
