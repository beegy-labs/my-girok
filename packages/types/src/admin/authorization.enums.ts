/**
 * Authorization Model Export Formats
 *
 * Defines the supported export formats for authorization models.
 */
export enum ExportFormat {
  /** JSON format with full metadata (version, notes, export timestamp) */
  JSON = 'json',
  /** DSL format with code only (no metadata) */
  DSL = 'dsl',
}

/**
 * Export Format Labels for UI display
 */
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  [ExportFormat.JSON]: 'JSON (with metadata)',
  [ExportFormat.DSL]: 'DSL (code only)',
};

/**
 * Export Format Descriptions for UI display
 */
export const EXPORT_FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  [ExportFormat.JSON]: 'With metadata and version info',
  [ExportFormat.DSL]: 'Code only',
};

/**
 * File extensions for export formats
 */
export const EXPORT_FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  [ExportFormat.JSON]: '.json',
  [ExportFormat.DSL]: '.dsl',
};

/**
 * MIME types for export formats
 */
export const EXPORT_FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  [ExportFormat.JSON]: 'application/json',
  [ExportFormat.DSL]: 'text/plain',
};
