import React from 'react';

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
  'bg-theme-bg-card border border-theme-border-default rounded-[40px] p-8 sm:p-10 cursor-pointer transition-all duration-300';

const hoverClasses = 'hover:shadow-theme-lg hover:border-theme-primary hover:-translate-y-1';

/**
 * Editorial-style Menu Card Component
 *
 * Features:
 * - Index number display (01, 02, etc.)
 * - Serif title typography (Playfair Display)
 * - 40px border radius for sophisticated look
 * - Hover lift effect with shadow
 * - WCAG 2.1 AAA compliant focus ring
 *
 * @example
 * ```tsx
 * <MenuCard
 *   index={1}
 *   icon={<BookIcon />}
 *   title="Personal Journal"
 *   description="Record your daily thoughts and reflections"
 *   onClick={() => navigate('/journal')}
 * />
 * ```
 */
export function MenuCard({
  index,
  icon,
  title,
  description,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}: MenuCardProps) {
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
      {/* Header: Index + Icon */}
      <div className="flex items-center justify-between mb-6">
        <span
          className="text-sm tracking-widest text-theme-text-muted"
          style={{ fontFamily: 'var(--font-family-mono-brand)' }}
        >
          {formattedIndex}
        </span>
        <span className="text-theme-text-secondary">{icon}</span>
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
    </div>
  );
}
