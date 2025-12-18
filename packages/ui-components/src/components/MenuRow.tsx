import React, { memo, useCallback } from 'react';

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
   * Row description (optional, shown in list view)
   */
  description?: string;
  /**
   * Click handler - if undefined, row is disabled
   */
  onClick?: () => void;
  /**
   * Whether this row is pinned
   */
  isPinned?: boolean;
  /**
   * Pin button click handler
   */
  onPin?: () => void;
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

// List row with consistent padding and border (V24.5 mockup: gap-8 p-8)
const baseClasses =
  'w-full flex items-center gap-8 p-8 rounded-3xl border-2 transition-all duration-300 group';

const defaultClasses = 'bg-theme-bg-card border-theme-border-default';

const enabledClasses = 'cursor-pointer hover:border-theme-primary';

const disabledClasses = 'cursor-not-allowed opacity-50';

// Icon container classes (V24.5: p-4 rounded-xl)
const iconContainerClasses =
  'p-4 rounded-xl bg-theme-bg-secondary text-theme-text-secondary group-hover:text-theme-primary transition-colors';

/**
 * Pin Icon SVG component (inline)
 */
const PinIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    className="w-[18px] h-[18px]"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
    />
  </svg>
);

/**
 * Compact Menu Row Component for list view (2025 Accessible Pattern)
 *
 * Design based on V24.5 mockup - Horizontal layout with icon, title, description.
 *
 * Features:
 * - Compact horizontal layout
 * - Icon in rounded container on left
 * - Title and description in center (flex-1)
 * - Optional pin button on right
 * - 24px border radius (rounded-3xl)
 * - 2px border for consistency with MenuCard
 * - WCAG 2.1 AAA compliant focus ring
 *
 * @example
 * ```tsx
 * <MenuRow
 *   index={1}
 *   icon={<BookIcon aria-hidden="true" />}
 *   title="Personal Journal"
 *   description="Record your daily thoughts"
 *   onClick={() => navigate('/journal')}
 *   isPinned={pinnedId === 'journal'}
 *   onPin={() => setPinnedId('journal')}
 * />
 * ```
 */
export const MenuRow = memo(function MenuRow({
  index: _index, // Keep in props for API consistency with MenuCard
  icon,
  title,
  description,
  onClick,
  isPinned = false,
  onPin,
  className = '',
  'aria-label': ariaLabel,
}: MenuRowProps) {
  const isDisabled = !onClick;

  // Memoized pin click handler
  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onPin?.();
    },
    [onPin],
  );

  // Keyboard handler for pin button
  const handlePinKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
        e.preventDefault();
        onPin?.();
      }
    },
    [onPin],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={ariaLabel || title}
      className={`${baseClasses} ${defaultClasses} ${isDisabled ? disabledClasses : enabledClasses} ${focusClasses} ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-editorial, cubic-bezier(0.2, 1, 0.3, 1))' }}
    >
      {/* Icon Container (V24.5: size 24) */}
      <div className={iconContainerClasses}>
        <span className="block w-6 h-6 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.5]">
          {icon}
        </span>
      </div>

      {/* Content - Title and Description (V24.5: text-xl, text-sm font-bold) */}
      <div className="flex-1 text-left min-w-0">
        <h3 className="text-xl font-bold text-theme-text-primary mb-1 truncate">{title}</h3>
        {description && (
          <p className="text-sm font-bold text-theme-text-secondary line-clamp-1">{description}</p>
        )}
      </div>

      {/* Pin Button (optional) - min 44x44px for WCAG 2.5.5 touch target */}
      {onPin && (
        <span
          role="button"
          tabIndex={0}
          onClick={handlePinClick}
          onKeyDown={handlePinKeyDown}
          aria-label={isPinned ? `Unpin ${title}` : `Pin ${title}`}
          aria-pressed={isPinned}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${isPinned ? 'text-theme-primary' : 'text-theme-border-default hover:text-theme-text-secondary'} ${focusClasses}`}
        >
          <PinIcon filled={isPinned} />
        </span>
      )}
    </button>
  );
});
