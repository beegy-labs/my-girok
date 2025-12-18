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

// V24.5 mockup: <div> container with p-10 rounded-[40px] border-2 min-h-[320px]
const baseClasses =
  'w-full min-h-[320px] text-left rounded-[40px] border-2 p-10 transition-all duration-500 flex flex-col justify-between relative group';

const defaultClasses = 'bg-theme-bg-card border-theme-border-default';

const pinnedClasses = 'bg-theme-bg-secondary border-theme-primary';

const enabledClasses =
  'cursor-pointer hover:border-theme-primary hover:shadow-theme-lg hover:-translate-y-1';

const disabledClasses = 'cursor-not-allowed opacity-50';

// V24.5 mockup: icon container p-6 rounded-3xl border-2
const iconContainerBase = 'p-6 rounded-3xl border-2 transition-all duration-500';

const iconContainerDefault =
  'bg-theme-bg-secondary border-theme-border-default text-theme-text-secondary group-hover:border-theme-primary';

const iconContainerPinned = 'bg-theme-bg-card border-theme-primary text-theme-primary';

// V24.5 mockup: pin button w-10 h-10 rounded-xl border
const pinButtonBase = 'w-10 h-10 flex items-center justify-center rounded-xl border transition-all';

const pinButtonActive = 'bg-theme-primary text-btn-primary-text border-theme-primary';

const pinButtonInactive =
  'bg-transparent border-theme-border-default text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-primary';

/**
 * Pin Icon SVG component (V24.5: size={16})
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
 * Chevron Right Icon for hover effect (V24.5: size={28} strokeWidth={4})
 */
const ChevronRightIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * Editorial-style Menu Card Component (V24.5 mockup pattern)
 *
 * Structure: <div> container with separate <button> elements
 * This pattern avoids nested interactive elements (HTML spec compliant)
 *
 * Features:
 * - Fixed minimum height (320px) for consistent card sizes
 * - Icon at top-left in bordered container (p-6 rounded-3xl border-2)
 * - Pin button (w-10 h-10) + Index number at top-right
 * - Title and description at bottom with flex spacing
 * - Hover arrow animation (ChevronRight)
 * - 40px border radius, 2px border for sophisticated look
 * - WCAG 2.1 AAA compliant focus ring
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
  pinTooltip = 'Pin to Widget',
  className = '',
  'aria-label': ariaLabel,
}: MenuCardProps) {
  const formattedIndex = String(index).padStart(2, '0');
  const isDisabled = !onClick;

  // Card click handler (for navigation)
  const handleCardClick = useCallback(() => {
    if (!isDisabled && onClick) {
      onClick();
    }
  }, [isDisabled, onClick]);

  // Keyboard handler for card (WCAG 2.1)
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isDisabled && onClick) {
        e.preventDefault();
        onClick();
      }
    },
    [isDisabled, onClick],
  );

  // Pin click handler with stopPropagation
  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPin?.();
    },
    [onPin],
  );

  return (
    // V24.5 mockup: <div> container (not <button>) - avoids nested interactive elements
    <div
      role={isDisabled ? undefined : 'button'}
      tabIndex={isDisabled ? undefined : 0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={ariaLabel || title}
      aria-disabled={isDisabled}
      className={`${baseClasses} ${isPinned ? pinnedClasses : defaultClasses} ${isDisabled ? disabledClasses : enabledClasses} ${focusClasses} ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-editorial, cubic-bezier(0.2, 1, 0.3, 1))' }}
    >
      {/* Header Row: Icon (left) + Pin + Index (right) */}
      <div className="flex justify-between items-start">
        {/* Icon Container - V24.5: p-6 rounded-3xl border-2, icon size={32} strokeWidth={2} */}
        <div
          className={`${iconContainerBase} ${isPinned ? iconContainerPinned : iconContainerDefault}`}
        >
          <span className="block w-8 h-8 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2] group-hover:scale-110 transition-transform duration-500">
            {icon}
          </span>
        </div>

        {/* Pin + Index - Right */}
        <div className="flex items-center gap-3">
          {/* V24.5 mockup: separate <button> for pin (not nested) */}
          {onPin && (
            <button
              type="button"
              onClick={handlePinClick}
              title={pinTooltip}
              aria-label={isPinned ? `Unpin ${title}` : `Pin ${title}`}
              aria-pressed={isPinned}
              className={`${pinButtonBase} ${isPinned ? pinButtonActive : pinButtonInactive} ${focusClasses}`}
            >
              <PinIcon filled={isPinned} />
            </button>
          )}
          {/* V24.5 mockup: [{index}] format */}
          <span
            className="text-xs font-black text-theme-primary opacity-50 group-hover:opacity-100 transition-opacity"
            style={{ fontFamily: 'var(--font-family-mono-brand)' }}
          >
            [{formattedIndex}]
          </span>
        </div>
      </div>

      {/* Content - V24.5: mt-12 pr-20 */}
      <div className="mt-12 pr-20">
        <span
          className="block text-3xl text-theme-text-primary mb-4 tracking-tight leading-tight"
          style={{ fontFamily: 'var(--font-family-serif-title)' }}
        >
          {title}
        </span>
        <p className="text-[15px] font-bold text-theme-text-secondary leading-relaxed line-clamp-2 group-hover:text-theme-text-primary transition-colors duration-300">
          {description}
        </p>
      </div>

      {/* Hover Arrow - V24.5: bottom-12 right-12, size={28} strokeWidth={4} */}
      <div className="absolute bottom-12 right-12 text-theme-text-primary opacity-0 group-hover:opacity-40 transition-all duration-300 -translate-x-3 group-hover:translate-x-0">
        <ChevronRightIcon />
      </div>
    </div>
  );
});
