import React, { useState } from 'react';

export interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Icon emoji displayed before title */
  icon?: string;
  /** Whether the section is expanded by default (uncontrolled mode) */
  defaultExpanded?: boolean;
  /** Controlled expanded state (overrides defaultExpanded) */
  isExpanded?: boolean;
  /** Callback when expanded state changes (for controlled mode) */
  onToggle?: () => void;
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
  /** Item count badge */
  count?: number;
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
export function CollapsibleSection({
  title,
  icon,
  defaultExpanded = true,
  isExpanded: controlledExpanded,
  onToggle,
  collapsible = true,
  children,
  headerAction,
  variant = 'primary',
  className = '',
  count,
}: CollapsibleSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  // 2025 best practice: inline handlers in non-memoized components
  const handleToggle = () => {
    if (collapsible) {
      if (isControlled && onToggle) {
        onToggle();
      } else {
        setInternalExpanded((prev) => !prev);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleToggle();
    }
  };

  // Theme: Semantic theme tokens (auto-switch via data-theme)
  const variantClasses = {
    primary: `
      bg-theme-bg-card
      border border-theme-border-subtle
      shadow-theme-md
    `,
    secondary: `
      bg-theme-bg-card
      border border-theme-border-default
      shadow-theme-sm
    `,
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        rounded-soft
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
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-theme-text-accent truncate">
            {title}
          </h2>
          {count !== undefined && count > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-theme-accent/20 text-theme-accent rounded-full flex-shrink-0">
              {count}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {headerAction && <div className="hidden sm:block">{headerAction}</div>}

          {/* Chevron indicator - Mobile only, only if collapsible */}
          {collapsible && (
            <svg
              className={`w-5 h-5 text-theme-text-muted transition-transform sm:hidden ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
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
