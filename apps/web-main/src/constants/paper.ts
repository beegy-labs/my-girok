/**
 * Paper Size Constants for Resume PDF Generation
 *
 * All dimensions are calculated at 96 DPI (standard screen resolution)
 * Formula: pixels = mm * 96 / 25.4
 *
 * These constants ensure consistent rendering across all devices:
 * - Mobile, Tablet, Desktop all use the same pixel dimensions
 * - PDF generation always captures at original size (no scaling)
 */

export const PAPER_SIZES = {
  A4: {
    name: 'A4',
    width: { mm: 210, px: 794 },
    height: { mm: 297, px: 1123 },
    css: { width: '210mm', height: '297mm' },
  },
  LETTER: {
    name: 'Letter',
    width: { mm: 215.9, px: 816 },
    height: { mm: 279.4, px: 1056 },
    css: { width: '215.9mm', height: '279.4mm' },
  },
} as const;

export type PaperSizeKey = keyof typeof PAPER_SIZES;

/**
 * Get paper dimensions by size key
 */
export function getPaperDimensions(size: PaperSizeKey) {
  return PAPER_SIZES[size];
}

/**
 * Get paper width in pixels
 */
export function getPaperWidthPx(size: PaperSizeKey): number {
  return PAPER_SIZES[size].width.px;
}

/**
 * Get paper height in pixels
 */
export function getPaperHeightPx(size: PaperSizeKey): number {
  return PAPER_SIZES[size].height.px;
}

/**
 * Calculate scale factor to fit paper within available width
 * @param size - Paper size key
 * @param availableWidth - Available width in pixels
 * @param maxScale - Maximum scale (default 1.0, never scale up)
 * @returns Scale factor between 0 and maxScale
 */
export function calculateFitScale(
  size: PaperSizeKey,
  availableWidth: number,
  maxScale: number = 1
): number {
  const paperWidth = PAPER_SIZES[size].width.px;
  const scale = availableWidth / paperWidth;
  return Math.min(maxScale, Math.max(0.1, scale)); // Clamp between 0.1 and maxScale
}

