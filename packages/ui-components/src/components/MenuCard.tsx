import React, { memo, useCallback } from 'react';

export interface MenuCardProps {
  /**
   * Display index (01, 02, etc.)
   */
  index: number;
  /**
   * Icon component to display
   */
  icon: React.ReactNode;
  /**
   * Card title (displayed in serif font)
   */
  title: string;
  /**
   * Card description
   */
  description: string;
  /**
   * Click handler - if undefined, card is disabled
   */
  onClick?: () => void;
  /**
   * Whether this card is pinned to the top widget
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
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring focus-visible:ring-offset-4';

// Fixed height card with flex layout for consistent sizing across languages
const baseClasses =
  'w-full min-h-[320px] text-left rounded-[40px] border-2 p-8 sm:p-10 transition-all duration-500 flex flex-col relative group';

const defaultClasses = 'bg-theme-bg-card border-theme-border-default';

const pinnedClasses = 'bg-theme-bg-secondary border-theme-primary';

const enabledClasses = 'cursor-pointer hover:border-theme-primary';

const disabledClasses = 'cursor-not-allowed opacity-50';

// Icon container classes
const iconContainerBase =
  'p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-500';

const iconContainerDefault =
  'bg-theme-bg-secondary border-theme-border-default text-theme-text-secondary group-hover:border-theme-primary';

const iconContainerPinned = 'bg-theme-bg-card border-theme-primary text-theme-primary';

// Pin button classes
const pinButtonBase =
  'w-10 h-10 flex items-center justify-center rounded-xl border transition-all min-w-[40px] min-h-[40px]';

const pinButtonActive = 'bg-theme-primary text-btn-primary-text border-theme-primary';

const pinButtonInactive =
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
 * Chevron Right Icon for hover effect
 */
const ChevronRightIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * Editorial-style Menu Card Component (2025 Accessible Pattern)
 *
 * Design based on V24.5 mockup - Fixed height cards with consistent layout.
 *
 * Features:
 * - Fixed minimum height (320px) for consistent card sizes across languages
 * - Icon at top-left in bordered container
 * - Pin button + Index number at top-right
 * - Title and description at bottom with flex spacing
 * - Hover arrow animation (ChevronRight)
 * - 40px border radius, 2px border for sophisticated look
 * - WCAG 2.1 AAA compliant focus ring (7:1+ contrast)
 *
 * @example
 * ```tsx
 * <MenuCard
 *   index={1}
 *   icon={<BookIcon aria-hidden="true" />}
 *   title="Personal Journal"
 *   description="Record your daily thoughts and reflections"
 *   onClick={() => navigate('/journal')}
 *   isPinned={pinnedId === 'journal'}
 *   onPin={() => setPinnedId('journal')}
 * />
 * ```
 */
export const MenuCard = memo(function MenuCard({
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
}: MenuCardProps) {
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
      className={`${baseClasses} ${isPinned ? pinnedClasses : defaultClasses} ${isDisabled ? disabledClasses : enabledClasses} ${focusClasses} ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-editorial, cubic-bezier(0.2, 1, 0.3, 1))' }}
    >
      {/* Header Row: Icon (left) + Pin + Index (right) */}
      <div className="flex justify-between items-start">
        {/* Icon Container - Left */}
        <div
          className={`${iconContainerBase} ${isPinned ? iconContainerPinned : iconContainerDefault}`}
        >
          <span className="block w-6 h-6 sm:w-8 sm:h-8 [&>svg]:w-full [&>svg]:h-full group-hover:scale-110 transition-transform duration-500">
            {icon}
          </span>
        </div>

        {/* Pin + Index - Right */}
        <div className="flex items-center gap-3">
          {onPin && (
            <span
              role="button"
              tabIndex={0}
              onClick={handlePinClick}
              onKeyDown={handlePinKeyDown}
              title={pinTooltip}
              aria-label={isPinned ? `Unpin ${title}` : `Pin ${title}`}
              aria-pressed={isPinned}
              className={`${pinButtonBase} ${isPinned ? pinButtonActive : pinButtonInactive} ${focusClasses}`}
            >
              <PinIcon filled={isPinned} />
            </span>
          )}
          <span
            className="text-xs font-black text-theme-primary opacity-50 group-hover:opacity-100 transition-opacity"
            style={{ fontFamily: 'var(--font-family-mono-brand)' }}
          >
            [{formattedIndex}]
          </span>
        </div>
      </div>

      {/* Spacer - pushes content to bottom */}
      <div className="flex-1 min-h-[48px]" />

      {/* Content - Bottom aligned */}
      <div className="pr-16 sm:pr-20">
        <h3
          className="text-2xl sm:text-3xl text-theme-text-primary mb-3 sm:mb-4 tracking-tight leading-tight"
          style={{ fontFamily: 'var(--font-family-serif-title)' }}
        >
          {title}
        </h3>
        <p className="text-sm sm:text-[15px] font-medium text-theme-text-secondary leading-relaxed line-clamp-2 group-hover:text-theme-text-primary transition-colors duration-300">
          {description}
        </p>
      </div>

      {/* Hover Arrow - Bottom Right */}
      <div className="absolute bottom-8 sm:bottom-10 right-8 sm:right-10 text-theme-text-primary opacity-0 group-hover:opacity-40 transition-all duration-300 -translate-x-3 group-hover:translate-x-0">
        <ChevronRightIcon />
      </div>
    </button>
  );
});
