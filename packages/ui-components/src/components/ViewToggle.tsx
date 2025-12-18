import { useCallback, memo } from 'react';

export type ViewMode = 'grid' | 'list';

export interface ViewToggleProps {
  /**
   * Current view mode
   */
  value: ViewMode;
  /**
   * Callback when view mode changes
   */
  onChange: (mode: ViewMode) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Static class definitions (2025 best practice - outside component)
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring focus-visible:ring-offset-2';

// V24.5 mockup: p-2 rounded-xl for toggle buttons
const buttonBaseClasses = 'p-2 rounded-xl transition-all duration-200';

/**
 * View Toggle Component for switching between Grid and List views (V24.5 mockup pattern)
 *
 * V24.5 mockup specifications:
 * - Container: p-1.5 rounded-2xl border border-[var(--aaa-border)]
 * - Buttons: p-2 rounded-xl
 * - Icons: size={18} strokeWidth={2.5}
 * - Active: bg-[var(--aaa-card-bg)] shadow-sm text-[var(--aaa-walnut)]
 * - Inactive: text-[var(--aaa-gray-dark)]
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useState<ViewMode>('grid');
 * <ViewToggle value={viewMode} onChange={setViewMode} />
 * ```
 */
export const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
  className = '',
}: ViewToggleProps) {
  // Memoized handlers per rules.md: "✅ Memoize handlers with useCallback"
  const handleGridClick = useCallback(() => onChange('grid'), [onChange]);
  const handleListClick = useCallback(() => onChange('list'), [onChange]);

  return (
    // V24.5 mockup: p-1.5 rounded-2xl border (not border-2)
    <div
      className={`inline-flex bg-theme-bg-secondary p-1.5 rounded-2xl border border-theme-border-default ${className}`}
      role="radiogroup"
      aria-label="View mode"
    >
      {/* Grid Button - V24.5: p-2 rounded-xl, icon size={18} strokeWidth={2.5} */}
      <button
        type="button"
        onClick={handleGridClick}
        className={`${buttonBaseClasses} ${focusClasses} ${
          value === 'grid'
            ? 'bg-theme-bg-card shadow-sm text-theme-primary'
            : 'text-theme-text-secondary'
        }`}
        role="radio"
        aria-checked={value === 'grid'}
        aria-label="Grid view"
      >
        <svg
          className="w-[18px] h-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>

      {/* List Button - V24.5: p-2 rounded-xl, icon size={18} strokeWidth={2.5} */}
      <button
        type="button"
        onClick={handleListClick}
        className={`${buttonBaseClasses} ${focusClasses} ${
          value === 'list'
            ? 'bg-theme-bg-card shadow-sm text-theme-primary'
            : 'text-theme-text-secondary'
        }`}
        role="radio"
        aria-checked={value === 'list'}
        aria-label="List view"
      >
        <svg
          className="w-[18px] h-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
});
