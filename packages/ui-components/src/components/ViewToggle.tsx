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

// Static class definitions
const focusClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus-ring focus-visible:ring-offset-2';

const buttonBaseClasses =
  'p-2 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center';

/**
 * View Toggle Component for switching between Grid and List views
 *
 * Features:
 * - Toggle between grid (2-column cards) and list (compact rows) views
 * - WCAG 2.1 AA compliant touch targets (44x44px)
 * - Clear visual feedback for active state
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useState<ViewMode>('grid');
 * <ViewToggle value={viewMode} onChange={setViewMode} />
 * ```
 */
export function ViewToggle({ value, onChange, className = '' }: ViewToggleProps) {
  return (
    <div
      className={`inline-flex gap-1 p-1 bg-theme-bg-card border border-theme-border-default rounded-xl ${className}`}
      role="radiogroup"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`${buttonBaseClasses} ${focusClasses} ${
          value === 'grid'
            ? 'bg-theme-primary text-white'
            : 'text-theme-text-secondary hover:bg-theme-bg-hover'
        }`}
        role="radio"
        aria-checked={value === 'grid'}
        aria-label="Grid view"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`${buttonBaseClasses} ${focusClasses} ${
          value === 'list'
            ? 'bg-theme-primary text-white'
            : 'text-theme-text-secondary hover:bg-theme-bg-hover'
        }`}
        role="radio"
        aria-checked={value === 'list'}
        aria-label="List view"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}
