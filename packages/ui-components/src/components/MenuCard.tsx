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

const baseClasses =
  'w-full text-left bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10 transition-all duration-300';

const enabledClasses =
  'cursor-pointer hover:shadow-theme-lg hover:border-theme-primary hover:-translate-y-1';

const disabledClasses = 'cursor-not-allowed opacity-50';

const pinnedClasses = 'bg-theme-bg-card border-theme-primary';

const pinButtonBaseClasses =
  'p-2 rounded-lg border transition-all min-w-[36px] min-h-[36px] flex items-center justify-center';

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
 * Editorial-style Menu Card Component (2025 Accessible Pattern)
 *
 * Features:
 * - Semantic <button> element for accessibility (WCAG 4.1.2)
 * - Index number display (01, 02, etc.)
 * - Serif title typography (Playfair Display)
 * - 40px border radius for sophisticated look
 * - Hover lift effect with shadow
 * - WCAG 2.1 AAA compliant focus ring (7:1+ contrast)
 * - Native keyboard navigation (Enter/Space)
 * - Optional pin button for widget pinning
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
 *   pinTooltip="Pin to top widget"
 * />
 * ```
 */
/**
 * React.memo wrapper for list rendering performance
 * per rules.md: "✅ Use React.memo for list items"
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
      className={`${baseClasses} ${isPinned ? pinnedClasses : ''} ${isDisabled ? disabledClasses : enabledClasses} ${focusClasses} ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-editorial, cubic-bezier(0.2, 1, 0.3, 1))' }}
    >
      {/* Header: Index + Pin + Icon */}
      <div className="flex items-center justify-between mb-6">
        <span
          className="text-sm tracking-widest text-theme-text-muted"
          style={{ fontFamily: 'var(--font-family-mono-brand)' }}
        >
          {formattedIndex}
        </span>
        <div className="flex items-center gap-2">
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
              className={`${pinButtonBaseClasses} ${isPinned ? pinButtonActiveClasses : pinButtonInactiveClasses} ${focusClasses}`}
            >
              <PinIcon filled={isPinned} />
            </span>
          )}
          <span className="text-theme-text-secondary" aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3
        className="text-xl sm:text-2xl text-theme-text-primary mb-3 tracking-tight"
        style={{ fontFamily: 'var(--font-family-serif-title)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-theme-text-secondary leading-relaxed">{description}</p>
    </button>
  );
});
