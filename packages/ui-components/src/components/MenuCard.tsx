import React, { memo } from 'react';

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
 *
 * @example
 * ```tsx
 * <MenuCard
 *   index={1}
 *   icon={<BookIcon aria-hidden="true" />}
 *   title="Personal Journal"
 *   description="Record your daily thoughts and reflections"
 *   onClick={() => navigate('/journal')}
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
  className = '',
  'aria-label': ariaLabel,
}: MenuCardProps) {
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
      {/* Header: Index + Icon */}
      <div className="flex items-center justify-between mb-6">
        <span
          className="text-sm tracking-widest text-theme-text-muted"
          style={{ fontFamily: 'var(--font-family-mono-brand)' }}
        >
          {formattedIndex}
        </span>
        <span className="text-theme-text-secondary" aria-hidden="true">
          {icon}
        </span>
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
