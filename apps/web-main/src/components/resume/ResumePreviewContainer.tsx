import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Resume } from '../../api/resume';
import { PaperSizeKey, calculateFitScale } from '../../constants/paper';
import ResumePreview from './ResumePreview';

interface ResumePreviewContainerProps {
  /** Resume data to display */
  resume: Resume;
  /** Paper size for the preview (defaults to resume.paperSize or 'A4') */
  paperSize?: PaperSizeKey;
  /** Optional scale factor for the preview (e.g., 0.75 for 75% size). If not provided, auto-scales based on container width */
  scale?: number;
  /** Maximum height for the container (e.g., 'calc(100vh-200px)') */
  maxHeight?: string;
  /** Additional CSS classes for the outer container */
  containerClassName?: string;
  /** Additional CSS classes for the inner container */
  innerClassName?: string;
  /** Whether to show responsive padding (smaller on mobile) */
  responsivePadding?: boolean;
  /** Optional custom content to render above the preview */
  headerContent?: ReactNode;
  /** Whether to show the toolbar in ResumePreview */
  showToolbar?: boolean;
}

/**
 * Resume Preview Container
 *
 * Responsive Design Policy (Updated 2025-12):
 * - Automatically scales PDF to fit container width (never scales up beyond 100%)
 * - Mobile: Full responsive scaling for optimal fit (pinch-to-zoom for details)
 * - Desktop: Natural scaling up to 100%
 * - PDF quality maintained at 2x devicePixelRatio for crisp rendering
 *
 * This approach prioritizes:
 * 1. No horizontal overflow/clipping on any device
 * 2. Consistent PDF export quality
 * 3. Natural mobile UX (no horizontal scroll needed)
 */
export default function ResumePreviewContainer({
  resume,
  paperSize: externalPaperSize,
  scale: propScale,
  maxHeight,
  containerClassName = '',
  innerClassName = '',
  responsivePadding = false,
  headerContent,
  showToolbar = true,
}: ResumePreviewContainerProps) {
  const [currentPaperSize, setCurrentPaperSize] = useState<PaperSizeKey>(
    (externalPaperSize || resume.paperSize || 'A4') as PaperSizeKey
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update current paper size when external prop changes
  useEffect(() => {
    if (externalPaperSize) {
      setCurrentPaperSize(externalPaperSize);
    }
  }, [externalPaperSize]);

  // Handle paper size change from child component
  const handlePaperSizeChange = useCallback((size: PaperSizeKey) => {
    setCurrentPaperSize(size);
  }, []);

  // Calculate display scale based on container width (with debouncing)
  const calculateDisplayScale = useCallback(() => {
    if (!containerRef.current || propScale !== undefined) return;

    const container = containerRef.current;
    const computedStyle = window.getComputedStyle(container);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingRight = parseFloat(computedStyle.paddingRight);

    const containerWidth = container.offsetWidth;
    const availableWidth = containerWidth - paddingLeft - paddingRight;

    // Calculate scale to fit container, max 1.0 (never scale up)
    // No minimum scale - allows full responsive fit on all screen sizes
    const newScale = calculateFitScale(currentPaperSize, availableWidth, 1);

    // Round to 2 decimal places
    const roundedScale = Math.round(newScale * 100) / 100;

    setDisplayScale(prevScale => {
      const roundedPrevScale = Math.round(prevScale * 100) / 100;
      return roundedPrevScale !== roundedScale ? roundedScale : prevScale;
    });
  }, [currentPaperSize, propScale]);

  // Calculate scale on mount and window resize (debounced)
  useEffect(() => {
    if (propScale !== undefined) return;

    // Initial calculation
    calculateDisplayScale();

    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(calculateDisplayScale, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [calculateDisplayScale, propScale]);

  // Use prop scale if provided, otherwise use calculated display scale
  const effectiveScale = propScale !== undefined ? propScale : displayScale;

  // Build container classes
  const outerClasses = [
    'bg-vintage-bg-secondary dark:bg-dark-bg-secondary/50',
    responsivePadding ? 'p-1 sm:p-2 md:p-4' : 'p-2 sm:p-4',
    'rounded-lg shadow-vintage-inner dark:shadow-dark-inner',
    'transition-colors duration-200',
    'w-full',
    containerClassName,
  ].filter(Boolean).join(' ');

  const innerClasses = [
    innerClassName,
  ].filter(Boolean).join(' ');

  // Container style
  const containerStyle: React.CSSProperties = {};

  if (maxHeight) {
    containerStyle.maxHeight = maxHeight;
    containerStyle.overflowY = 'auto';
  }

  // Inner wrapper style - centers content
  const innerWrapperStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  };

  return (
    <div ref={containerRef} className={outerClasses} style={containerStyle}>
      {headerContent}

      {/* PDF Preview */}
      <div className={innerClasses} style={innerWrapperStyle}>
        <ResumePreview
          resume={resume}
          paperSize={currentPaperSize}
          scale={effectiveScale}
          showToolbar={showToolbar}
          onPaperSizeChange={handlePaperSizeChange}
        />
      </div>
    </div>
  );
}
