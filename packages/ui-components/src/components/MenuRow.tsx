import React from 'react';

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
   * Click handler
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

// Static class definitions (defined outside component for performance)
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

const baseClasses =
  'flex items-center gap-4 px-6 py-4 bg-theme-bg-card border border-theme-border-default rounded-2xl cursor-pointer transition-all duration-300';

const hoverClasses = 'hover:bg-theme-bg-hover hover:border-theme-primary hover:-translate-y-0.5';

/**
 * Compact Menu Row Component for list view
 *
 * Features:
 * - Compact horizontal layout with index, icon, and title
 * - Subtle hover effect
 * - WCAG 2.1 AAA compliant focus ring
 *
 * @example
 * ```tsx
 * <MenuRow
 *   index={1}
 *   icon={<BookIcon />}
 *   title="Personal Journal"
 *   onClick={() => navigate('/journal')}
 * />
 * ```
 */
export function MenuRow({
  index,
  icon,
  title,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}: MenuRowProps) {
  const formattedIndex = String(index).padStart(2, '0');

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${hoverClasses} ${focusClasses} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.2, 1, 0.3, 1)' }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || title}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Index */}
      <span
        className="text-xs tracking-widest text-theme-text-muted w-6"
        style={{ fontFamily: 'var(--font-family-mono-brand)' }}
      >
        {formattedIndex}
      </span>

      {/* Icon */}
      <span className="text-theme-text-secondary">{icon}</span>

      {/* Title */}
      <span className="text-theme-text-primary font-medium">{title}</span>
    </div>
  );
}
