// apps/web-admin/src/config/chart.config.ts

/**
 * Chart colors using CSS custom properties
 * These reference theme tokens, NOT hardcoded HEX values
 */
export const CHART_COLORS = {
  primary: 'var(--color-primary)',
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
  border: 'var(--color-border)',
  bgCard: 'var(--color-bg-card)',
} as const;

/**
 * Region colors for pie charts
 * Using theme level tokens for consistent hierarchy
 */
export const REGION_CHART_COLORS: Record<string, string> = {
  KR: 'var(--color-level-1)',
  JP: 'var(--color-level-2)',
  US: 'var(--color-level-3)',
  GB: 'var(--color-level-4)',
  IN: 'var(--color-level-5)',
  EU: 'var(--color-level-6)',
  DEFAULT: 'var(--color-text-tertiary)',
};

/**
 * Line chart color palette
 */
export const LINE_COLORS = {
  agreed: 'var(--color-status-success)',
  withdrawn: 'var(--color-status-error)',
  net: 'var(--color-primary)',
} as const;

/**
 * Common chart tooltip style using theme tokens
 */
export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
} as const;
