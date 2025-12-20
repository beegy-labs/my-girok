/**
 * TokenPreview - Interactive Design Token Documentation Component
 *
 * Features:
 * - Live color preview with hover effects
 * - Copy to clipboard with visual feedback
 * - Contrast ratio display for accessibility
 * - Theme-aware display
 * - WCAG compliance indicators
 *
 * @version 0.1.0
 * @see packages/design-tokens/src/tokens.css
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface TokenItemProps {
  /** Token name (e.g., '--theme-text-primary') */
  name: string;
  /** Token value (e.g., '#262220') */
  value: string;
  /** Optional contrast ratio for text colors */
  contrast?: string;
  /** WCAG compliance level */
  wcagLevel?: 'AAA' | 'AA' | 'decorative';
  /** Optional description */
  description?: string;
}

interface TokenGroupProps {
  /** Group title */
  title: string;
  /** Group description */
  description?: string;
  /** Token items */
  tokens: TokenItemProps[];
}

interface CopyButtonProps {
  /** Text to copy */
  text: string;
  /** Button label for accessibility */
  label?: string;
}

// ============================================================================
// Copy Button Component
// ============================================================================

function CopyButton({ text, label = 'Copy to clipboard' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={copied ? 'Copied!' : label}
      className={`
        inline-flex items-center justify-center
        w-8 h-8 rounded-md
        transition-all duration-150
        focus-visible:ring-2 focus-visible:ring-theme-focus-ring focus-visible:outline-none
        ${
          copied
            ? 'bg-status-success-bg text-status-success-text'
            : 'bg-theme-bg-secondary hover:bg-theme-bg-hover text-theme-text-secondary hover:text-theme-text-primary'
        }
      `}
    >
      {copied ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// WCAG Badge Component
// ============================================================================

function WcagBadge({ level }: { level: 'AAA' | 'AA' | 'decorative' }) {
  const styles = {
    AAA: 'bg-status-success-bg text-status-success-text border-status-success-border',
    AA: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    decorative: 'bg-theme-bg-secondary text-theme-text-muted border-theme-border-subtle',
  };

  const labels = {
    AAA: 'WCAG AAA (7:1+)',
    AA: 'WCAG AA (4.5:1+)',
    decorative: 'Decorative',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-full border
        ${styles[level]}
      `}
      title={labels[level]}
    >
      {level}
    </span>
  );
}

// ============================================================================
// Token Item Component
// ============================================================================

export function TokenItem({ name, value, contrast, wcagLevel, description }: TokenItemProps) {
  const isColor = value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl');

  return (
    <div
      className={`
        group flex items-center gap-4 p-4
        bg-theme-bg-card rounded-lg border border-theme-border-subtle
        hover:border-theme-border-default
        transition-colors duration-150
      `}
    >
      {/* Color swatch */}
      {isColor && (
        <div
          className="w-12 h-12 rounded-lg border border-theme-border-subtle shadow-sm flex-shrink-0"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
      )}

      {/* Token info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-mono text-theme-text-primary">{name}</code>
          {wcagLevel && <WcagBadge level={wcagLevel} />}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs font-mono text-theme-text-secondary">{value}</code>
          {contrast && <span className="text-xs text-theme-text-muted">({contrast})</span>}
        </div>

        {description && <p className="text-xs text-theme-text-muted mt-1">{description}</p>}
      </div>

      {/* Copy buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={name} label={`Copy token name: ${name}`} />
        <CopyButton text={value} label={`Copy token value: ${value}`} />
      </div>
    </div>
  );
}

// ============================================================================
// Token Group Component
// ============================================================================

export function TokenGroup({ title, description, tokens }: TokenGroupProps) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-theme-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-theme-text-secondary mb-4">{description}</p>}
      <div className="space-y-2">
        {tokens.map((token) => (
          <TokenItem key={token.name} {...token} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Live Token Preview Component
// ============================================================================

interface LiveTokenPreviewProps {
  /** CSS variable name to preview */
  tokenName: string;
  /** Label for the preview */
  label?: string;
}

export function LiveTokenPreview({ tokenName, label }: LiveTokenPreviewProps) {
  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const computedValue = getComputedStyle(document.documentElement)
        .getPropertyValue(tokenName)
        .trim();

      if (computedValue) {
        setValue(computedValue);
        setError(null);
      } else {
        setError(`Token "${tokenName}" not found`);
      }
    } catch (err) {
      setError(`Error reading token: ${err}`);
    }
  }, [tokenName]);

  if (error) {
    return (
      <div className="p-4 bg-status-error-bg border border-status-error-border rounded-lg">
        <p className="text-sm text-status-error-text">{error}</p>
      </div>
    );
  }

  const isColor = value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl');

  return (
    <div className="inline-flex items-center gap-3 p-3 bg-theme-bg-card rounded-lg border border-theme-border-subtle">
      {isColor && (
        <div
          className="w-8 h-8 rounded-md border border-theme-border-subtle"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
      )}
      <div>
        {label && <span className="text-xs text-theme-text-muted block">{label}</span>}
        <code className="text-sm font-mono text-theme-text-primary">{value || 'Loading...'}</code>
      </div>
      <CopyButton text={value} label={`Copy value: ${value}`} />
    </div>
  );
}

// ============================================================================
// Contrast Ratio Calculator Component
// ============================================================================

interface ContrastCheckerProps {
  /** Foreground color */
  foreground: string;
  /** Background color */
  background: string;
  /** Sample text to display */
  sampleText?: string;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(foreground: string, background: string): number {
  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ContrastChecker({
  foreground,
  background,
  sampleText = 'Sample Text',
}: ContrastCheckerProps) {
  const ratio = getContrastRatio(foreground, background);
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'decorative';

  return (
    <div className="p-4 rounded-lg border border-theme-border-subtle">
      <div
        className="p-4 rounded-md mb-3 text-center"
        style={{ backgroundColor: background, color: foreground }}
      >
        <span className="text-lg font-medium">{sampleText}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-theme-text-secondary">Contrast:</span>
          <code className="text-sm font-mono font-semibold text-theme-text-primary">
            {ratio.toFixed(2)}:1
          </code>
        </div>
        <WcagBadge level={level} />
      </div>

      <div className="flex gap-4 mt-2 text-xs text-theme-text-muted">
        <span>FG: {foreground}</span>
        <span>BG: {background}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  TokenItem,
  TokenGroup,
  LiveTokenPreview,
  ContrastChecker,
  CopyButton,
  WcagBadge,
};
