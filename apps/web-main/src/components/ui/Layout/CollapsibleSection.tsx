import React, { useState, useCallback } from 'react';

export interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Icon emoji displayed before title */
  icon?: string;
  /** Whether the section is expanded by default */
  defaultExpanded?: boolean;
  /** Whether the section can be collapsed (false = always expanded) */
  collapsible?: boolean;
  /** Section content */
  children: React.ReactNode;
  /** Additional action button in header */
  headerAction?: React.ReactNode;
  /** Card variant */
  variant?: 'primary' | 'secondary';
  /** Additional CSS classes */
  className?: string;
}

/**
 * CollapsibleSection Component
 *
 * A collapsible card section for forms with mobile-first responsive design.
 * Collapsible on mobile, always expanded on desktop (sm:).
 *
 * Features:
 * - Mobile-first responsive padding (p-3 sm:p-4 lg:p-6)
 * - Collapsible on mobile with chevron indicator
 * - Always visible on desktop
 * - Icon and title with consistent typography
 * - Optional header action button
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <CollapsibleSection
 *   title="Basic Information"
 *   icon="👤"
 *   defaultExpanded={true}
 *   headerAction={<button>Add</button>}
 * >
 *   <TextInput label="Name" ... />
 * </CollapsibleSection>
 * ```
 */
export default function CollapsibleSection({
  title,
  icon,
  defaultExpanded = true,
  collapsible = true,
  children,
  headerAction,
  variant = 'primary',
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  }, [collapsible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    },
    [collapsible]
  );

  const variantClasses = {
    primary: `
      bg-amber-50/30 dark:bg-dark-bg-card
      border border-amber-100 dark:border-dark-border-subtle
      shadow-md dark:shadow-dark-md
    `,
    secondary: `
      bg-white dark:bg-dark-bg-card
      border border-gray-200 dark:border-dark-border-default
      shadow-sm dark:shadow-dark-sm
    `,
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        rounded-xl sm:rounded-2xl
        transition-all duration-200
        ${className}
      `}
    >
      {/* Header - Clickable on mobile */}
      <div
        className={`
          flex items-center justify-between gap-2
          p-3 sm:p-4 lg:p-6
          ${collapsible ? 'cursor-pointer sm:cursor-default' : ''}
        `}
        onClick={collapsible ? handleToggle : undefined}
        onKeyDown={collapsible ? handleKeyDown : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0">{icon}</span>}
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-amber-900 dark:text-dark-text-primary truncate">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {headerAction && <div className="hidden sm:block">{headerAction}</div>}

          {/* Chevron indicator - Mobile only, only if collapsible */}
          {collapsible && (
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-dark-text-tertiary transition-transform sm:hidden ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Mobile header action - shown inside content when expanded */}
      {headerAction && (
        <div
          className={`
            sm:hidden px-3 pb-2
            ${isExpanded ? 'block' : 'hidden'}
          `}
        >
          {headerAction}
        </div>
      )}

      {/* Content - Collapsible on mobile, always visible on desktop */}
      <div
        className={`
          ${isExpanded ? 'block' : 'hidden'}
          sm:block
          px-3 pb-3 sm:px-4 sm:pb-4 lg:px-6 lg:pb-6
          pt-0
        `}
      >
        {children}
      </div>
    </div>
  );
}
