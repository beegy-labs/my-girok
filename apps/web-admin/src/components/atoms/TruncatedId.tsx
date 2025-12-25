// apps/web-admin/src/components/atoms/TruncatedId.tsx
import { memo, useCallback, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { truncateUuid } from '../../utils/sanitize';

interface TruncatedIdProps {
  id: string;
  length?: number;
  showCopy?: boolean;
  className?: string;
}

/**
 * Display a truncated ID (UUID, slug, etc.) with optional copy button
 * Optimized for admin table density - uses monospace font and compact sizing
 */
export const TruncatedId = memo<TruncatedIdProps>(
  ({ id, length = 8, showCopy = true, className = '' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Clipboard API not available, fail silently
      }
    }, [id]);

    const truncated = truncateUuid(id, length);

    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-xs text-theme-text-secondary ${className}`}
        title={id}
      >
        <span className="truncate max-w-[100px]">{truncated}</span>
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-0.5 hover:text-theme-primary transition-colors"
            aria-label="Copy ID"
          >
            {copied ? (
              <Check size={12} className="text-theme-status-success-text" />
            ) : (
              <Copy size={12} />
            )}
          </button>
        )}
      </span>
    );
  },
);

TruncatedId.displayName = 'TruncatedId';
