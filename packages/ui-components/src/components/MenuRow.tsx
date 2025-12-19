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
   * Row description (optional)
   */
  description?: string;
  /**
   * Click handler - if undefined, row is disabled
   */
  onClick?: () => void;
  /**
   * Whether this row is pinned to the top widget
   */
  isPinned?: boolean;
  /**
   * Pin button click handler
   */
  onPin?: () => void;
  /**
   * Pin button tooltip text
   */
  pinTooltip?: string;
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
// V0.0.1 AAA Workstation Design System
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

const baseClasses =
  'w-full flex items-center gap-6 px-8 py-5 bg-theme-bg-card border-2 border-theme-border-subtle rounded-3xl transition-all duration-300 shadow-theme-sm';

const enabledClasses =
  'cursor-pointer hover:bg-theme-bg-hover hover:border-theme-primary hover:-translate-y-0.5';

const disabledClasses = 'cursor-not-allowed opacity-50';

const pinnedClasses = 'border-theme-primary';

const pinButtonBaseClasses =
  'p-2.5 rounded-xl border-2 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center';

const pinButtonActiveClasses = 'bg-theme-primary text-btn-primary-text border-theme-primary';

const pinButtonInactiveClasses =
  'bg-transparent border-theme-border-default text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-primary';

/**
 * Pin Icon SVG component (inline to avoid external dependency)
 */
const PinIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    className="w-4 h-4"
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
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Semantic <button> element for accessibility (WCAG 4.1.2)
 * - Compact horizontal layout with index, icon, title, and optional description
 * - Subtle hover effect with border color change
 * - WCAG 2.1 AAA compliant focus ring (7:1+ contrast)
 * - Native keyboard navigation (Enter/Space)
 * - Optional pin button for widget pinning
 *
 * @example
 * ```tsx
 * <MenuRow
 *   index={1}
 *   icon={<BookIcon aria-hidden="true" />}
 *   title="Personal Journal"
 *   description="Record daily thoughts"
 *   onClick={() => navigate('/journal')}
 *   isPinned={pinnedId === 'journal'}
 *   onPin={() => setPinnedId('journal')}
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
  description,
  onClick,
  isPinned = false,
  onPin,
  pinTooltip = 'Pin to top widget',
  className = '',
  'aria-label': ariaLabel,
}: MenuRowProps) {
  const formattedIndex = String(index).padStart(2, '0');
  const isDisabled = !onClick;

  // Memoized pin click handler to prevent event bubbling
  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onPin?.();
    },
    [onPin],
  );

  // Keyboard handler for pin button (WCAG 2.1 3.2.1)
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
      className={`group ${baseClasses} ${isPinned ? pinnedClasses : ''} ${isDisabled ? disabledClasses : enabledClasses} ${focusClasses} ${className}`}
    >
      {/* Index */}
      <span className="text-xs font-bold tracking-brand text-theme-primary w-8 flex-shrink-0 font-mono-brand">
        {formattedIndex}
      </span>

      {/* Icon */}
      <span
        className="text-theme-text-secondary group-hover:text-theme-primary transition-colors flex-shrink-0"
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Title and Description */}
      <div className="flex-1 text-left">
        <span className="text-theme-text-primary font-semibold block">{title}</span>
        {description && (
          <span className="text-sm text-theme-text-secondary leading-relaxed block mt-0.5">
            {description}
          </span>
        )}
      </div>

      {/* Pin button (optional) */}
      {onPin && (
        <span
          role="button"
          tabIndex={0}
          onClick={handlePinClick}
          onKeyDown={handlePinKeyDown}
          title={pinTooltip}
          aria-label={isPinned ? `Unpin ${title}` : `Pin ${title}`}
          aria-pressed={isPinned}
          className={`${pinButtonBaseClasses} ${isPinned ? pinButtonActiveClasses : pinButtonInactiveClasses} ${focusClasses} flex-shrink-0`}
        >
          <PinIcon filled={isPinned} />
        </span>
      )}
    </button>
  );
});
